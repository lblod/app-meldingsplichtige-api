export const ORG_UNIT =
  "http://data.lblod.info/id/bestuurseenheden/be278471a2a318edba32e7ac4294c0eafbe4c8077a34dcbb9c2e43211d4a78a6";
export const ORGAN_ABSTRACT =
  "http://data.lblod.info/id/bestuursorganen/06c2b56ed7b49d146337f6db044204f19c34c4242deb3b4e142dbf925d733eda";
export const ORGAN_IN_TIJD =
  "http://data.lblod.info/id/bestuursorganen/86af6b8e417005a56d3c2437f6345c4676dfeee1d7162e4f1a2899240b6d0476";
export const ORGAN_LABEL = "Gemeenteraad Mechelen";

export const BESLUITENLIJST_TYPE =
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/3fa67785-ffdc-4b30-8880-2b99d97b4dee";

export const EENHEID_CLASSIFICATIE_GEMEENTE =
  "http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/5ab0e9b8a3b2ca7c5e000001";
export const ORGAAN_CLASSIFICATIE_GEMEENTERAAD =
  "http://data.vlaanderen.be/id/concept/BestuursorgaanClassificatieCode/5ab0e9b8a3b2ca7c5e000005";

export const SPARQL_ENDPOINT = "http://virtuoso:8890/sparql";
export const MELDING_ENDPOINT = "http://identifier/melding";

export const VENDOR_LOGIN_ENDPOINT = "http://identifier/vendor/login";
export const VENDOR_SPARQL_ENDPOINT = "http://identifier/vendor/sparql";
export const VENDOR_LOGOUT_ENDPOINT = "http://identifier/vendor/logout";

export const STATUS_CONCEPT =
  "http://lblod.data.gift/concepts/79a52da4-f491-4e2f-9374-89a13cde8ecd";
export const STATUS_INZENDBAAR =
  "http://lblod.data.gift/concepts/f6330856-e261-430f-b949-8e510d20d0ff";
export const STATUS_VERSTUURD =
  "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";

export const JOB_SUCCESS = "http://redpencil.data.gift/id/concept/JobStatus/success";
export const JOB_FAILED = "http://redpencil.data.gift/id/concept/JobStatus/failed";

export const DL_SUCCESS = "http://lblod.data.gift/file-download-statuses/success";
export const DL_FAILURE = "http://lblod.data.gift/file-download-statuses/failure";

export const JOB_OPERATION =
  "http://lblod.data.gift/id/jobs/concept/JobOperation/automaticSubmissionFlow";

export const TASK_REGISTER = "http://lblod.data.gift/id/jobs/concept/TaskOperation/register";
export const TASK_DOWNLOAD = "http://lblod.data.gift/id/jobs/concept/TaskOperation/download";
export const TASK_IMPORT = "http://lblod.data.gift/id/jobs/concept/TaskOperation/import";
export const TASK_ENRICH = "http://lblod.data.gift/id/jobs/concept/TaskOperation/enrich";
export const TASK_VALIDATE = "http://lblod.data.gift/id/jobs/concept/TaskOperation/validate";
export const TASK_FORM_DATA_GENERATE = "http://lblod.data.gift/id/jobs/concept/TaskOperation/form-data-generate";

export const TASK_OPS = [
  TASK_REGISTER,
  TASK_DOWNLOAD,
  TASK_IMPORT,
  TASK_ENRICH,
  TASK_VALIDATE,
  TASK_FORM_DATA_GENERATE,
];

export const LABELS = {
  [JOB_SUCCESS]: "success",
  [JOB_FAILED]: "failed",
  [STATUS_CONCEPT]: "concept",
  [STATUS_INZENDBAAR]: "inzendbaar",
  [STATUS_VERSTUURD]: "verstuurd",
  [DL_SUCCESS]: "success",
  [DL_FAILURE]: "failure",
  [JOB_OPERATION]: "automaticSubmissionFlow",
  [TASK_REGISTER]: "register",
  [TASK_DOWNLOAD]: "download",
  [TASK_IMPORT]: "import",
  [TASK_ENRICH]: "enrich",
  [TASK_VALIDATE]: "validate",
  [TASK_FORM_DATA_GENERATE]: "form-data-generate",
  "http://redpencil.data.gift/id/concept/JobStatus/scheduled": "scheduled",
  "http://redpencil.data.gift/id/concept/JobStatus/busy": "busy",
  "http://lblod.data.gift/file-download-statuses/ready-to-be-cached": "ready-to-be-cached",
  "http://lblod.data.gift/file-download-statuses/ongoing": "ongoing",
};

export const DOC_URI_BASE = "http://test.local/besluitenlijsten/";
export const PAGE_PORT = 8888;
export const POLL_INTERVAL = 2000;
export const POLL_TIMEOUT = 150000;
export const VENDOR_POLL_TIMEOUT = 120000;
export const TOTAL_CHECKS = 8;