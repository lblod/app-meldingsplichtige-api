import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { VENDOR_A_URI, VENDOR_B_URI, DOC_URI_BASE } from "./config.js";
import { resolveVendor } from "./orgs.js";
import { pickOwnIp, startPageServer, buildPageUrls } from "./server.js";
import { step1Jaarrekening } from "./steps/step1-jaarrekening.js";
import { step2Bundel } from "./steps/step2-bundel.js";
import { step3Advies } from "./steps/step3-advies.js";
import { step4Approval } from "./steps/step4-approval.js";
import { step5Download } from "./steps/step5-download.js";
import { say, withLogPrefix } from "./log.js";

// The full automatic submission flow for the Grobbendonk
// test space, driven entirely over HTTP:
// The interesting thing here: It spins up it's own webserver, so the the flow can be fired as if
//   the script was a vendor.

//   step 1: vendor A submits the jaarrekening for Kerkfabriek St.-Lambertus
//   step 2: vendor A (CKB Grobbendonk role) publishes the bundle referring to it
//   step 3: vendor B (gemeente Grobbendonk) publishes the gunstig advies
//   step 4: vendor A checks the approval on databankerediensten
//   step 5: vendor A downloads the source document via the mapped URL
// Each step lives in its own file under ./steps; this file only wires them.
//
// Run one flow:      node main.js keyA keyB
// Run a batch:       node main.js keyA keyB --runs 10 --parallel 3
// A batch runs the flow "runs" times with at most "parallel" runs in flight.
// Every run gets its own runId (so its documents in the triple store never
// collide) and its own page server on an ephemeral port (so nothing shares
// state). Results are written as JSON under OUT_DIR.



const OUT_DIR = "./data/files/mu-script-runs/test-jaarrekening-flow";

// Ctrl+C must stop the script immediately, even while it is inside a poll/sleep loop.
process.on("SIGINT", function () {
  console.log("\ninterrupted, stopping...");
  process.exit(130);
});
process.on("SIGTERM", function () {
  process.exit(143);
});

// Parse "[keyA, keyB, --runs, 10, --parallel, 3]" style arguments: the two
// keys first, then optional batch flags.
function parseArgs(argv) {
  const out = { keyA: null, keyB: null, runs: 1, parallel: 1, outDir: OUT_DIR };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--runs" || arg === "--parallel") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) throw new Error(arg + " expects a positive integer");
      if (arg === "--runs") out.runs = value; else out.parallel = value;
    } else if (arg === "--out") {
      out.outDir = argv[++i];
      if (!out.outDir) throw new Error("--out expects a directory");
    } else {
      positional.push(arg);
    }
  }
  out.keyA = positional[0] || null;
  out.keyB = positional[1] || null;
  return out;
}

// One complete flow from start to download. Returns a result object; never
// throws. Local state only: its own runId, its own pages map and its own
// page server on its own port, so runs can go in parallel safely.
async function runFlow(index, keyA, keyB, logPrefix = null) {
  const runId = randomUUID();
  const startedAt = new Date();
  const result = {
    index: index,
    runId: runId,
    startedAt: startedAt.toISOString(),
    status: null,
    durationMs: null,
    submissionUris: [],
    submissionDocument: null,
    downloadLink: null,
    error: null,
  };

  return withLogPrefix(logPrefix ? "[" + logPrefix + "] " : null, async function () {
    say("start (" + runId + ")");
    const timer = setInterval(function () {
      say("status: running " + Math.round((Date.now() - startedAt.getTime()) / 1000) + "s...");
    }, 60000);
    try {
      const ctx = { runId: runId, pages: new Map() };
      const ownIp = await pickOwnIp();
      const server = await startPageServer(ctx.pages, 0); // port 0: ephemeral, no collisions
      const port = server.address().port;
      ctx.pageUrls = buildPageUrls(runId, ownIp, port);
      try {
        ctx.vendors = {
          a: await resolveVendor("vendor A", VENDOR_A_URI, keyA),
          b: await resolveVendor("vendor B", VENDOR_B_URI, keyB),
        };
        say("vendor A (kerkfabriek + CKB): " + ctx.vendors.a.uri);
        say("vendor B (gemeente):          " + ctx.vendors.b.uri);

        const jar = await step1Jaarrekening(ctx);
        result.submissionUris.push(jar.submission.submissionUri);
        result.submissionDocument = jar.document;
        const bundel = await step2Bundel(ctx, jar.document);
        result.submissionUris.push(bundel.submission.submissionUri);
        const advies = await step3Advies(ctx, jar.document);
        result.submissionUris.push(advies.submission.submissionUri);
        const { cookie } = await step4Approval(ctx, jar.document);
        const { downloadLink } = await step5Download(ctx, jar, cookie);
        result.downloadLink = downloadLink;
        result.status = "passed";
      } catch (error) {
        result.status = "failed";
        result.error = error && error.message ? error.message : String(error);
        console.error("FATAL: " + (error && error.stack ? error.stack : error));
      } finally {
        try { server?.close(); } catch { /* server may be gone already */ }
      }
    } finally {
      clearInterval(timer);
    }
    result.durationMs = Date.now() - startedAt.getTime();
    say("result: " + (result.status === "passed" ? "ALL STEPS PASSED" : "FAILED") +
      " in " + Math.round(result.durationMs / 1000) + "s");
    return result;
  });
}

// Simple worker pool sized by parallel: every worker picks the next run index.
function pool(hasNext, next, work, parallel) {
  const workers = [];
  for (let i = 0; i < parallel; i++) {
    workers.push((async function () {
      while (hasNext()) { await work(next()); }
    })());
  }
  return Promise.all(workers);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.keyA || !args.keyB) {
    throw new Error(
      "usage: node main.js keyA keyB [--runs N] [--parallel P] [--out DIR]\n" +
        "  keyA = vendor A (kerkfabriek + CKB): " + VENDOR_A_URI + "\n" +
        "  keyB = vendor B (gemeente):          " + VENDOR_B_URI + "\n" +
        "  --runs N      total number of runs           (default 1)\n" +
        "  --parallel P  runs in parallel               (default 1)\n" +
        "  --out DIR     where batch results are stored (default " + OUT_DIR + ")"
    );
  }
  const isBatch = args.runs > 1 || args.parallel > 1;

  if (!isBatch) {
    const result = await runFlow(1, args.keyA, args.keyB);
    if (result.status !== "passed") process.exitCode = 1;
    console.log("");
    console.log("Jaarrekening collaborative flow test run " + result.runId + " - please check the logs above.");
  } else {
    let nextIndex = 1;
    const results = [];
    console.log("batch: " + args.runs + " runs, " + args.parallel + " parallel, out dir " + args.outDir);
    await pool(
      function () { return nextIndex <= args.runs; },
      function () { return nextIndex++; },
      async function (index) {
        const result = await runFlow(index, args.keyA, args.keyB, "run" + String(index).padStart(2, "0"));
        results.push(result);
        const passed = results.filter(function (r) { return r.status === "passed"; }).length;
        console.log("");
        console.log("[batch] " + results.length + "/" + args.runs + " done: " +
          passed + " passed, " + (results.length - passed) + " failed");
      },
      Math.min(args.parallel, args.runs)
    );

    await mkdir(args.outDir, { recursive: true });
    const started = new Date().toISOString();
    const summary = {
      script: "test-jaarrekening-flow",
      batchStartedAt: started,
      batchFinishedAt: new Date().toISOString(),
      runs: args.runs,
      parallel: args.parallel,
      total: results.length,
      passed: results.filter(function (r) { return r.status === "passed"; }).length,
      failed: results.filter(function (r) { return r.status !== "passed"; }).length,
      meanDurationMsPassed: null,
      resultsDir: args.outDir,
      results: results,
    };
    const passedDurations = results.filter(function (r) { return r.status === "passed"; })
      .map(function (r) { return r.durationMs; });
    if (passedDurations.length) {
      summary.meanDurationMsPassed = Math.round(
        passedDurations.reduce(function (a, b) { return a + b; }, 0) / passedDurations.length
      );
    }
    const file = join(args.outDir, "batch-" + started.replace(/[:.]/g, "-") + ".json");
    await writeFile(file, JSON.stringify(summary, null, 2) + "\n");
    console.log("");
    console.log("=== BATCH OVERVIEW ===");
    console.log("runs:    " + summary.total);
    console.log("passed:  " + summary.passed);
    console.log("failed:  " + summary.failed);
    if (summary.meanDurationMsPassed !== null) {
      console.log("mean duration (passed runs): " + Math.round(summary.meanDurationMsPassed / 1000) + "s");
    }
    console.log("results: " + file);
    if (summary.failed > 0) process.exitCode = 1;
  }
} catch (error) {
  console.error("FATAL: " + (error && error.stack ? error.stack : error));
  process.exitCode = 1;
}
