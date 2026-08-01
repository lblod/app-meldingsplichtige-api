import { SPARQL_ENDPOINT } from "./config.js";

process.env.MU_SPARQL_ENDPOINT = SPARQL_ENDPOINT;
const mu = await import("/usr/src/app/helpers/mu/sparql.js");

export async function sparql(query) {
  try {
    const res = await mu.query(query, { sudo: false });
    if (res === null) return { error: "sparql returned unparseable response" };
    if (typeof res.boolean === "boolean") return { boolean: res.boolean };
    return res.results ? res.results.bindings : [];
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