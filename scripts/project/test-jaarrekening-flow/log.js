// Log helpers so the run log reads like a protocol transcript:
// step banners, every command we run, then a one-line result.
import { AsyncLocalStorage } from "node:async_hooks";

// In batch mode several runs share one stdout. Every log line belongs to the
// run that printed it, so the active run registers a prefix in an
// AsyncLocalStorage and the console methods print it. The store lookup
// happens the moment console.log is called, which is inside the run's async
// chain, so interleaved runs each keep their own prefix while other output
// (e.g. batch overview) prints unprefixed.
const logContext = new AsyncLocalStorage();
let patched = false;

function patchConsole() {
  if (patched) return;
  patched = true;
  for (const method of ["log", "error", "warn", "info"]) {
    const original = console[method].bind(console);
    console[method] = function (...args) {
      const prefixText = logContext.getStore()?.prefix;
      if (prefixText) original(prefixText + args[0], ...args.slice(1));
      else original(...args);
    };
  }
}

export function withLogPrefix(prefixText, fn) {
  patchConsole();
  return logContext.run({ prefix: prefixText }, fn);
}

export function step(number, title) {
  console.log("");
  console.log("=== STEP " + number + ": " + title + " ===");
}

export function say(message) {
  console.log("  " + message);
}

// Every HTTP command gets printed before it runs, together with WHAT it is
// checking (which endpoint, which probe). Example:
//   -> poll-check (job + download status): POST http://identifier/vendor/sparql
export function logCommand(what, method, url) {
  console.log("  -> " + what + ": " + method + " " + url);
}

// The full SPARQL query, printed for real (no truncation), body lines indented.
export function logSparql(what, query) {
  console.log("  SPARQL query (" + what + "):");
  for (const line of query.split("\n")) {
    if (line.trim()) console.log("    " + line.trim());
  }
}

// The request body, printed for real (no truncation), JSON, body lines indented.
export function logBody(what, body) {
  console.log("  body (" + what + "):");
  for (const line of JSON.stringify(body, null, 2).split("\n")) {
    console.log("    " + line);
  }
}

// Announce a poll attempt, e.g. "  retry 3: no rows yet, waiting 2s...".
// attempt is the counter as kept by the caller; result only printed if given.
export function logRetry(attempt, reason, waitMs, result) {
  let line = "  attempt " + attempt + ": " + reason + ", waiting " + waitMs + "ms...";
  if (result !== undefined) line += " result: " + result;
  console.log(line);
}
