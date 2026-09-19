import {
  VENDOR_LOGIN_ENDPOINT,
  VENDOR_SPARQL_ENDPOINT,
  VENDOR_LOGOUT_ENDPOINT,
} from "./config.js";
import { logCommand, logRetry, logSparql } from "./log.js";

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// Same contract as the pages-vendors "Vendor SPARQL API" docs: POST /vendor/login
// gives a session cookie, POST /vendor/sparql runs read-only SPARQL within the
// vendor's own graphs, DELETE /vendor/logout ends the session.
export async function vendorLogin(organization, vendorUri, vendorKey) {
  logCommand("vendor login", "POST", VENDOR_LOGIN_ENDPOINT);
  const response = await fetch(VENDOR_LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organization: organization,
      publisher: { uri: vendorUri, key: vendorKey },
    }),
  });
  const body = await response.json().catch(() => null);
  if (response.status < 200 || response.status >= 300) {
    let detail = "expected 2xx, got " + response.status;
    if (response.status === 401 || response.status === 403) {
      detail +=
        " - vendor login rejected: no match for this URI + key + organization" +
        " (check muAccount:key and muAccount:canActOnBehalfOf in" +
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

export async function vendorSparql(cookie, what, query) {
  logCommand(what, "POST", VENDOR_SPARQL_ENDPOINT);
  logSparql(what, query);
  // The session write from /vendor/login is not always visible to the
  // authorization wrapper immediately (read-after-write lag), which makes the
  // first query after login fail with 403. Retry a few times before giving up.
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
    if (response.status === 403 && attempt < maxAttempts) {
      const waitMs = 1000 * attempt;
      logRetry(attempt, "vendor sparql returned 403 (session not visible yet)", waitMs, "403, retrying");
      await sleep(waitMs);
      continue;
    }
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
  return { error: "vendor sparql kept returning 403 after retrying" };
}

export async function vendorLogout(cookie) {
  logCommand("vendor logout", "DELETE", VENDOR_LOGOUT_ENDPOINT);
  const response = await fetch(VENDOR_LOGOUT_ENDPOINT, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  return response.status;
}

export async function vendorDownload(cookie, url) {
  logCommand("vendor file download", "GET", url);
  const response = await fetch(url, {
    headers: { Cookie: cookie, Accept: "*/*" },
    redirect: "follow",
  });
  const body = await response.arrayBuffer();
  return { status: response.status, contentType: response.headers.get("content-type"), size: body.byteLength, body };
}
