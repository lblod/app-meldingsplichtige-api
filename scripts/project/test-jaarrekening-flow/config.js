// Full collaborative jaarrekening flow (Grobbendonk test space):
// vendor A (eredienstbestuur vendor) submits the jaarrekening for the KFB and
// the CKB bundle, vendor B (gemeente vendor) publishes the approval,
// vendor A verifies and downloads.
export const KFB_ORG =
  "http://data.lblod.info/id/besturenVanDeEredienst/4bafd12e53d6aaa218d74446202dc2ed";
export const CKB_ORG =
  "http://data.lblod.info/id/centraleBesturenVanDeEredienst/3e95fcbcdde9a46586f91b693985578f";
export const GEMEENTE_ORG =
  "http://data.lblod.info/id/bestuurseenheden/f4641f7ba21f1a575993f1b523fb581af12269164006abeab121886037ac0cad";

// Vendor A acts for both eredienst organisaties (KFB and CKB), vendor B acts
// for the gemeente.
export const VENDOR_A_URI = "http://data.lblod.info/vendors/b1e41693-639a-4f61-92a9-5b9a3e0b924e";
export const VENDOR_B_URI = "http://data.lblod.info/vendors/d6d4f2ae-1d08-11eb-adc1-0242ac120002";

// BesluitType "Jaarrekening" (document of the eredienstbestuur itself)
export const JAARREKENING_TYPE =
  "https://data.vlaanderen.be/id/concept/BesluitType/e44c535d-4339-4d15-bdbf-d4be6046de2c";
// BesluitDocumentType "Jaarrekeningen van de besturen van de eredienst" (CKB bundle)
export const CKB_BUNDLE_TYPE =
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/672bf096-dccd-40af-ab60-bd7de15cc461";
// BesluitType "Advies bij jaarrekening eredienstbestuur" (gemeente)
export const ADVIES_BESLUIT_TYPE =
  "https://data.vlaanderen.be/id/concept/BesluitType/79414af4-4f57-4ca3-aaa4-f8f1e015e71c";
// ArtikelType "Goedkeuring gerefereerde documenten"
export const ARTIKELTYPE_GOEDKEURING =
  "http://data.lblod.info/concepts/ArtikelTypes/080def57-72ce-4f32-b3f9-369009644fd2";
// ArtikelType "Gunstig advies" (alternative colouring used by the docs example)
export const ARTIKELTYPE_GUNSTIG_ADVIES =
  "http://data.lblod.info/concepts/ArtikelTypes/9a54a930-7dd6-4ff2-a4b1-ee403f7cda5c";

// BestuursorgaanClassificatieCode of the organs that take the decisions in
// this flow: the Kerkraad of the kerkfabriek, the Centraal kerkbestuur of the
// CKB and the Gemeenteraad of the gemeente.
export const CLASSIFICATIE_KERKRAAD =
  "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/04f65457bf125b2dc59fd71917ac3d08";
export const CLASSIFICATIE_CKB =
  "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/0d985699479162198b889f10e4f1a8ce";
export const CLASSIFICATIE_GEMEENTERAAD =
  "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000005";

export const STATUS_INZENDBAAR =
  "http://lblod.data.gift/concepts/f6330856-e261-430f-b949-8e510d20d0ff";
export const STATUS_VERSTUURD =
  "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";
export const JOB_SUCCESS = "http://redpencil.data.gift/id/concept/JobStatus/success";
export const JOB_FAILED = "http://redpencil.data.gift/id/concept/JobStatus/failed";
export const DL_SUCCESS = "http://lblod.data.gift/file-download-statuses/success";

// The vendor-data-distribution instance rewrites every file's nie:url into
// "#{HOSTNAME}files/<uuid>/download" and keeps the original under prov:hadPrimarySource.
// The HOSTNAME depends on the stack config, so the script does not assert on it:
// in main.js the host of the ?downloadLink value is replaced with the mu-identifier
// ("http://identifier") on the docker network before downloading.

export const CV_SPARQL_ENDPOINT = "https://centrale-vindplaats.lblod.info/sparql";
export const MELDING_ENDPOINT = "http://identifier/melding";
export const VENDOR_LOGIN_ENDPOINT = "http://identifier/vendor/login";
export const VENDOR_SPARQL_ENDPOINT = "http://identifier/vendor/sparql";
export const VENDOR_LOGOUT_ENDPOINT = "http://identifier/vendor/logout";

export const AUTOMATIC_SUBMISSION_GRAPH =
  "http://mu.semte.ch/graphs/automatic-submission";

export const RAPPORTJAAR = "2025";
export const DOC_URI_BASE = "http://test.local/jaarrekening-flow/";
export const PAGE_PORT = 8899;
export const POLL_INTERVAL = 2000;
export const POLL_TIMEOUT = 150000;

export const LABELS = {
  [JOB_SUCCESS]: "success",
  [JOB_FAILED]: "failed",
  [STATUS_INZENDBAAR]: "inzendbaar",
  [STATUS_VERSTUURD]: "verstuurd",
  [DL_SUCCESS]: "success",
  "http://redpencil.data.gift/id/concept/JobStatus/scheduled": "scheduled",
  "http://redpencil.data.gift/id/concept/JobStatus/busy": "busy",
  "http://lblod.data.gift/file-download-statuses/ongoing": "ongoing",
  "http://lblod.data.gift/file-download-statuses/ready-to-be-cached": "ready-to-be-cached",
  "http://lblod.data.gift/file-download-statuses/failure": "failure",
};
