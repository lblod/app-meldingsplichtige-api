import fs from "node:fs";
import path from "node:path";
import { RESULT_FILE, ORG_UNIT } from "./config.js";

const nowIso = () => new Date().toISOString();

function verdictLine(verdict, passed, total) {
  return (
    "AUTOMATIC SUBMISSION TEST: " +
    (verdict === "PASS" ? "PASS " : "FAIL ") +
    "(" + passed + "/" + total + " checks)" +
    (verdict === "FAIL" ? " — see test-automatic-submission/last-run.json" : "")
  );
}

function checkLine(c) {
  const tag = c.ok ? "ok  " : "FAIL";
  const idx = "[" + c.id + "/5]";
  const detail = c.detail || "";
  const ms = c.ms ? " " + c.ms + "ms" : "";
  return idx.padEnd(6) + " " + tag + "  " + c.label + " — " + detail + ms;
}

function diagnosticsLines(diagnostics) {
  const lines = [];
  if (diagnostics && diagnostics.tasks && diagnostics.tasks.length) {
    lines.push("  task errors:");
    for (const t of diagnostics.tasks) {
      const op = t.op ? t.op.value : "?";
      const status = t.status ? t.status.value : "?";
      const msg = t.msg ? t.msg.value : "";
      const last = op.split("/").pop();
      lines.push("    " + last + ": " + status.split("/").pop() + (msg ? " — " + msg : ""));
    }
  }
  if (diagnostics && diagnostics.errors && diagnostics.errors.length) {
    lines.push("  error graph:");
    for (const e of diagnostics.errors) {
      const s = e.s ? e.s.value : "?";
      const msg = e.msg ? e.msg.value : "";
      lines.push("    " + s.split("/").pop() + (msg ? " — " + msg : ""));
    }
  }
  return lines;
}

export function report(checks, runState, startedAt) {
  const passed = checks.filter((c) => c.ok).length;
  const total = 5;
  const verdict = checks.length === 0 || passed === total ? "PASS" : "FAIL";

  for (const c of checks) console.log(checkLine(c));
  for (const l of diagnosticsLines(runState.diagnostics)) console.log(l);

  if (runState.response && Object.keys(runState.response).length) {
    console.log("POST /melding response:");
    console.log("  status: " + runState.response.status);
    if (runState.response.submission) console.log("  submission: " + runState.response.submission);
    if (runState.response.job) console.log("  job: " + runState.response.job);
    if (runState.response.body) {
      console.log("  body: " + JSON.stringify(runState.response.body));
    }
  }

  console.log(verdictLine(verdict, passed, total));

  if (verdict === "PASS") {
    console.log(
      "Verify in the dashboard: log in as bestuurseenheid " + ORG_UNIT +
      " and check the submission."
    );
  }

  const result = {
    runId: runState.runId,
    startedAt,
    finishedAt: nowIso(),
    durationMs: Date.now() - new Date(startedAt).getTime(),
    verdict,
    input: runState.input,
    generated: runState.generated,
    response: runState.response,
    checks,
    diagnostics: runState.diagnostics,
  };
  try {
    fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("could not write result file: " + e.message);
  }
}