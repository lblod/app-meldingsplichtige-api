import { SPARQL_ENDPOINT } from "./config.js";
import { logSparql, logCommand } from "./log.js";

export function sparqlEscapeUri(value) {
  return "<" + String(value).replace(/[<>"]/g, function (match) { return "\\" + match; }) + ">";
}

export async function sparql(what, query) {
  logCommand(what, "GET", SPARQL_ENDPOINT);
  logSparql(what, query);
  try {
    const response = await fetch(
      SPARQL_ENDPOINT + "?query=" + encodeURIComponent(query),
      { headers: { Accept: "application/sparql-results+json" } }
    );
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      return { error: "sparql returned unparseable response" };
    }
    if (typeof parsed.boolean === "boolean") return { boolean: parsed.boolean };
    return parsed.results ? parsed.results.bindings : [];
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
}

export async function postJson(what, url, body) {
  logCommand(what, "POST", url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    /* keep raw text */
  }
  return { status: response.status, body: parsed };
}
