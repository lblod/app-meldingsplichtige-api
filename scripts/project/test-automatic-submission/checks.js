import {
  ORG_UNIT,
  ORGAN_ABSTRACT,
  ORGAN_IN_TIJD,
  MELDING_ENDPOINT,
  JOB_OPERATION,
  JOB_SUCCESS,
  JOB_FAILED,
  STATUS_VERSTUURD,
  DL_SUCCESS,
  DL_FAILURE,
} from "./config.js";
import { sparql, postJson } from "./sparql.js";

// check collector: { id, label, ok, detail, ms }. Catches throws as ok:false.
export const checks = [];
export async function check(id, label, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    checks.push({ id, label, ok: true, detail: detail || "", ms: Date.now() - t0 });
  } catch (e) {
    checks.push({
      id,
      label,
      ok: false,
      detail: e && e.message ? e.message : String(e),
      ms: Date.now() - t0,
    });
  }
}

export function pushSkippedCheck(id, label, reason) {
  checks.push({ id, label, ok: false, detail: "skipped — " + reason, ms: 0 });
}

const CHECK_LABELS = {
  2: "publication downloaded",
  3: "all tasks succeeded",
  4: "job succeeded",
  5: "submission sent",
};

function pollQuery(submissionUri, jobUri, pageUrl) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX cogs: <http://vocab.deri.ie/cogs#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX melding: <http://lblod.data.gift/vocabularies/automatische-melding/>
PREFIX nmo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nmo#>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT ?dlStatus ?jobStatus ?submissionStatus ?sentDate ?formData
       (GROUP_CONCAT(DISTINCT CONCAT(STR(?taskIndex), "=", STR(?taskStatus)); separator=",") AS ?tasks)
WHERE {
  BIND(<${submissionUri}> AS ?submission)
  ?job a cogs:Job ;
       task:operation <${JOB_OPERATION}> ;
       adms:status ?jobStatus ;
       prov:generated ?submission .
  ?submission adms:status ?submissionStatus .
  OPTIONAL { ?submission nmo:sentDate ?sentDate }
  OPTIONAL { ?submission prov:generated ?formData . ?formData a melding:FormData }
  OPTIONAL { ?task dct:isPartOf ?job ; task:index ?taskIndex ; adms:status ?taskStatus }
  OPTIONAL { ?submission nie:hasPart ?rdo . ?rdo nie:url <${pageUrl}> ; adms:status ?dlStatus }
}
GROUP BY ?dlStatus ?jobStatus ?submissionStatus ?sentDate ?formData`;
}

function taskDiagnosticQuery(jobUri) {
  return `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX oslc: <http://open-services.net/ns/core#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT ?task ?op ?status ?msg WHERE {
  ?task dct:isPartOf <${jobUri}> ; task:operation ?op ; adms:status ?status .
  OPTIONAL { ?task task:error ?err . ?err oslc:message ?msg }
}`;
}

// Mirrors the enricher's own join (only absence is a verdict;
// bindingEinde does NOT disqualify an organ).
function organDiagnosticQuery() {
  return `
PREFIX besluit:  <http://data.vlaanderen.be/ns/besluit#>
PREFIX mandaat: <http://data.vlaanderen.be/ns/mandaat#>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
PREFIX lblodlg: <http://data.lblod.info/vocabularies/leidinggevenden/>
SELECT ?organ ?start ?einde WHERE {
  GRAPH <http://mu.semte.ch/graphs/public> {
    <${ORGAN_ABSTRACT}> besluit:bestuurt <${ORG_UNIT}> ;
                      skos:prefLabel ?abstractLabel ;
                      besluit:classificatie ?classificatie .
    ?classificatie skos:prefLabel ?classificatieLabel .
    <${ORG_UNIT}> besluit:classificatie ?unitClassificatie .
    ?unitClassificatie skos:prefLabel ?unitClassificatieLabel .
    ?organ mandaat:isTijdspecialisatieVan <${ORGAN_ABSTRACT}> ;
           mandaat:bindingStart ?start .
    OPTIONAL { ?organ mandaat:bindingEinde ?einde }
    FILTER NOT EXISTS { ?organ lblodlg:heeftBestuursfunctie ?lg }
  }
}`;
}

function errorGraphQuery(jobUri, submissionUri) {
  return `
PREFIX oslc: <http://open-services.net/ns/core#>
PREFIX dct:  <http://purl.org/dc/terms/>
SELECT ?s ?p ?o ?msg WHERE {
  GRAPH <http://mu.semte.ch/graphs/error> {
    ?s ?p ?o .
    OPTIONAL { ?s oslc:message ?msg }
    FILTER(?s = <${jobUri}> || ?s = <${submissionUri}> ||
           ?o = <${jobUri}> || ?o = <${submissionUri}>)
  }
}`;
}

// Poll the job until it reaches success/failed or timeout. Returns the final
// row plus a timeout flag.
export async function pollJob(submissionUri, jobUri, pageUrl, pollInterval, pollTimeout) {
  const pollStart = Date.now();
  while (true) {
    if (Date.now() - pollStart > pollTimeout) {
      return { pollFinal: null, pollTimedOut: true };
    }
    const rows = await sparql(pollQuery(submissionUri, jobUri, pageUrl));
    if (rows && rows.error) {
      // transient — keep polling
    } else if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      const jobStatus = row.jobStatus ? row.jobStatus.value : null;
      if (jobStatus === JOB_SUCCESS || jobStatus === JOB_FAILED) {
        return { pollFinal: row, pollTimedOut: false };
      }
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
}

export async function collectDiagnostics(jobUri, submissionUri) {
  const diagnostics = { tasks: [], errors: [] };
  try {
    const tasks = await sparql(taskDiagnosticQuery(jobUri));
    if (Array.isArray(tasks)) diagnostics.tasks = tasks;
  } catch (e) {}
  try {
    const errs = await sparql(errorGraphQuery(jobUri, submissionUri));
    if (Array.isArray(errs)) diagnostics.errors = errs;
  } catch (e) {}
  return diagnostics;
}

// Run all 5 checks. Returns { submissionUri, jobUri } on success path.
export async function runChecks(
  runState,
  derived,
  pageUrl,
  input,
  pollInterval,
  pollTimeout
) {
  let submissionUri = null;
  let jobUri = null;

  // Check 1 — POST /melding → 201 with uri/submission/job.
  await check(1, "melding accepted", async () => {
    const body = {
      organization: ORG_UNIT,
      href: pageUrl,
      submittedResource: derived.docUri,
      status: derived.submissionStatus,
      publisher: { uri: runState.input.vendorUri, key: derived.vendorKey },
    };
    const res = await postJson(MELDING_ENDPOINT, body);
    runState.response = { status: res.status, body: res.body };
    if (res.status !== 201) {
      let detail = "expected 201, got " + res.status;
      if (res.status === 401) {
        detail +=
          " — vendor not authorised: no match for this URI + key + organization in " +
          "GRAPH <http://mu.semte.ch/graphs/automatic-submission>";
      }
      if (res.status === 400 && res.body && typeof res.body === "object") {
        const b = JSON.stringify(res.body);
        if (b.indexOf("publisher") !== -1) {
          detail +=
            " — 400 mentions 'publisher': check that publisher is an object " +
            "{uri,key}, not a bare string";
        }
      }
      if (res.body) detail += " — body: " + JSON.stringify(res.body);
      throw new Error(detail);
    }
    const b = res.body || {};
    submissionUri = b.submission || b.uri;
    jobUri = b.job;
    runState.response.submission = submissionUri;
    runState.response.job = jobUri;
    if (!submissionUri || !jobUri) {
      throw new Error("201 but missing uri/submission/job: " + JSON.stringify(b));
    }
    return res.status + " — submission " + submissionUri + ", job " + jobUri;
  });

  // Checks 2–5 are meaningless without a job. Skip them if check 1 failed.
  if (!checks[checks.length - 1].ok) {
    for (let id = 2; id <= 5; id++) {
      pushSkippedCheck(id, CHECK_LABELS[id], "check 1 did not return 201");
    }
    return { submissionUri, jobUri };
  }

  const { pollFinal, pollTimedOut } = await pollJob(
    submissionUri, jobUri, pageUrl, pollInterval, pollTimeout
  );

  // Collect diagnostics if the job did not reach success.
  if (!pollFinal || pollFinal.jobStatus.value !== JOB_SUCCESS || pollTimedOut) {
    runState.diagnostics = await collectDiagnostics(jobUri, submissionUri);
  }

  // Check 2 — RemoteDataObject reached download status success.
  await check(2, "publication downloaded", async () => {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const dl = pollFinal.dlStatus ? pollFinal.dlStatus.value : null;
    if (dl === DL_SUCCESS) return "success";
    if (dl === DL_FAILURE) {
      throw new Error(
        "download-url-service could not fetch " +
          pageUrl +
          " — the script's page server was unreachable"
      );
    }
    throw new Error(
      "download status is " +
        (dl || "<none>") +
        " (expected success); job may not have reached the download step"
    );
  });

  // Check 3 — all 6 task indices 0–5 present and success.
  await check(3, "all tasks succeeded", async () => {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const raw = pollFinal.tasks ? pollFinal.tasks.value : "";
    const map = {};
    if (raw) {
      for (const part of raw.split(",")) {
        const [idx, st] = part.split("=");
        map[idx] = st;
      }
    }
    const opNames = ["register", "download", "import", "enrich", "validate", "form-data-generate"];
    const missing = [];
    const failed = [];
    for (let i = 0; i < 6; i++) {
      const st = map[String(i)];
      if (!st) missing.push(i);
      else if (st !== JOB_SUCCESS) failed.push(i + " (" + opNames[i] + ": " + st + ")");
    }
    if (missing.length || failed.length) {
      let detail = Object.keys(map).length + "/6 present";
      if (missing.length) detail += " — missing: " + missing.join(", ");
      if (failed.length) detail += " — failed: " + failed.join(", ");
      throw new Error(detail);
    }
    return "6/6 success";
  });

  // Check 4 — job reached success.
  await check(4, "job succeeded", async () => {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const js = pollFinal.jobStatus ? pollFinal.jobStatus.value : null;
    if (js === JOB_SUCCESS) return "success";
    throw new Error("job status is " + (js || "<none>") + " (expected success)");
  });

  // Check 5 — submission reached Verstuurd + sentDate + FormData.
  // Skipped (not-applicable) when the user chose Concept: the flow keeps it
  // Concept, validate never promotes it. Inzendbaar triggers the promotion.
  const usedConcept = input.statusChoice === "1";
  if (usedConcept) {
    pushSkippedCheck(5, "submission sent", "run used Concept status");
    return { submissionUri, jobUri };
  }

  await check(5, "submission sent", async () => {
    if (pollTimedOut) throw new Error("timed out before job finished");
    const ss = pollFinal.submissionStatus ? pollFinal.submissionStatus.value : null;
    const sentDate = pollFinal.sentDate ? pollFinal.sentDate.value : null;
    const formData = pollFinal.formData ? pollFinal.formData.value : null;
    if (ss !== STATUS_VERSTUURD) {
      // Most common cause: eli:passed_by points at an organ the enricher
      // never puts in the meta concept scheme. Run the diagnostic.
      let diag = "submission stayed " + (ss || "<none>") + " (expected Verstuurd)";
      let organs = null;
      let diagErr = null;
      try {
        const r = await sparql(organDiagnosticQuery());
        if (r && r.error) {
          diagErr = r.error;
        } else if (Array.isArray(r)) {
          organs = r;
        }
      } catch (e) {
        diagErr = e && e.message ? e.message : String(e);
      }
      if (diagErr) {
        diag += " — organ diagnostic query failed: " + diagErr;
      } else if (organs === null) {
        diag += " — organ diagnostic returned no rows";
      } else {
        const used = ORGAN_IN_TIJD;
        const found = organs.some((r) => r.organ && r.organ.value === used);
        if (!found) {
          diag +=
            " — eli:passed_by points at " + used + ", an organ the enricher " +
            "never puts in the meta concept scheme; validation cannot pass. " +
            "Actual tijdspecialisaties of " + ORGAN_ABSTRACT + ": " +
            (organs.length
              ? organs
                  .map((r) =>
                    r.organ ? r.organ.value + " (start " + (r.start ? r.start.value : "?") + ")" : "?"
                  )
                  .join("; ")
              : "(none)");
        } else {
          diag += " — organ " + used + " is in the concept scheme; check the RDFa template.";
        }
      }
      throw new Error(diag);
    }
    if (!sentDate) throw new Error("Verstuurd but nmo:sentDate is missing");
    if (!formData) throw new Error("Verstuurd but no melding:FormData");
    return "verstuurd, sentDate " + sentDate + ", formData " + formData;
  });

  return { submissionUri, jobUri };
}