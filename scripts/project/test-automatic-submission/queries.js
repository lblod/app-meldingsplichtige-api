import { JOB_OPERATION } from "./config.js";
import { sparqlEscapeUri } from "./sparql.js";

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