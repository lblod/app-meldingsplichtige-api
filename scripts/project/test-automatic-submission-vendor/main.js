import { randomUUID } from "node:crypto";
import { POLL_INTERVAL, POLL_TIMEOUT, VENDOR_POLL_TIMEOUT, ORG_UNIT, ORGAN_IN_TIJD, ORGAN_ABSTRACT, ORGAN_LABEL, BESLUITENLIJST_TYPE } from "./config.js";
import { collectInput } from "./input.js";
import { renderTemplate } from "./template.js";
import { startPageServer } from "./server.js";
import { runChecks } from "./checks.js";
import { runVendorChecks } from "./vendor-checks.js";

const runId = randomUUID();

let server = null;
try {
  const argv = process.argv.slice(2);
  const input = await collectInput(argv);

  const { html, docUri } = renderTemplate(runId);
  console.log("doc URI: " + docUri);

  const started = await startPageServer(html, docUri, runId);
  server = started.server;
  console.log("page server listening at " + started.pageUrl);

  const { submissionUri, jobUri } = await runChecks(runId, input, started.pageUrl, POLL_INTERVAL, POLL_TIMEOUT);

  console.log("");
  printOverview(input, docUri, started.pageUrl, submissionUri, jobUri);
  console.log("");
  if (!submissionUri) {
    console.log("No submission was accepted - skipping the vendor SPARQL API checks.");
  } else {
    console.log("Polling and checking the submitted job through the vendor SPARQL API...");
    await runVendorChecks(input, submissionUri, POLL_INTERVAL, VENDOR_POLL_TIMEOUT);
  }
} catch (error) {
  console.error("FATAL: " + (error && error.stack ? error.stack : error));
} finally {
  if (server) try { server.close(); } catch (closeError) {}
}

console.log("Automatic submission vendor test run " + runId + " - please check logs to see how it went.");

function printOverview(input, docUri, pageUrl, submissionUri, jobUri) {
  console.log("=== URI overview ===");
  console.log("vendor:            " + input.vendorUri);
  console.log("bestuurseenheid:    " + ORG_UNIT);
  console.log("organ (in tijd):    " + ORGAN_IN_TIJD + " (" + ORGAN_LABEL + ")");
  console.log("organ (abstract):  " + ORGAN_ABSTRACT);
  console.log("document type:      " + BESLUITENLIJST_TYPE);
  console.log("submitted resource: " + docUri);
  console.log("download page:     " + pageUrl);
  console.log("submission:         " + (submissionUri || "<not created>"));
  console.log("job:                " + (jobUri || "<not created>"));
}
