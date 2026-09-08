import { STATUS_CONCEPT, STATUS_VERSTUURD, LABELS } from "./config.js";
import { vendorLogin, vendorSparql, vendorLogout } from "./vendor.js";
import { vendorSubmissionQuery } from "./queries.js";
import { readProcessingInterval } from "./compose-config.js";
import { logCheck } from "./checks.js";

// Phase 2: observe the submitted job the way a real vendor does, through the
// vendor SPARQL API. The internal cogs:Job is not part of the vendor data, so
// the vendor-visible state of the job is the Submission: its status (and its
// Dutch label), the sentDate, the generated FormData and the harvested
// submission document.
export async function runVendorChecks(input, submissionUri, pollInterval, pollTimeout) {
  const loginResult = await checkVendorLogin(input);
  logCheck(6, "vendor login", loginResult);
  if (!loginResult.ok) return;
  const cookie = loginResult.cookie;

  const statusResult = await checkVendorSeesFinalStatus(cookie, input, submissionUri, pollInterval, pollTimeout);
  logCheck(7, "vendor sees final status", statusResult);

  const logoutResult = await checkVendorLogout(cookie);
  logCheck(8, "vendor logout", logoutResult);
}

async function checkVendorLogin(input) {
  const startTime = Date.now();
  try {
    const login = await vendorLogin(input);
    const sanity = await vendorSparql(login.cookie, "SELECT * WHERE { ?s ?p ?o } LIMIT 1");
    if (sanity && sanity.error) throw new Error("login ok but session unusable - " + sanity.error);
    return {
      ok: true,
      detail: "session " + (login.sessionUri || "<unknown>") + " works on /vendor/sparql",
      ms: Date.now() - startTime,
      cookie: login.cookie,
    };
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}

async function checkVendorSeesFinalStatus(cookie, input, submissionUri, pollInterval, pollTimeout) {
  const startTime = Date.now();
  try {
    const expectedStatus = input.statusChoice === "1" ? STATUS_CONCEPT : STATUS_VERSTUURD;
    const expectedLabel = LABELS[expectedStatus];
    const { intervalMs, source } = readProcessingInterval();
    const effectiveTimeout = Math.max(pollTimeout, intervalMs + 90000);
    console.log(
      "  waiting on vendor-data-distribution batch (every " + (intervalMs / 1000) + "s - " +
        source + "); allowing " + (effectiveTimeout / 1000) + "s for the poll"
    );
    const pollStart = Date.now();
    let lastDetail = "submission not visible to this vendor yet";
    let lastPrinted = "";
    const reportOnce = (message) => {
      if (message !== lastPrinted) {
        console.log("  vendor api poll: " + message);
        lastPrinted = message;
      }
    };
    while (true) {
      const rows = await vendorSparql(cookie, vendorSubmissionQuery(submissionUri));
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const statusUri = row.status.value;
        const label = (row.statusLabel && row.statusLabel.value) || LABELS[statusUri] || statusUri;
        let sentDate = null;
        let formData = null;
        let submissionDocument = null;
        for (const candidate of rows) {
          if (!sentDate && candidate.sentDate) sentDate = candidate.sentDate.value;
          if (!formData && candidate.formData) formData = candidate.formData.value;
          if (!submissionDocument && candidate.submissionDocument) submissionDocument = candidate.submissionDocument.value;
        }
        const printable =
          label +
          (sentDate ? ", sentDate " + sentDate : ", no sentDate yet") +
          (formData ? ", formData present" : ", no formData yet") +
          (submissionDocument ? ", document " + submissionDocument : "");
        reportOnce(printable);
        lastDetail = printable;
        const complete =
          statusUri === expectedStatus &&
          !!formData &&
          (expectedStatus === STATUS_CONCEPT || !!sentDate);
        if (complete) {
          return { ok: true, detail: printable, ms: Date.now() - startTime };
        }
      } else if (rows && rows.error) {
        reportOnce("query error: " + rows.error);
        lastDetail = "query error: " + rows.error;
      } else {
        reportOnce("submission not visible to this vendor yet");
        lastDetail = "submission not visible to this vendor yet";
      }
      if (Date.now() - pollStart > effectiveTimeout) {
        return {
          ok: false,
          detail: "timed out waiting for " + expectedLabel + " - last observed: " + lastDetail,
          ms: Date.now() - startTime,
        };
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}

async function checkVendorLogout(cookie) {
  const startTime = Date.now();
  try {
    const status = await vendorLogout(cookie);
    if (status !== 204) throw new Error("expected 204, got " + status);
    return { ok: true, detail: "204", ms: Date.now() - startTime };
  } catch (error) {
    return { ok: false, detail: error && error.message ? error.message : String(error), ms: Date.now() - startTime };
  }
}
