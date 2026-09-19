import { JOB_OPERATION } from "./config.js";
import { sparqlEscapeUri } from "./sparql.js";

// Vendor A submits the jaarrekening, B publishes the bundle for the CKB,
// C publishes the approval for the gemeente. Every merged melding poll uses
// the internal cogs:Job + the vendor-visible status of the Submission.

export function pollQuery(submissionUri, pageUrl) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX cogs: <http://vocab.deri.ie/cogs#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT DISTINCT ?dlStatus ?jobStatus ?job
WHERE {
  BIND(${sparqlEscapeUri(submissionUri)} AS ?submission)
  ?job a cogs:Job ;
       task:operation ${sparqlEscapeUri(JOB_OPERATION)} ;
       adms:status ?jobStatus ;
       prov:generated ?submission .
  OPTIONAL { ?submission nie:hasPart ?rdo . ?rdo nie:url ${sparqlEscapeUri(pageUrl)} ; adms:status ?dlStatus }
}`;
}

export function submissionStatusQuery(submissionUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX am: <http://lblod.data.gift/vocabularies/automatische-melding/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
SELECT DISTINCT ?status ?sentDate ?formData ?submissionDocument WHERE {
  ${sparqlEscapeUri(submissionUri)} a meb:Submission ;
    adms:status ?status .
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} nmo:sentDate ?sentDate }
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} prov:generated ?formData . ?formData a am:FormData }
  OPTIONAL { ${sparqlEscapeUri(submissionUri)} dct:subject ?submissionDocument }
}`;
}

// All tasks of the job that generated this submission, with their operation
// and status. Used to detect a stalled chain (task at success, successor
// never created because the job-controller missed its delta).
export function jobTasksQuery(submissionUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX cogs: <http://vocab.deri.ie/cogs#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT DISTINCT ?task ?op ?status WHERE {
  ?job a cogs:Job ;
       prov:generated ${sparqlEscapeUri(submissionUri)} .
  ?task dct:isPartOf ?job ;
        task:operation ?op ;
        adms:status ?status .
}`;
}

// Vendor B (CKB) discovery: the SubmissionDocument of the eredienstbestuur's
// jaarrekening (the pages-vendors "voorbeeld-ckb-grobbendonk.sparql" query).
export function ckbDiscoveryQuery() {
  return `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX org: <http://www.w3.org/ns/org#>
PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX pav: <http://purl.org/pav/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
SELECT DISTINCT ?subject ?dateSent
WHERE {
  ?referringOrganisation org:hasSubOrganization ?referredOrganisation .
  ?submission
    rdf:type meb:Submission ;
    nmo:sentDate ?dateSent ;
    dct:subject ?subject ;
    pav:createdBy ?referredOrganisation ;
    prov:generated ?formData .
  ?subject rdf:type ext:SubmissionDocument .
  ?formData dct:type <https://data.vlaanderen.be/id/concept/BesluitType/e44c535d-4339-4d15-bdbf-d4be6046de2c> .
} ORDER BY DESC(?dateSent) LIMIT 10`;
}

// Vendor C (gemeente) discovery: the eredienstDocument referred to by the CKB
// bundle (the pages-vendors "voorbeeld-gemeente-grobbendonk.sparql" query,
// bound to the Grobbendonk orgs).
export function gemeenteDiscoveryQuery(eredienst) {
  const queryStr = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX org: <http://www.w3.org/ns/org#>
PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX pav: <http://purl.org/pav/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
SELECT DISTINCT ?eredienstDocument ?ckbSubmissionSentDate
WHERE {
  ?ckb org:hasSubOrganization ${sparqlEscapeUri(eredienst)} .

  ?ckbSubmission
    rdf:type meb:Submission ;
    nmo:sentDate ?ckbSubmissionSentDate ;
    pav:createdBy ?ckb ;
    dct:subject ?ckbDocument ;
    prov:generated ?ckbFormData .

  ?ckbFormData
    dct:type <https://data.vlaanderen.be/id/concept/BesluitDocumentType/672bf096-dccd-40af-ab60-bd7de15cc461> ;
    dct:relation ?eredienstDocument .

  ?eredienstDocument rdf:type ext:SubmissionDocument .
} ORDER BY DESC(?ckbSubmissionSentDate) LIMIT 10`;
  console.log(queryStr);
  return queryStr;
}

// Vendor A approval check: in the databank vendor graph, find the advies
// besluit of the gemeente whose artikel refers to the eredienst document, and
// its submission status.
export function approvalCheckQuery(eredienstDocument, gemeente) {
  const q =  `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
PREFIX eli: <http://data.europa.eu/eli/ontology#>
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX pav: <http://purl.org/pav/>
SELECT DISTINCT ?adviesSubmission ?sentDate ?artikel ?artikelType ?status WHERE {
  ?adviesSubmission
    rdf:type meb:Submission ;
    dct:subject ?adviesDocument ;
    pav:createdBy ${sparqlEscapeUri(gemeente)} ;
    nmo:sentDate ?sentDate ;
    adms:status ?status.
  ?adviesDocument eli:has_part ?artikel .
  ?artikel
    rdf:type besluit:Artikel ;
    eli:type_document ?artikelType ;
    eli:refers_to ${sparqlEscapeUri(eredienstDocument)} .
}`;
  console.log(q);
  return q;
}

// Vendor A download discovery: files of the jaarrekening formData, with the
// mapped download link and the retained original (voorbeeld-downloadlink).
export function downloadLinkQuery(submissionUri) {
  const queryStr =  `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
SELECT DISTINCT ?file ?downloadLink ?hadPrimarySource WHERE {
  BIND(${sparqlEscapeUri(submissionUri)} AS ?submission)
  ?submission
    rdf:type meb:Submission ;
    prov:generated ?formData .
  ?formData dct:hasPart ?file .
  ?file nie:url ?downloadLink .
  OPTIONAL { ?file prov:hadPrimarySource ?hadPrimarySource }
}`;
  console.log(queryStr);
  return queryStr;
}
