// Small feedback helpers so the run log reads like a protocol transcript:
// what we are about to do, attempt numbers, then a one-line result.

export function say(message) {
  console.log("  " + message);
}

// SPARQL output is unreadable with all the PREFIX lines; show the query body
// only, trimmed to one line.
export function condensedQuery(query) {
  return query
    .split("\n")
    .filter(function (line) { return !/^\s*PREFIX /.test(line); })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function secondsSince(start) {
  return Math.round((Date.now() - start) / 1000) + "s";
}
