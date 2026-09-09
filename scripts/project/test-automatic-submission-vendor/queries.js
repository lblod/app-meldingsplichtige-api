import {
  JOB_OPERATION,
  ORGAAN_CLASSIFICATIE_GEMEENTERAAD,
  EENHEID_CLASSIFICATIE_GEMEENTE,
} from "./config.js";
import { sparqlEscapeUri, sparqlEscapeString } from "./sparql.js";

export function vendorsSearchQuery(search) {
  return `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
SELECT DISTINCT ?uri ?label WHERE {
  GRAPH <http://mu.semte.ch/graphs/automatic-submission> {
    ?uri a foaf:Agent ;
         foaf:name ?label ;
         muAccount:key ?key .
  }
  ${search ? "FILTER(CONTAINS(LCASE(?label), LCASE(" + sparqlEscapeString(search) + ")))" : ""}
} ORDER BY ?label LIMIT 20`;
}

export function eenhedenSearchQuery(vendorUri, search) {
  return `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?uri ?label WHERE {
  GRAPH <http://mu.semte.ch/graphs/automatic-submission> {
    ${sparqlEscapeUri(vendorUri)} muAccount:canActOnBehalfOf ?uri .
  }
  ?uri a besluit:Bestuurseenheid ;
       besluit:classificatie ${sparqlEscapeUri(EENHEID_CLASSIFICATIE_GEMEENTE)} ;
       skos:prefLabel ?label .
  ${search ? "FILTER(CONTAINS(LCASE(?label), LCASE(" + sparqlEscapeString(search) + ")))" : ""}
} ORDER BY ?label LIMIT 15`;
}

export function pollQuery(submissionUri, pageUrl) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX cogs: <http://vocab.deri.ie/cogs#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT DISTINCT ?dlStatus ?jobStatus
WHERE {
  BIND(${sparqlEscapeUri(submissionUri)} AS ?submission)
  ?job a cogs:Job ;
       task:operation ${sparqlEscapeUri(JOB_OPERATION)} ;
       adms:status ?jobStatus ;
       prov:generated ?submission .
  OPTIONAL { ?submission nie:hasPart ?rdo . ?rdo nie:url ${sparqlEscapeUri(pageUrl)} ; adms:status ?dlStatus }
}`;
}

export function tasksQuery(jobUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT DISTINCT ?operation ?status WHERE {
  ?task dct:isPartOf ${sparqlEscapeUri(jobUri)} ;
       task:operation ?operation ;
       adms:status ?status .
}`;
}

export function jobStatusQuery(jobUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX cogs: <http://vocab.deri.ie/cogs#>
SELECT DISTINCT ?status WHERE {
  ${sparqlEscapeUri(jobUri)} a cogs:Job ; adms:status ?status .
}`;
}

export function submissionStatusQuery(submissionUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX melding: <http://lblod.data.gift/vocabularies/automatische-melding/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX prov: <http://www.w3.org/ns/prov#>
SELECT DISTINCT ?status ?sentDate ?formData WHERE {
  ${sparqlEscapeUri(submissionUri)} adms:status ?status .
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} nmo:sentDate ?sentDate }
    OPTIONAL { ${sparqlEscapeUri(submissionUri)} prov:generated ?formData . ?formData a melding:FormData }
}`;
}

export function organsQuery(eenheidUri) {
  return `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
PREFIX org: <http://www.w3.org/ns/org#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?orgaanInTijd ?orgaanAbstract ?label ?bindingStart WHERE {
  ?orgaanAbstract besluit:bestuurt ${sparqlEscapeUri(eenheidUri)} ;
                   skos:prefLabel ?label ;
                   org:classification ${sparqlEscapeUri(ORGAAN_CLASSIFICATIE_GEMEENTERAAD)} .
  ?orgaanInTijd mandaat:isTijdspecialisatieVan ?orgaanAbstract ;
                mandaat:bindingStart ?bindingStart .
}`;
}

export function singleOrganQuery(organInTijdUri) {
  return `
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
PREFIX org: <http://www.w3.org/ns/org#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?orgaanInTijd ?orgaanAbstract ?label ?eenheid WHERE {
  BIND(${sparqlEscapeUri(organInTijdUri)} AS ?orgaanInTijd)
  ?orgaanInTijd mandaat:isTijdspecialisatieVan ?orgaanAbstract .
  ?orgaanAbstract skos:prefLabel ?label ;
                   besluit:bestuurt ?eenheid ;
                   org:classification ${sparqlEscapeUri(ORGAAN_CLASSIFICATIE_GEMEENTERAAD)} .
}`;
}

// The vendor SPARQL API has no view on the internal cogs:Job. The vendor-visible
// state of the submitted job is the Submission's status (with its label), the
// sentDate, the generated FormData and the harvested submission document.
export function vendorSubmissionQuery(submissionUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX am: <http://lblod.data.gift/vocabularies/automatische-melding/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?status ?statusLabel ?sentDate ?formData ?submissionDocument WHERE {
  ${sparqlEscapeUri(submissionUri)} a meb:Submission ;
      adms:status ?status .
  OPTIONAL { ?status skos:prefLabel ?statusLabel . FILTER (LANG(?statusLabel) = "nl") }
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} nmo:sentDate ?sentDate }
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} prov:generated ?formData . ?formData a am:FormData }
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} dct:subject ?submissionDocument }
}`;
}