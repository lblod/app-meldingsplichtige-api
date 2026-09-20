import { CV_SPARQL_ENDPOINT } from "./config.js";
import { sparqlEscapeUri, sparqlEscapeString } from "./sparql.js";

// Centrale vindplaats lookups, the way a vendor does them before touching the
// local stack: search for the bestuurseenheid/eredienst by label.

// The vindplaats dispatcher only routes GET /sparql (POST 404s), so the query
// goes in the querystring like our local sparql() helper.
export async function cvSparql(query) {
  console.log("Centrale vindplaats query:");
  console.log(query);
  try {
    const response = await fetch(CV_SPARQL_ENDPOINT + "?query=" + encodeURIComponent(query), {
      headers: { Accept: "application/sparql-results+json" },
    });
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      return { error: "centrale vindplaats returned unparseable response" };
    }
    if (!response.ok) return { error: "HTTP " + response.status + ": " + text };
    return parsed.results ? parsed.results.bindings : [];
  } catch (error) {
    return { error: error && error.message ? error.message : String(error) };
  }
}

export const unitSearchQuery = (labelFragment, unitClassificatie) => `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?bestuurseenheid ?label WHERE {
  ?bestuurseenheid a besluit:Bestuurseenheid ;
    skos:prefLabel ?label ;
    besluit:classificatie ${sparqlEscapeUri(unitClassificatie)} .
  FILTER(CONTAINS(LCASE(STR(?label)), LCASE(${sparqlEscapeString(labelFragment)})))
}`;

// Look up the unit by label on the centrale vindplaats. Preference order:
// 1. an exact match with the configured fallback unit (live data here follows
//    the same referentie-dump, so this is the normal case),
// 2. exact label match, 3. the freshest/first result otherwise.
// Falls back to the configured unit when the vindplaats is unreachable.
export async function resolveUnitOnCentraleVindplaats(name, labelFragment, unitClassificatie, fallbackUri) {
  const rows = await cvSparql(unitSearchQuery(labelFragment, unitClassificatie));
  const fallback = () => {
    console.log("WARNING centrale vindplaats lookup failed for " + name + ", falling back to the configured unit: " + fallbackUri);
    return fallbackUri;
  };
  if (rows && rows.error) return fallback();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("WARNING centrale vindplaats has no bestuurseenheid with label ~" + labelFragment + " (" + name + "), falling back to the configured unit: " + fallbackUri);
    return fallbackUri;
  }
  const configured = rows.find((row) => row.bestuurseenheid.value === fallbackUri);
  const chosen = configured || rows[0];
  if (chosen.bestuurseenheid.value !== fallbackUri) {
    console.log("NOTE centrale vindplaats resolved " + name + " to " + chosen.label.value + " - " + chosen.bestuurseenheid.value);
  } else {
    console.log("centrale vindplaats: " + name + " = " + chosen.label.value + " - " + chosen.bestuurseenheid.value);
  }
  return chosen.bestuurseenheid.value;
}
