import {
  MELDING_ENDPOINT,
  JOB_SUCCESS,
  JOB_FAILED,
  STATUS_CONCEPT,
  STATUS_INZENDBAAR,
  STATUS_VERSTUURD,
  DL_SUCCESS,
  DL_FAILURE,
  DOC_URI_BASE,
  LABELS,
  TASK_OPS,
  TOTAL_CHECKS,
} from "./config.js";
import { sparql, postJson } from "./sparql.js";
import { pollQuery, tasksQuery, jobStatusQuery, submissionStatusQuery } from "./queries.js";

export async function runChecks(runId, input, pageUrl, pollInterval, pollTimeout) {
  const meldingResult = await checkMeldingAccepted(runId, input, pageUrl);
  logCheck(1, "melding accepted", meldingResult);
  if (!meldingResult.ok) return { submissionUri: null, jobUri: null };
  const { submissionUri, jobUri } = meldingResult;

  const { pollFinal, pollTimedOut } = await pollJob(
    submissionUri, pageUrl, pollInterval, pollTimeout
  );

  const downloadResult = checkPublicationDownloaded(pollFinal, pollTimedOut, pageUrl);
  logCheck(2, "publication downloaded", downloadResult);

  const tasksResult = await checkAllTasksSucceeded(jobUri, pollTimedOut);
  logCheck(3, "all tasks succeeded", tasksResult);

  const jobResult = await checkJobSucceeded(jobUri, pollTimedOut);
  logCheck(4, "job succeeded", jobResult);

  if (input.statusChoice === "1") {
    logCheck(5, "submission sent", { ok: false, detail: "skipped - run used Concept status", ms: 0 });
    return { submissionUri, jobUri };
  }

  const submissionResult = await checkSubmissionSent(submissionUri, pollTimedOut);
  logCheck(5, "submission sent", submissionResult);
  return { submissionUri, jobUri };
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
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

export function logCheck(id, label, result) {
  const tag = result.ok ? "ok  " : "FAIL";
  const elapsed = result.ms ? " " + result.ms + "ms" : "";
  console.log("[" + id + "/" + TOTAL_CHECKS + "] " + tag + "  " + label + " - " + (result.detail || "") + elapsed);
}

async function checkMeldingAccepted(runId, input, pageUrl) {
  const startTime = Date.now();
  try {
    const body = {
      organization: input.orgUnit,
      href: pageUrl,
      submittedResource: DOC_URI_BASE + runId,
      status: input.statusChoice === "1" ? STATUS_CONCEPT : STATUS_INZENDBAAR,
      publisher: { uri: input.vendorUri, key: input.vendorKey },
    };
    const response = await postJson(MELDING_ENDPOINT, body);
    if (response.status !== 201) {
      let detail = "expected 201, got " + response.status;
      if (response.status === 401) {
        detail +=
          " - vendor not authorised: no match for this URI + key + organization in " +
          "GRAPH <http://mu.semte.ch/graphs/automatic-submission>";
      }
      if (response.status === 400 && response.body && typeof response.body === "object") {
        const bodyString = JSON.stringify(response.body);
        if (bodyString.indexOf("publisher") !== -1) {
          detail +=
            " - 400 mentions 'publisher': check that publisher is an object " +
            "{uri,key}, not a bare string";
        }
      }
      if (response.body) detail += " - body: " + JSON.stringify(response.body);
      throw new Error(detail);
    }
    const responseBody = response.body || {};
    const submissionUri = responseBody.submission || responseBody.uri;
    const jobUri = responseBody.job;
    if (!submissionUri || !jobUri) {
      throw new Error("201 but missing uri/submission/job: " + JSON.stringify(responseBody));
    }
    return {
      ok: true,
      detail: response.status + " - submission " + submissionUri + ", job " + jobUri,
      ms: Date.now() - startTime,
      submissionUri,
      jobUri,
    };
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}

function checkPublicationDownloaded(pollFinal, pollTimedOut, pageUrl) {
  const startTime = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const downloadStatus = pollFinal.dlStatus ? pollFinal.dlStatus.value : null;
    if (downloadStatus === DL_SUCCESS) return { ok: true, detail: "success", ms: Date.now() - startTime };
    if (downloadStatus === DL_FAILURE) {
      throw new Error(
        "download-url-service could not fetch " + pageUrl +
          " - the script's page server was unreachable"
      );
    }
    throw new Error(
      "download status is " + (downloadStatus || "<none>") +
        " (expected success); job may not have reached the download step"
    );
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}

async function checkAllTasksSucceeded(jobUri, pollTimedOut) {
  const startTime = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const rows = await sparql(tasksQuery(jobUri));
    if (rows && rows.error) throw new Error(rows.error);
    if (!Array.isArray(rows)) throw new Error("task query returned no rows");
    const statusByOperation = new Map(rows.map((row) => [row.operation.value, row.status.value]));
    const missing = [];
    const failed = [];
    for (const operationUri of TASK_OPS) {
      const statusUri = statusByOperation.get(operationUri);
      if (!statusUri) missing.push(LABELS[operationUri] || operationUri);
      else if (statusUri !== JOB_SUCCESS) {
        failed.push((LABELS[operationUri] || operationUri) + ": " + (LABELS[statusUri] || statusUri));
      }
    }
    if (missing.length || failed.length) {
      const parts = [rows.length + "/6 present"];
      if (missing.length) parts.push("missing: " + missing.join(", "));
      if (failed.length) parts.push("failed: " + failed.join(", "));
      throw new Error(parts.join(" - "));
    }
    return { ok: true, detail: "6/6 success", ms: Date.now() - startTime };
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}

async function checkJobSucceeded(jobUri, pollTimedOut) {
  const startTime = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const rows = await sparql(jobStatusQuery(jobUri));
    if (rows && rows.error) throw new Error(rows.error);
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("job not found");
    const jobStatusUri = rows[0].status.value;
    if (jobStatusUri === JOB_SUCCESS) return { ok: true, detail: "success", ms: Date.now() - startTime };
    throw new Error("job status is " + (LABELS[jobStatusUri] || jobStatusUri) + " (expected success)");
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}

async function checkSubmissionSent(submissionUri, pollTimedOut) {
  const startTime = Date.now();
  try {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const rows = await sparql(submissionStatusQuery(submissionUri));
    if (rows && rows.error) throw new Error(rows.error);
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("submission not found");
    const row = rows[0];
    const submissionStatusUri = row.status.value;
    const sentDate = row.sentDate ? row.sentDate.value : null;
    const formData = row.formData ? row.formData.value : null;
    if (submissionStatusUri !== STATUS_VERSTUURD) {
      throw new Error("submission stayed " + (LABELS[submissionStatusUri] || submissionStatusUri) + " (expected Verstuurd)");
    }
    if (!sentDate) throw new Error("Verstuurd but nmo:sentDate is missing");
    if (!formData) throw new Error("Verstuurd but no melding:FormData");
    return {
      ok: true,
      detail: "verstuurd, sentDate " + sentDate + ", formData " + formData,
      ms: Date.now() - startTime,
    };
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}