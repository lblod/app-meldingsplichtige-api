// Log helpers so the run log reads like a protocol transcript:
// step banners, every command we run, then a one-line result.

export function step(number, title) {
  console.log("");
  console.log("=== STEP " + number + ": " + title + " ===");
}

export function say(message) {
  console.log("  " + message);
}

// Every HTTP command gets printed before it runs, together with WHAT it is
// checking (which endpoint, which probe). Example:
//   -> poll-check (job + download status): GET http://virtuoso:8890/sparql?query=...
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

// Announce a poll attempt, e.g. "  retry 3: no rows yet, waiting 2s...".
// attempt is the counter as kept by the caller; result only printed if given.
export function logRetry(attempt, reason, waitMs, result) {
  let line = "  attempt " + attempt + ": " + reason + ", waiting " + waitMs + "ms...";
  if (result !== undefined) line += " result: " + result;
  console.log(line);
}
