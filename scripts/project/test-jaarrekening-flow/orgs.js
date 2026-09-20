import { sparql, sparqlEscapeUri } from "./sparql.js";
import { say } from "./log.js";

// Resolve of the organ structure happens on the centrale vindplaats, not on
// the local databank.
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
  const rows = await sparql("organ lookup (centrale vindplaats SPARQL)", organQuery(unitUri, classificatie));
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
  say("bestuursorgaan for " + label + ": " + organ.organLabel + " - " + organ.organInTijd);
  return organ;
}

// The vendor key is a secret of the own stack; it is never resolved via a
// SPARQL query. It must be passed on the command line. No key? Tell the user
// which vendor (label + uri) is missing it and how the CLI call should look.
export async function resolveVendor(label, uri, keyArg) {
  if (!keyArg) {
    throw new Error(
      "no key for " + label + " (" + uri + ")" +
        " - pass it as the command line argument for this vendor, ordered like this:\n" +
        "  node main.js keyA keyB\n" +
        "  keyA = vendor A (kerkfabriek + CKB)\n" +
        "  keyB = vendor B (gemeente)"
    );
  }
  return { uri, key: keyArg };
}
