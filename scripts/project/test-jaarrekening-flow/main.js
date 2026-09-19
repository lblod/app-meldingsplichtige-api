import { randomUUID } from "node:crypto";
import { VENDOR_A_URI, VENDOR_B_URI, DOC_URI_BASE } from "./config.js";
import { resolveVendor } from "./orgs.js";
import { pickOwnIp, startPageServer, buildPageUrls } from "./server.js";
import { step1Jaarrekening } from "./steps/step1-jaarrekening.js";
import { step2Bundel } from "./steps/step2-bundel.js";
import { step3Advies } from "./steps/step3-advies.js";
import { step4Approval } from "./steps/step4-approval.js";
import { step5Download } from "./steps/step5-download.js";
import { say } from "./log.js";

// Piece de resistance: the full automatic submission flow for the Grobbendonk
// test space, driven entirely over HTTP:
//   step 1: vendor A submits the jaarrekening for Kerkfabriek St.-Lambertus
//   step 2: vendor A (CKB Grobbendonk role) publishes the bundle referring to it
//   step 3: vendor B (gemeente Grobbendonk) publishes the gunstig advies
//   step 4: vendor A checks the approval on databankerediensten
//   step 5: vendor A downloads the source document via the mapped URL
// Each step lives in its own file under ./steps; this file only wires them.

const runId = randomUUID();
let server = null;

// Ctrl+C must stop the script immediately, even while it is inside a poll/sleep loop.
process.on("SIGINT", function () {
  console.log("\ninterrupted, stopping...");
  try { server?.close(); } catch { /* server may be gone already */ }
  process.exit(130);
});
process.on("SIGTERM", function () {
  try { server?.close(); } catch { /* server may be gone already */ }
  process.exit(143);
});

// Just hard code the two vendors that are needed for this flow. Arguments
// [keyA keyB] override the stored keys (USE_HASHED_KEY must be off here).
const ctx = {
  runId: runId,
  pages: new Map(),
  vendors: {
    a: await resolveVendor(VENDOR_A_URI, process.argv[2]),
    b: await resolveVendor(VENDOR_B_URI, process.argv[3]),
  },
};

try {
  say("vendor A (kerkfabriek + CKB): " + ctx.vendors.a.uri);
  say("vendor B (gemeente):          " + ctx.vendors.b.uri);
  ctx.pageUrls = buildPageUrls(runId, await pickOwnIp());
  server = await startPageServer(ctx.pages);

  const jar = await step1Jaarrekening(ctx);
  const bundel = await step2Bundel(ctx, jar.document);
  const advies = await step3Advies(ctx, jar.document);
  const { cookie } = await step4Approval(ctx, jar.document);
  const { downloadLink } = await step5Download(ctx, jar, cookie);

  console.log("");
  console.log("=== OVERVIEW ===");
  console.log("run:                " + runId);
  console.log("jaarrekening:       " + DOC_URI_BASE + runId + "-jaarrekening");
  console.log("submission step 1:  " + jar.submission.submissionUri);
  console.log("SubmissionDocument: " + jar.document);
  console.log("submission step 2:  " + bundel.submission.submissionUri);
  console.log("submission step 3:  " + advies.submission.submissionUri);
  console.log("download link:      " + downloadLink);
  console.log("result: ALL STEPS PASSED");
} catch (error) {
  console.error("FATAL: " + (error && error.stack ? error.stack : error));
  console.error("result: FAILED");
} finally {
  if (server) try { server.close(); } catch (closeError) {}
}

console.log("");
console.log("Jaarrekening collaborative flow test run " + runId + " - please check the logs above.");
