import {
  ORG_UNIT,
  MELDING_ENDPOINT,
  JOB_SUCCESS,
  JOB_FAILED,
  STATUS_CONCEPT,
  STATUS_INZENDBAAR,
  STATUS_VERSTUURD,
  DL_SUCCESS,
  DL_FAILURE,
  DOC_URI_BASE,
} from "./config.js";
import { sparql, postJson } from "./sparql.js";
import { pollQuery, tasksQuery, jobStatusQuery, submissionStatusQuery } from "./queries.js";

const EXPECTED_OPS = [
  ["register", "http://lblod.data.gift/id/jobs/concept/TaskOperation/register"],
  ["download", "http://lblod.data.gift/id/jobs/concept/TaskOperation/download"],
  ["import", "http://lblod.data.gift/id/jobs/concept/TaskOperation/import"],
  ["enrich", "http://lblod.data.gift/id/jobs/concept/TaskOperation/enrich"],
  ["validate", "http://lblod.data.gift/id/jobs/concept/TaskOperation/validate"],
  ["form-data-generate", "http://lblod.data.gift/id/jobs/concept/TaskOperation/form-data-generate"],
];

export async function runChecks(runId, input, pageUrl, pollInterval, pollTimeout) {
  const r1 = await checkMeldingAccepted(runId, input, pageUrl);
  logCheck(1, "melding accepted", r1);
  if (!r1.ok) return;
  const { submissionUri, jobUri } = r1;

  const { pollFinal, pollTimedOut } = await pollJob(
    submissionUri, pageUrl, pollInterval, pollTimeout
  );

  const r2 = checkPublicationDownloaded(pollFinal, pollTimedOut, pageUrl);
  logCheck(2, "publication downloaded", r2);

  const r3 = await checkAllTasksSucceeded(jobUri, pollTimedOut);
  logCheck(3, "all tasks succeeded", r3);

  const r4 = await checkJobSucceeded(jobUri, pollTimedOut);
  logCheck(4, "job succeeded", r4);

  if (input.statusChoice === "1") {
    logCheck(5, "submission sent", { ok: false, detail: "skipped - run used Concept status", ms: 0 });
    return;
  }

  const r5 = await checkSubmissionSent(submissionUri, pollTimedOut);
  logCheck(5, "submission sent", r5);
}

// --------------------------------------------------------------- HELPERS
async function pollJob(submissionUri, pageUrl, pollInterval, pollTimeout) {
  const pollStart = Date.now();
  while (true) {
    if (Date.now() - pollStart > pollTimeout) {
      return { pollFinal: null, pollTimedOut: true };
    }
    const rows = await sparql(pollQuery(submissionUri, pageUrl));
    if (rows && rows.error) {
      // keep polling
    } else if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      const jobStatus = row.jobStatus ? row.jobStatus.value : null;
      if (jobStatus === JOB_SUCCESS || jobStatus === JOB_FAILED) {
        return { pollFinal: row, pollTimedOut: false };
      }
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
}

function logCheck(id, label, r) {
  const tag = r.ok ? "ok  " : "FAIL";
  const ms = r.ms ? " " + r.ms + "ms" : "";
  console.log("[" + id + "/5] " + tag + "  " + label + " - " + (r.detail || "") + ms);
}

async function checkMeldingAccepted(runId, input, pageUrl) {
  const t0 = Date.now();
  try {
    const body = {
      organization: ORG_UNIT,
      href: pageUrl,
      submittedResource: DOC_URI_BASE + runId,
      status: input.statusChoice === "1" ? STATUS_CONCEPT : STATUS_INZENDBAAR,
      publisher: { uri: input.vendorUri, key: input.vendorKey },
    };
    const res = await postJson(MELDING_ENDPOINT, body);
    if (res.status !== 201) {
      let detail = "expected 201, got " + res.status;
      if (res.status === 401) {
        detail +=
          " - vendor not authorised: no match for this URI + key + organization in " +
          "GRAPH <http://mu.semte.ch/graphs/automatic-submission>";
      }
      if (res.status === 400 && res.body && typeof res.body === "object") {
        const b = JSON.stringify(res.body);
        if (b.indexOf("publisher") !== -1) {
          detail +=
            " - 400 mentions 'publisher': check that publisher is an object " +
            "{uri,key}, not a bare string";
        }
      }
      if (res.body) detail += " - body: " + JSON.stringify(res.body);
      throw new Error(detail);
    }
    const b = res.body || {};
    const submissionUri = b.submission || b.uri;
    const jobUri = b.job;
    if (!submissionUri || !jobUri) {
      throw new Error("201 but missing uri/submission/job: " + JSON.stringify(b));
    }
    return {
      ok: true,
      detail: res.status + " - submission " + submissionUri + ", job " + jobUri,
      ms: Date.now() - t0,
      submissionUri,
      jobUri,
    };
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

function checkPublicationDownloaded(pollFinal, pollTimedOut, pageUrl) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const dl = pollFinal.dlStatus ? pollFinal.dlStatus.value : null;
    if (dl === DL_SUCCESS) return { ok: true, detail: "success", ms: Date.now() - t0 };
    if (dl === DL_FAILURE) {
      throw new Error(
        "download-url-service could not fetch " + pageUrl +
          " - the script's page server was unreachable"
      );
    }
    throw new Error(
      "download status is " + (dl || "<none>") +
        " (expected success); job may not have reached the download step"
    );
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

async function checkAllTasksSucceeded(jobUri, pollTimedOut) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const rows = await sparql(tasksQuery(jobUri));
    if (rows && rows.error) throw new Error(rows.error);
    if (!Array.isArray(rows)) throw new Error("task query returned no rows");
    const statusByOp = {};
    for (const row of rows) {
      statusByOp[row.operation.value] = row.status.value;
    }
    const missing = [];
    const failed = [];
    for (const [name, uri] of EXPECTED_OPS) {
      const st = statusByOp[uri];
      if (!st) missing.push(name);
      else if (st !== JOB_SUCCESS) failed.push(name + ": " + st.split("/").pop());
    }
    if (missing.length || failed.length) {
      let detail = rows.length + "/6 present";
      if (missing.length) detail += " - missing: " + missing.join(", ");
      if (failed.length) detail += " - failed: " + failed.join(", ");
      throw new Error(detail);
    }
    return { ok: true, detail: "6/6 success", ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

async function checkJobSucceeded(jobUri, pollTimedOut) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const rows = await sparql(jobStatusQuery(jobUri));
    if (rows && rows.error) throw new Error(rows.error);
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("job not found");
    const js = rows[0].status.value;
    if (js === JOB_SUCCESS) return { ok: true, detail: "success", ms: Date.now() - t0 };
    throw new Error("job status is " + js.split("/").pop() + " (expected success)");
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

async function checkSubmissionSent(submissionUri, pollTimedOut) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const rows = await sparql(submissionStatusQuery(submissionUri));
    if (rows && rows.error) throw new Error(rows.error);
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("submission not found");
    const row = rows[0];
    const ss = row.status.value;
    const sentDate = row.sentDate ? row.sentDate.value : null;
    const formData = row.formData ? row.formData.value : null;
    if (ss !== STATUS_VERSTUURD) {
      throw new Error("submission stayed " + ss.split("/").pop() + " (expected Verstuurd)");
    }
    if (!sentDate) throw new Error("Verstuurd but nmo:sentDate is missing");
    if (!formData) throw new Error("Verstuurd but no melding:FormData");
    return {
      ok: true,
      detail: "verstuurd, sentDate " + sentDate + ", formData " + formData,
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}
