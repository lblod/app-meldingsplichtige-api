import {
  MELDING_ENDPOINT,
  STATUS_INZENDBAAR,
  STATUS_VERSTUURD,
  POLL_INTERVAL,
  POLL_TIMEOUT,
} from "./config.js";
import { vendorSparql } from "./vendor.js";
import { postJson } from "./sparql.js";
import { say, logRetry } from "./log.js";
import { submissionStatusQuery } from "./queries.js";
import { sleep } from "./steps/util.js";

// Shared melding + polling for all writers. Each writer publishes a page,
// POSTs /melding with inzendbaar status, and waits until the Submission
// reaches "verstuurd" (adms:status). Over the vendor SPARQL endpoint only the
// vendor-visible status is available: no job or download status, no task
// chain. So the poll is just the submission status check.

export async function submitMelding(description, organization, pageUrl, submittedResource, vendorUri, vendorKey) {
  const body = {
    href: pageUrl,
    organization: organization,
    submittedResource: submittedResource,
    status: STATUS_INZENDBAAR,
    publisher: { uri: vendorUri, key: vendorKey },
  };
  const result = await postJson("submit-melding", MELDING_ENDPOINT, body);
  if (result.status !== 201) {
    throw new Error(
      description + ": melding expected 201, got " + result.status +
        " - body: " + JSON.stringify(result.body)
    );
  }
  const submissionUri = result.body && (result.body.submission || result.body.uri);
  const jobUri = result.body && result.body.job;
  say(description + ": melding accepted, submission " + submissionUri + ", job " + jobUri);
  return { submissionUri, jobUri };
}

export async function waitVerstuurd(cookie, description, submissionUri) {
  say(description + ": polling until the submission status is verstuurd (sent)...");
  const pollStart = Date.now();
  let attempt = 0;
  while (true) {
    if (Date.now() - pollStart > POLL_TIMEOUT) {
      throw new Error(description + ": timed out waiting for submission status verstuurd");
    }
    const statusRows = await vendorSparql(cookie, "poll-check (submission status on vendor SPARQL)", submissionStatusQuery(submissionUri));
    if (!statusRows || statusRows.error || !Array.isArray(statusRows)) {
      logRetry(attempt++, "submission status check failed: " + (statusRows && statusRows.error), POLL_INTERVAL);
      await sleep(POLL_INTERVAL);
      continue;
    }
    if (statusRows.length > 0) {
      const status = statusRows[0].status ? statusRows[0].status.value : null;
      if (status === STATUS_VERSTUURD) {
        console.log(description + ": submission verstuurd");
        return statusRows[0];
      }
    }
    logRetry(attempt++, "submission not verstuurd yet", POLL_INTERVAL);
    await sleep(POLL_INTERVAL);
  }
}