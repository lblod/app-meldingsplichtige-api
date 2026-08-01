import crypto from "node:crypto";
import { ORG_UNIT, ORGAN_IN_TIJD, ORGAN_ABSTRACT, DOC_URI_BASE, POLL_INTERVAL, POLL_TIMEOUT } from "./config.js";
import { collectInput, deriveValues } from "./input.js";
import { renderTemplate } from "./template.js";
import { startPageServer } from "./server.js";
import { runChecks, checks } from "./checks.js";
import { report } from "./report.js";

const runId = crypto.randomUUID();
const startedAt = new Date().toISOString();
const runState = {
  runId,
  input: {},
  generated: {},
  response: {},
  diagnostics: { tasks: [], errors: [] },
};

let server = null;
try {
  const argv = process.argv.slice(2);
  const input = await collectInput(argv, runId);
  const derived = deriveValues(input, runId, DOC_URI_BASE);
  derived.vendorKey = input.vendorKey;

  runState.input = {
    vendorUri: input.vendorUri,
    organization: ORG_UNIT,
    organInTijd: ORGAN_IN_TIJD,
    organAbstract: ORGAN_ABSTRACT,
    status: input.statusChoice === "1" ? "concept" : "inzendbaar",
    datumZitting: input.datumZitting,
    datumPublicatie: input.datumPublicatie,
    titelAgendapunt: input.titelAgendapunt,
    titelBesluit: input.titelBesluit,
  };
  runState.generated = { docUri: derived.docUri };

  const html = renderTemplate(runId, derived, input.datumPublicatie);
  runState.generated.html = html;

  const started = await startPageServer(html, derived.docUri, runId);
  server = started.server;
  runState.generated.pageUrl = started.pageUrl;

  await runChecks(runState, derived, started.pageUrl, input, POLL_INTERVAL, POLL_TIMEOUT);
} catch (e) {
  console.error("FATAL: " + (e && e.stack ? e.stack : e));
} finally {
  if (server) try { server.close(); } catch (e) {}
  report(checks, runState, startedAt);
}