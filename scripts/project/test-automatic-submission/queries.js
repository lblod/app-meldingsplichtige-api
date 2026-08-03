import { ORG_UNIT, ORGAN_ABSTRACT, JOB_OPERATION } from "./config.js";
import { sparqlEscapeUri } from "./sparql.js";

export function pollQuery(submissionUri, pageUrl) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX cogs: <http://vocab.deri.ie/cogs#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX melding: <http://lblod.data.gift/vocabularies/automatische-melding/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT DISTINCT ?dlStatus ?jobStatus ?submissionStatus ?sentDate ?formData
       (GROUP_CONCAT(DISTINCT CONCAT(STR(?taskIndex), "=", STR(?taskStatus)); separator=",") AS ?tasks)
WHERE {
  BIND(${sparqlEscapeUri(submissionUri)} AS ?submission)
  ?job a cogs:Job ;
       task:operation ${sparqlEscapeUri(JOB_OPERATION)} ;
       adms:status ?jobStatus ;
       prov:generated ?submission .
  ?submission adms:status ?submissionStatus .
  OPTIONAL { ?submission nmo:sentDate ?sentDate }
  OPTIONAL { ?submission prov:generated ?formData . ?formData a melding:FormData }
  OPTIONAL { ?task dct:isPartOf ?job ; task:index ?taskIndex ; adms:status ?taskStatus }
  OPTIONAL { ?submission nie:hasPart ?rdo . ?rdo nie:url ${sparqlEscapeUri(pageUrl)} ; adms:status ?dlStatus }
}
GROUP BY ?dlStatus ?jobStatus ?submissionStatus ?sentDate ?formData`;
}

export function organDiagnosticQuery() {
  return `
PREFIX besluit:  <http://data.vlaanderen.be/ns/besluit#>
PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
PREFIX lblodlg: <http://data.lblod.info/vocabularies/leidinggevenden/>
SELECT DISTINCT ?organ ?start ?einde WHERE {
  GRAPH <http://mu.semte.ch/graphs/public> {
    ${sparqlEscapeUri(ORGAN_ABSTRACT)} besluit:bestuurt ${sparqlEscapeUri(ORG_UNIT)} ;
                      skos:prefLabel ?abstractLabel ;
                      besluit:classificatie ?classificatie .
    ?classificatie skos:prefLabel ?classificatieLabel .
    ${sparqlEscapeUri(ORG_UNIT)} besluit:classificatie ?unitClassificatie .
    ?unitClassificatie skos:prefLabel ?unitClassificatieLabel .
    ?organ mandaat:isTijdspecialisatieVan ${sparqlEscapeUri(ORGAN_ABSTRACT)} ;
           mandaat:bindingStart ?start .
    OPTIONAL { ?organ mandaat:bindingEinde ?einde }
    FILTER NOT EXISTS { ?organ lblodlg:heeftBestuursfunctie ?lg }
  }
}`;
}