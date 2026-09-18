import {
  MELDING_ENDPOINT,
  VENDOR_SPARQL_ENDPOINT,
  JOB_SUCCESS,
  JOB_FAILED,
  DL_SUCCESS,
  STATUS_VERSTUURD,
  POLL_INTERVAL,
  POLL_TIMEOUT,
  LABELS,
} from "./config.js";
import { sparql, postJson } from "./sparql.js";
import { pollQuery, submissionStatusQuery, jobTasksQuery } from "./queries.js";

// Shared melding + polling for all four writers. Each writer publishes a page,
// POSTs /melding with inzendbaar status, and waits until the internal job
// succeeded AND the Submission reached "verstuurd" (partner graphs refreshed).
//
// The job-controller (v1.0.0) only schedules the next task when a delta with
// the previous task's adms:status success reaches it. The delta-notifier
// sometimes drops that delta (HTTP 413, NOT RETRYING), which leaves a task
// stuck at success and the chain halts. We detect that stall and kick the
// job-controller by replaying the missed success delta ourselves.

export async function submitMelding(description, organization, pageUrl, submittedResource, vendorUri, vendorKey) {
  const body = {
    href: pageUrl,
    organization: organization,
    submittedResource: submittedResource,
    status: "http://lblod.data.gift/concepts/f6330856-e261-430f-b949-8e510d20d0ff",
    publisher: { uri: vendorUri, key: vendorKey },
  };
  const result = await postJson(MELDING_ENDPOINT, body);
  if (result.status !== 201) {
    throw new Error(
      description + ": melding expected 201, got " + result.status +
        " - body: " + JSON.stringify(result.body)
    );
  }
  const submissionUri = result.body && (result.body.submission || result.body.uri);
  const jobUri = result.body && result.body.job;
  console.log(description + ": melding accepted, submission " + submissionUri + ", job " + jobUri);
  return { submissionUri, jobUri };
}

export async function waitVerstuurd(description, submissionUri, pageUrl) {
  console.log(description + ": polling until the job succeeded and the submission is verstuurd...");
  const pollStart = Date.now();
  let jobDone = null;
  let nudged = new Set();
  while (true) {
    if (Date.now() - pollStart > POLL_TIMEOUT) {
      throw new Error(description + ": timed out waiting for job/submission status");
    }
    const rows = await sparql(pollQuery(submissionUri, pageUrl));
    if (!rows || rows.error || !Array.isArray(rows) || rows.length === 0) {
      await sleep(POLL_INTERVAL);
      continue;
    }
    const row = rows[0];
    const jobStatus = row.jobStatus ? row.jobStatus.value : null;
    if (!jobDone && (jobStatus === JOB_SUCCESS || jobStatus === JOB_FAILED)) {
      jobDone = jobStatus;
      console.log(description + ": job status " + label(jobStatus));
    }
    if (jobStatus === JOB_FAILED) {
      throw new Error(description + ": automatic submission job failed");
    }
    const statusRows = await sparql(submissionStatusQuery(submissionUri));
    if (Array.isArray(statusRows) && statusRows.length > 0) {
      const status = statusRows[0].status ? statusRows[0].status.value : null;
      if (status === STATUS_VERSTUURD) {
        console.log(description + ": submission verstuurd");
        return statusRows[0];
      }
    }
    // job not done yet: check for a stalled chain (a task at success whose
    // successor was never created) and kick the job-controller if so
    if (!jobDone) {
      const stalled = await findStalledSuccess(description, submissionUri, jobStatus, nudged);
      if (stalled) {
        await replaySuccessDelta(description, stalled);
        nudged.add(stalled.task.value);
      }
    }
    await sleep(POLL_INTERVAL);
  }
}

async function findStalledSuccess(description, submissionUri, jobStatus, nudged) {
  // only kick when the job is still open (busy/...) but some poll rows say
  // the download already succeeded; the tasks query finds the latest task at
  // success whose successor does not exist
  const rows = await sparql(jobTasksQuery(submissionUri));
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const byOp = new Map();
  for (const row of rows) {
    byOp.set(row.op.value, row.status.value);
  }
  const chain = [
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/register",
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/download",
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/import",
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/enrich",
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/validate",
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/form-data-generate",
  ];
  for (let i = 0; i < chain.length - 1; i += 1) {
    const current = chain[i];
    const next = chain[i + 1];
    if (byOp.get(current) === JOB_SUCCESS && !byOp.has(next)) {
      // find the task uri for the stalled operation
      const stalledRow = rows.find((row) => row.op.value === current && row.status.value === JOB_SUCCESS);
      if (stalledRow && !nudged.has(stalledRow.task.value)) {
        return stalledRow;
      }
    }
  }
  return null;
}

async function replaySuccessDelta(description, stalledRow) {
  // v1.0.0 job-controller schedules the next task when it receives a delta
  // containing adms:status success for a task. Replay that single insert.
  const delta = [
    {
      inserts: [
        {
          subject: { type: "uri", value: stalledRow.task.value },
          predicate: { type: "uri", value: "http://www.w3.org/ns/adms#status" },
          object: { type: "uri", value: JOB_SUCCESS },
        },
      ],
      deletes: [],
    },
  ];
  console.log(description + ": job chain stalled after " + stalledRow.op.value.split("/").pop() +
    ", replaying its success delta to the job-controller");
  const result = await postJson("http://job-controller/delta", delta);
  console.log(description + ": job-controller nudge returned " + result.status);
}

function label(uri) {
  return LABELS[uri] || uri;
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}