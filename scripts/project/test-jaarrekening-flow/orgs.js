import { KFB_ORG, CKB_ORG, GEMEENTE_ORG } from "./config.js";
import { sparql, sparqlEscapeUri } from "./sparql.js";

// Pick 3 distinct vendors that can act on behalf of all three Grobbendonk orgs.
// Migration 20260918100000 grants every ext:Vendor canActOnBehalfOf for the 3
// test organisations, so any 3 vendors work.
export const grantedVendorsQuery = () => `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
SELECT DISTINCT ?vendor ?name WHERE {
  GRAPH <http://mu.semte.ch/graphs/automatic-submission> {
    ?vendor muAccount:key ?key ;
            muAccount:canActOnBehalfOf
              ${sparqlEscapeUri(KFB_ORG)},
              ${sparqlEscapeUri(CKB_ORG)},
              ${sparqlEscapeUri(GEMEENTE_ORG)} ;
            foaf:name ?name .
  }
} ORDER BY ?name ?vendor`;

export const vendorKeysQuery = (vendorUri) => `
PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
SELECT ?key WHERE {
  GRAPH <http://mu.semte.ch/graphs/automatic-submission> {
    ${sparqlEscapeUri(vendorUri)} muAccount:key ?key .
  }
}`;

export const organQuery = (unitUri, classificatie) => `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
PREFIX org: <http://www.w3.org/ns/org#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?organInTijd ?organAbstract ?label ?bindingStart WHERE {
  ?organAbstract besluit:bestuurt ${sparqlEscapeUri(unitUri)} ;
                 besluit:classificatie ${sparqlEscapeUri(classificatie)} ;
                 skos:prefLabel ?label .
  ?organInTijd mandaat:isTijdspecialisatieVan ?organAbstract ;
               mandaat:bindingStart ?bindingStart .
} ORDER BY DESC(?bindingStart)`;

// Resolve the most recently started bestuursorgaan (in tijd) of a unit.
// The KFB has a Kerkraad organ, the CKB a Centraal kerkbestuur organ, the
// gemeente a Gemeenteraad organ. All are found via besluit:bestuurt plus a
// BestuursorgaanClassificatieCode to disambiguate.
export async function resolveOrgan(unitUri, label, classificatie) {
  const rows = await sparql(organQuery(unitUri, classificatie));
  if (rows && rows.error) throw new Error("bestuursorgaan lookup failed for " + label + ": " + rows.error);
  if (rows.length === 0) {
    throw new Error("no bestuursorgaan (in tijd) found for " + label + " " + unitUri);
  }
  const firstAbstract = rows[0].organAbstract.value;
  const sameOrgan = rows.filter(function (row) {
    return row.organAbstract.value === firstAbstract;
  });
  if (rows.length !== sameOrgan.length) {
    const other = rows.find(function (row) { return row.organAbstract.value !== firstAbstract; });
    throw new Error(
      "ambiguous bestuursorgaan for " + label + " " + unitUri +
        ": also found " + other.label.value + " " + other.organInTijd.value
    );
  }
  const organ = {
    organInTijd: rows[0].organInTijd.value,
    organAbstract: firstAbstract,
    organLabel: rows[0].label.value,
  };
  console.log("bestuursorgaan for " + label + ": " + organ.organLabel + " - " + organ.organInTijd);
  return organ;
}
