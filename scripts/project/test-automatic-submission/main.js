import { randomUUID } from "node:crypto";
import { POLL_INTERVAL, POLL_TIMEOUT } from "./config.js";
import { collectInput } from "./input.js";
import { renderTemplate } from "./template.js";
import { startPageServer } from "./server.js";
import { runChecks } from "./checks.js";

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

  await runChecks(runId, input, started.pageUrl, POLL_INTERVAL, POLL_TIMEOUT);
} catch (error) {
  console.error("FATAL: " + (error && error.stack ? error.stack : error));
} finally {
  if (server) try { server.close(); } catch (closeError) {}
}

console.log("Automatic submission test run " + runId + " - please check logs to see how it went.");