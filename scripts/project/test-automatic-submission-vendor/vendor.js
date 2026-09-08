import {
  ORG_UNIT,
  VENDOR_LOGIN_ENDPOINT,
  VENDOR_SPARQL_ENDPOINT,
  VENDOR_LOGOUT_ENDPOINT,
} from "./config.js";

// Client for the vendor SPARQL API (pages-vendors docs "Vendor SPARQL API"):
// POST /vendor/login hands out a session cookie, POST /vendor/sparql executes
// read-only SPARQL for the vendor's own graph, DELETE /vendor/logout ends the
// session. Queries go out form-encoded as a "query" field per the SPARQL
// Protocol, not as a JSON body.

export async function vendorLogin(input) {
  const response = await fetch(VENDOR_LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization: ORG_UNIT,
      publisher: { uri: input.vendorUri, key: input.vendorKey },
    }),
  });
  const body = await response.json().catch(() => null);
  if (response.status < 200 || response.status >= 300) {
    let detail = "expected 2xx, got " + response.status;
    if (response.status === 401 || response.status === 403) {
      detail +=
        " - vendor login rejected: no match for this URI + key + organization" +
        " (check the vendor's muAccount:key and muAccount:canActOnBehalfOf in" +
        " GRAPH <http://mu.semte.ch/graphs/automatic-submission>)";
    }
    if (body) detail += " - body: " + JSON.stringify(body);
    throw new Error(detail);
  }
  const setCookieValues =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : (response.headers.get("set-cookie") || "").split(/,(?=[^;]+=)/);
  const cookie = setCookieValues.map((value) => value.split(";")[0]).join("; ");
  if (!cookie) throw new Error("login returned " + response.status + " but no session cookie");
  return { cookie, sessionUri: body && body["@id"] ? body["@id"] : null };
}

export async function vendorSparql(cookie, query) {
  const response = await fetch(VENDOR_SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
      Cookie: cookie,
    },
    body: "query=" + encodeURIComponent(query),
  });
  const text = await response.text();
  if (response.status !== 200) {
    return { error: "vendor sparql returned " + response.status + ": " + text.slice(0, 300) };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (parseError) {
    return { error: "vendor sparql returned unparseable response" };
  }
  if (typeof parsed.boolean === "boolean") return { boolean: parsed.boolean };
  return parsed.results ? parsed.results.bindings : [];
}

export async function vendorLogout(cookie) {
  const response = await fetch(VENDOR_LOGOUT_ENDPOINT, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  return response.status;
}
