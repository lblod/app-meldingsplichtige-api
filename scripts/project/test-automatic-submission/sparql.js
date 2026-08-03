import { SPARQL_ENDPOINT } from "./config.js";

export function sparqlEscapeUri(value) {
  return "<" + String(value).replace(/[<>"]/g, function (m) { return "\\" + m; }) + ">";
}

export async function sparql(query) {
  try {
    const res = await fetch(
      SPARQL_ENDPOINT + "?query=" + encodeURIComponent(query),
      { headers: { Accept: "application/sparql-results+json" } }
    );
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { error: "sparql returned unparseable response" };
    }
    if (typeof parsed.boolean === "boolean") return { boolean: parsed.boolean };
    return parsed.results ? parsed.results.bindings : [];
  } catch (e) {
    return { error: e && e.message ? e.message : String(e) };
  }
}

export async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    /* keep raw text */
  }
  return { status: res.status, body: parsed };
}