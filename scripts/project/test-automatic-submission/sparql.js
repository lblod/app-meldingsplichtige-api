import { SPARQL_ENDPOINT } from "./config.js";

// POST form-encoded query, return results.bindings (array of
// { var: { type, value } }). Never throws — returns { error } on failure.
export async function sparql(query) {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
    },
    body: "query=" + encodeURIComponent(query),
  });
  const text = await res.text();
  if (!res.ok) return { error: "sparql " + res.status + ": " + text };
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { error: "sparql bad json: " + text };
  }
  if (typeof json.boolean === "boolean") return { boolean: json.boolean };
  return json.results ? json.results.bindings : [];
}

// POST JSON, returns { status, body }, never throws on non-2xx.
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