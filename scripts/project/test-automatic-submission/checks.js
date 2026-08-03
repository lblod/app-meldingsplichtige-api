import {
  ORG_UNIT,
  ORGAN_ABSTRACT,
  ORGAN_IN_TIJD,
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
import { pollQuery, organDiagnosticQuery } from "./queries.js";

export async function runChecks(runId, input, pageUrl, pollInterval, pollTimeout) {
  const r1 = await checkMeldingAccepted(runId, input, pageUrl);
  logCheck(1, "melding accepted", r1);
  if (!r1.ok) return;
  const { submissionUri } = r1;

  const { pollFinal, pollTimedOut } = await pollJob(
    submissionUri, pageUrl, pollInterval, pollTimeout
  );

  const r2 = checkPublicationDownloaded(pollFinal, pollTimedOut, pageUrl);
  logCheck(2, "publication downloaded", r2);

  const r3 = checkAllTasksSucceeded(pollFinal, pollTimedOut);
  logCheck(3, "all tasks succeeded", r3);

  const r4 = checkJobSucceeded(pollFinal, pollTimedOut);
  logCheck(4, "job succeeded", r4);

  if (input.statusChoice === "1") {
    logCheck(5, "submission sent", { ok: false, detail: "skipped - run used Concept status", ms: 0 });
    return;
  }

  const r5 = await checkSubmissionSent(pollFinal, pollTimedOut);
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

async function runOrganDiagnostic() {
  const r = await sparql(organDiagnosticQuery());
  if (r && r.error) throw new Error(r.error);
  if (!Array.isArray(r)) return null;
  return r;
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

function checkAllTasksSucceeded(pollFinal, pollTimedOut) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const raw = pollFinal.tasks ? pollFinal.tasks.value : "";
    const map = {};
    if (raw) {
      for (const part of raw.split(",")) {
        const [idx, st] = part.split("=");
        map[idx] = st;
      }
    }
    const opNames = ["register", "download", "import", "enrich", "validate", "form-data-generate"];
    const missing = [];
    const failed = [];
    for (let i = 0; i < 6; i++) {
      const st = map[String(i)];
      if (!st) missing.push(i);
      else if (st !== JOB_SUCCESS) failed.push(i + " (" + opNames[i] + ": " + st + ")");
    }
    if (missing.length || failed.length) {
      let detail = Object.keys(map).length + "/6 present";
      if (missing.length) detail += " - missing: " + missing.join(", ");
      if (failed.length) detail += " - failed: " + failed.join(", ");
      throw new Error(detail);
    }
    return { ok: true, detail: "6/6 success", ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

function checkJobSucceeded(pollFinal, pollTimedOut) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const js = pollFinal.jobStatus ? pollFinal.jobStatus.value : null;
    if (js === JOB_SUCCESS) return { ok: true, detail: "success", ms: Date.now() - t0 };
    throw new Error("job status is " + (js || "<none>") + " (expected success)");
  } catch (e) {
    return { ok: false, detail: e && e.message ? e.message : String(e), ms: Date.now() - t0 };
  }
}

async function checkSubmissionSent(pollFinal, pollTimedOut) {
  const t0 = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const ss = pollFinal.submissionStatus ? pollFinal.submissionStatus.value : null;
    const sentDate = pollFinal.sentDate ? pollFinal.sentDate.value : null;
    const formData = pollFinal.formData ? pollFinal.formData.value : null;
    if (ss !== STATUS_VERSTUURD) {
      let diag = "submission stayed " + (ss || "<none>") + " (expected Verstuurd)";
      let organs = null;
      let diagErr = null;
      try {
        organs = await runOrganDiagnostic();
      } catch (e) {
        diagErr = e && e.message ? e.message : String(e);
      }
      if (diagErr) {
        diag += " - organ diagnostic query failed: " + diagErr;
      } else if (organs === null) {
        diag += " - organ diagnostic returned no rows";
      } else {
        const used = ORGAN_IN_TIJD;
        const found = organs.some((r) => r.organ && r.organ.value === used);
        if (!found) {
          diag +=
            " - eli:passed_by points at " + used + ", an organ the enricher " +
            "never puts in the meta concept scheme; validation cannot pass. " +
            "Actual tijdspecialisaties of " + ORGAN_ABSTRACT + ": " +
            (organs.length
              ? organs
                  .map((r) =>
                    r.organ ? r.organ.value + " (start " + (r.start ? r.start.value : "?") + ")" : "?"
                  )
                  .join("; ")
              : "(none)");
        } else {
          diag += " - organ " + used + " is in the concept scheme; check the RDFa template.";
        }
      }
      throw new Error(diag);
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
