// Smoke test of the automatic submission flow for gemeente Mechelen.
// See test-automatic-submission/plan.md and implementation-tasks.md.
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import readline from "node:readline/promises";

// ─── CONFIG — single source of truth (implementation-tasks.md §1, verbatim) ───
const ORG_UNIT =
  "http://data.lblod.info/id/bestuurseenheden/be278471a2a318edba32e7ac4294c0eafbe4c8077a34dcbb9c2e43211d4a78a6";
const ORGAN_ABSTRACT =
  "http://data.lblod.info/id/bestuursorganen/06c2b56ed7b49d146337f6db044204f19c34c4242deb3b4e142dbf925d733eda";
const ORGAN_IN_TIJD =
  "http://data.lblod.info/id/bestuursorganen/86af6b8e417005a56d3c2437f6345c4676dfeee1d7162e4f1a2899240b6d0476";
const ORGAN_LABEL = "Gemeenteraad Mechelen";

const BESLUITENLIJST_TYPE =
  "https://data.vlaanderen.be/id/concept/BesluitDocumentType/3fa67785-ffdc-4b30-8880-2b99d97b4dee";

const SPARQL_ENDPOINT = "http://virtuoso:8890/sparql";
const MELDING_ENDPOINT = "http://identifier/melding";

const STATUS_CONCEPT =
  "http://lblod.data.gift/concepts/79a52da4-f491-4e2f-9374-89a13cde8ecd";
const STATUS_INZENDBAAR =
  "http://lblod.data.gift/concepts/f6330856-e261-430f-b949-8e510d20d0ff";
const STATUS_VERSTUURD =
  "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";

const JOB_SCHEDULED = "http://redpencil.data.gift/id/concept/JobStatus/scheduled";
const JOB_BUSY = "http://redpencil.data.gift/id/concept/JobStatus/busy";
const JOB_SUCCESS = "http://redpencil.data.gift/id/concept/JobStatus/success";
const JOB_FAILED = "http://redpencil.data.gift/id/concept/JobStatus/failed";

const DL_READY = "http://lblod.data.gift/file-download-statuses/ready-to-be-cached";
const DL_ONGOING = "http://lblod.data.gift/file-download-statuses/ongoing";
const DL_SUCCESS = "http://lblod.data.gift/file-download-statuses/success";
const DL_FAILURE = "http://lblod.data.gift/file-download-statuses/failure";

const JOB_OPERATION =
  "http://lblod.data.gift/id/jobs/concept/JobOperation/automaticSubmissionFlow";
const TASK_OPS = {
  register: "http://lblod.data.gift/id/jobs/concept/TaskOperation/register",
  download: "http://lblod.data.gift/id/jobs/concept/TaskOperation/download",
  import: "http://lblod.data.gift/id/jobs/concept/TaskOperation/import",
  enrich: "http://lblod.data.gift/id/jobs/concept/TaskOperation/enrich",
  validate: "http://lblod.data.gift/id/jobs/concept/TaskOperation/validate",
  "form-data-generate":
    "http://lblod.data.gift/id/jobs/concept/TaskOperation/form-data-generate",
};

const DOC_URI_BASE = "http://smoke.test.local/besluitenlijsten/";
const PAGE_PORT = 8888;
const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 150000;

// Result file is written into the repo mount so it lands at
// test-automatic-submission/last-run.json (implementation-tasks.md §2 mapping).
const RESULT_FILE = "/data/app/test-automatic-submission/last-run.json";

// ─── helpers ───
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

// SPARQL: POST form-encoded query, return results.bindings (array of
// { var: { type, value } }). Never throws — returns { error } on failure.
async function sparql(query) {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
    },
    body: "query=" + encodeURIComponent(query),
  });
  const text = await res.text();
  if (!res.ok) return { error: "sparql " + res.status + ": " + text };
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { error: "sparql bad json: " + text };
  }
  // ASK query → { boolean: true/false }, no results
  if (typeof json.boolean === "boolean") return { boolean: json.boolean };
  return json.results ? json.results.bindings : [];
}

// postJson: returns { status, body }, never throws on non-2xx.
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    /* keep raw text */
  }
  return { status: res.status, body: parsed };
}

// check collector: { id, label, ok, detail, ms }. Catches throws as ok:false.
const checks = [];
async function check(id, label, fn) {
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

// ─── main ───
let server = null;
const startedAt = nowIso();
const runId = crypto.randomUUID();
// Filled by main(); surfaced here so the finally block can write them.
const runState = {
  input: {},
  generated: {},
  response: {},
  diagnostics: { tasks: [], errors: [] },
};
// ctx holds in-flight values that aren't part of the persisted result.
const ctx = {};

// ─── input (M3.3) ───
// Prompt with a default; enter accepts it. Empty default → required.
async function prompt(rl, label, def) {
  const suffix = def === "" || def == null ? "" : " [" + def + "]";
  while (true) {
    const raw = (await rl.question(label + suffix + ": ")).trim();
    const val = raw === "" ? def : raw;
    if (val == null || val === "") {
      console.error("  required, try again");
      continue;
    }
    return val;
  }
}

// Prompt that must match a predicate; re-prompts on failure with a hint.
async function promptValidated(rl, label, def, ok, hint) {
  while (true) {
    const raw = (await rl.question(label + " [" + def + "]: ")).trim();
    const val = raw === "" ? def : raw;
    if (!ok(val)) {
      console.error("  " + hint);
      continue;
    }
    return val;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
// date at 18:00:00.000Z
function dateAt18(dateStr) {
  return dateStr + "T18:00:00.000Z";
}
// dateStr + HH:MM:SS.sssZ
function datePlus(dateStr, h, m, s, ms) {
  return (
    dateStr +
    "T" +
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0") + "." +
    String(ms).padStart(3, "0") + "Z"
  );
}

async function collectInput(argv) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    // Arguments 1 and 2 (if present) skip the first two prompts.
    let vendorUri, vendorKey;
    if (argv[0]) {
      vendorUri = argv[0];
      console.log("Vendor URI: " + vendorUri + " (from arg)");
    } else {
      vendorUri = await promptValidated(
        rl,
        "Vendor URI",
        "",
        (v) => { try { new URL(v); return true; } catch (e) { return false; } },
        "must be a valid URL"
      );
    }
    if (argv[1]) {
      vendorKey = argv[1];
      console.log("Vendor key: <from arg>");
    } else {
      vendorKey = await prompt(rl, "Vendor key", "");
    }

    const datumZitting = await promptValidated(
      rl,
      "Datum zitting (YYYY-MM-DD)",
      todayStr(),
      (v) => DATE_RE.test(v),
      "use YYYY-MM-DD"
    );
    const datumPublicatie = await promptValidated(
      rl,
      "Datum publicatie (YYYY-MM-DD)",
      todayStr(),
      (v) => DATE_RE.test(v),
      "use YYYY-MM-DD"
    );
    const titelAgendapunt = await prompt(
      rl,
      "Titel agendapunt",
      "Smoke test agendapunt " + runId
    );
    const titelBesluit = await prompt(
      rl,
      "Titel besluit",
      "Smoke test besluit " + runId
    );
    // The vendor chooses the desired outcome. "Verstuurd" is not a valid POST
    // value (the API rejects it) — it's the terminal state the flow produces.
    // So "Verstuurd" intent maps to the only valid POST value that reaches it:
    // Inzendbaar (SUBMITTABLE_STATUS), which triggers the full chain; validate
    // then promotes the submission to Verstuurd. Concept stays Concept.
    const statusChoice = await promptValidated(
      rl,
      "Status (1=Concept, 2=Verstuurd)",
      "1",
      (v) => v === "1" || v === "2",
      "enter 1 or 2"
    );

    return {
      vendorUri,
      vendorKey,
      datumZitting,
      datumPublicatie,
      titelAgendapunt,
      titelBesluit,
      statusChoice,
    };
  } finally {
    rl.close();
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const input = await collectInput(argv);

  // Derived values (implementation-tasks.md §1, M3.3)
  const docUri = DOC_URI_BASE + runId;
  const zittingGeplandeStart = dateAt18(input.datumZitting);
  const zittingStart = datePlus(input.datumZitting, 18, 5, 0, 0);
  const zittingEnd = datePlus(input.datumZitting, 20, 0, 0, 0);
  const besluitDescription = "Beschrijving van " + input.titelBesluit + ".";
  // API accepts only CONCEPT_STATUS or SUBMITTABLE_STATUS (Inzendbaar) on POST
  // (automatic-submission-service/jsonld-input.js:117-118). The user-facing
  // "Verstuurd" intent maps to Inzendbaar (the trigger); the flow then promotes
  // it to Verstuurd via validate-submission-service. Concept stays Concept.
  const submissionStatus =
    input.statusChoice === "1" ? STATUS_CONCEPT : STATUS_INZENDBAAR;

  runState.input = {
    vendorUri: input.vendorUri,
    // vendorKey NEVER written to any file (M3.3)
    organization: ORG_UNIT,
    organInTijd: ORGAN_IN_TIJD,
    organAbstract: ORGAN_ABSTRACT,
    status: input.statusChoice === "1" ? "concept" : "verstuurd",
    datumZitting: input.datumZitting,
    datumPublicatie: input.datumPublicatie,
    titelAgendapunt: input.titelAgendapunt,
    titelBesluit: input.titelBesluit,
  };
  runState.generated = { docUri };

  // Stash derived values on a closure object the later milestones read.
  ctx.derived = {
    vendorKey: input.vendorKey,
    docUri,
    zittingGeplandeStart,
    zittingStart,
    zittingEnd,
    besluitDescription,
    besluitTitle: input.titelBesluit,
    agendapuntTitle: input.titelAgendapunt,
    submissionStatus,
  };

  // ─── render (M3.4) ───
  const subs = {
    BESLUITENLIJST_TYPE: BESLUITENLIJST_TYPE,
    RUN_ID: runId,
    DOC_URI: docUri,
    ORGAN_IN_TIJD: ORGAN_IN_TIJD,
    ORGAN_ABSTRACT: ORGAN_ABSTRACT,
    ORGAN_LABEL: ORGAN_LABEL,
    DATE_PUBLICATION: input.datumPublicatie,
    ZITTING_GEPLANDE_START: zittingGeplandeStart,
    ZITTING_START: zittingStart,
    ZITTING_END: zittingEnd,
    AGENDAPUNT_TITLE: input.titelAgendapunt,
    BESLUIT_TITLE: input.titelBesluit,
    BESLUIT_DESCRIPTION: besluitDescription,
  };
  const tpl = fs.readFileSync("/script/besluitenlijst.template.html", "utf8");
  let html = tpl;
  for (const [k, v] of Object.entries(subs)) {
    html = html.split("{{" + k + "}}").join(v);
  }
  if (html.indexOf("{{") !== -1) {
    throw new Error("unreplaced {{...}} remains in rendered HTML — check template placeholders");
  }
  ctx.html = html;
  runState.generated.html = html;

  // ─── serve (M3.5) ───
  // Pick the single non-internal IPv4. §4.3 depends on exactly one.
  const ipv4s = [];
  for (const [, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs) {
      if (a.family === "IPv4" && !a.internal) ipv4s.push(a.address);
    }
  }
  if (ipv4s.length !== 1) {
    throw new Error(
      "expected exactly 1 non-internal IPv4, found " +
        ipv4s.length +
        " (" + ipv4s.join(", ") + ") — M3.5 self-hosting needs a single network"
    );
  }
  const ownIp = ipv4s[0];
  const pageUrl =
    "http://" + ownIp + ":" + PAGE_PORT + "/besluitenlijst-" + runId + ".html";

  server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise((r) => server.listen(PAGE_PORT, "0.0.0.0", r));

  // Self-fetch to prove the server answers before posting.
  const selfRes = await fetch(pageUrl);
  const selfBody = await selfRes.text();
  if (selfRes.status !== 200) {
    throw new Error("page server self-fetch returned " + selfRes.status + " (expected 200)");
  }
  if (selfBody.indexOf(docUri) === -1) {
    throw new Error("page server self-fetch body does not contain docUri " + docUri);
  }

  ctx.pageUrl = pageUrl;
  runState.generated.pageUrl = pageUrl;

  // ─── post + poll (M3.6) ───
  const pollQuery = (submissionUri, jobUri) => `
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

  const taskDiagnosticQuery = (jobUri) => `
PREFIX adms: <http://www.w3.org/ns/adms#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX oslc: <http://open-services.net/ns/core#>
PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
SELECT ?task ?op ?status ?msg WHERE {
  ?task dct:isPartOf <${jobUri}> ; task:operation ?op ; adms:status ?status .
  OPTIONAL { ?task task:error ?err . ?err oslc:message ?msg }
}`;

  // Mirrors enrich-submission-service/lib/enricher.js:139-170 — only absence
  // is a verdict; bindingEinde does NOT disqualify an organ.
  const organDiagnosticQuery = () => `
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

  const errorGraphQuery = (jobUri, submissionUri) => `
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

  let submissionUri = null;
  let jobUri = null;
  let pollFinal = null;
  let pollTimedOut = false;

  // Check 1 — POST /melding → 201 with uri/submission/job.
  await check(1, "melding accepted", async () => {
    const body = {
      organization: ORG_UNIT,
      href: pageUrl,
      submittedResource: docUri,
      status: ctx.derived.submissionStatus,
      publisher: { uri: runState.input.vendorUri, key: ctx.derived.vendorKey },
    };
    const t0 = Date.now();
    const res = await postJson(MELDING_ENDPOINT, body);
    runState.response = { status: res.status, body: res.body };
    if (res.status !== 201) {
      let detail = "expected 201, got " + res.status;
      if (res.status === 401) {
        detail +=
          " — vendor not authorised: no match for this URI + key + organization in " +
          "GRAPH <http://mu.semte.ch/graphs/automatic-submission> (see §0.1)";
      }
      if (res.status === 400 && res.body && typeof res.body === "object") {
        const b = JSON.stringify(res.body);
        if (b.indexOf("publisher") !== -1) {
          detail +=
            " — 400 mentions 'publisher': check that publisher is an object " +
            "{uri,key}, not a bare string (M3.6)";
        }
      }
      if (res.body) detail += " — body: " + JSON.stringify(res.body);
      throw new Error(detail);
    }
    const b = res.body || {};
    // response.submission and the 201 body's uri are the same value — record once.
    submissionUri = b.submission || b.uri;
    jobUri = b.job;
    runState.response.submission = submissionUri;
    runState.response.job = jobUri;
    if (!submissionUri || !jobUri) {
      throw new Error(
        "201 but missing uri/submission/job: " + JSON.stringify(b)
      );
    }
    return res.status + " — submission " + submissionUri + ", job " + jobUri;
  });

  // Checks 2–5 are meaningless without a job. Skip them if check 1 failed.
  if (checks[checks.length - 1].ok) {
    // Poll until job reaches success/failed or timeout.
    const pollStart = Date.now();
    while (true) {
      const elapsed = Date.now() - pollStart;
      if (elapsed > POLL_TIMEOUT) {
        pollTimedOut = true;
        break;
      }
      const rows = await sparql(pollQuery(submissionUri, jobUri));
      if (rows && rows.error) {
        // transient — keep polling
      } else if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const jobStatus = row.jobStatus ? row.jobStatus.value : null;
        if (jobStatus === JOB_SUCCESS || jobStatus === JOB_FAILED) {
          pollFinal = row;
          break;
        }
      }
      await sleep(POLL_INTERVAL);
    }

    // Collect diagnostics if polling did not reach success.
    if (!pollFinal || pollFinal.jobStatus.value !== JOB_SUCCESS || pollTimedOut) {
      try {
        const tasks = await sparql(taskDiagnosticQuery(jobUri));
        if (Array.isArray(tasks)) runState.diagnostics.tasks = tasks;
      } catch (e) {}
      try {
        const errs = await sparql(errorGraphQuery(jobUri, submissionUri));
        if (Array.isArray(errs)) runState.diagnostics.errors = errs;
      } catch (e) {}
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
        let detail =
          Object.keys(map).length + "/6 present";
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
    // Skipped (not-applicable) when the user chose Concept intent: the flow
    // keeps it Concept, validate never promotes it. The "Verstuurd" intent
    // POSTs Inzendbaar, which the flow promotes to Verstuurd.
    const usedConcept = input.statusChoice === "1";
    if (usedConcept) {
      checks.push({
        id: 5,
        label: "submission sent",
        ok: false,
        detail: "skipped — run used Concept status",
        ms: 0,
      });
    } else {
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
            const found = organs.some(
              (r) => r.organ && r.organ.value === used
            );
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
              diag += " — organ " + used + " is in the concept scheme; " +
                "check the RDFa against M3.1.";
            }
          }
          throw new Error(diag);
        }
        if (!sentDate) throw new Error("Verstuurd but nmo:sentDate is missing");
        if (!formData) throw new Error("Verstuurd but no melding:FormData");
        return "verstuurd, sentDate " + sentDate + ", formData " + formData;
      });
    }
  } else {
    // Check 1 failed — skip checks 2–5 per M3.7.
    for (let id = 2; id <= 5; id++) {
      checks.push({
        id,
        label: ["", "", "publication downloaded", "all tasks succeeded", "job succeeded", "submission sent"][id],
        ok: false,
        detail: "skipped — check 1 did not return 201",
        ms: 0,
      });
    }
  }
}

try {
  await main();
} catch (e) {
  console.error("FATAL: " + (e && e.stack ? e.stack : e));
} finally {
  if (server) try { server.close(); } catch (e) {}
  const passed = checks.filter((c) => c.ok).length;
  const total = 5; // denominator is always 5 — the machine-readable contract
  // M3.2 skeleton: 0 checks registered → vacuous PASS. Real runs need 5/5.
  const verdict = checks.length === 0 || passed === total ? "PASS" : "FAIL";
  const line =
    "SMOKE TEST: " +
    (verdict === "PASS" ? "PASS " : "FAIL ") +
    "(" + passed + "/" + total + " checks)" +
    (verdict === "FAIL" ? " — see test-automatic-submission/last-run.json" : "");
  console.log(line);
  const result = {
    runId,
    startedAt,
    finishedAt: nowIso(),
    durationMs: Date.now() - new Date(startedAt).getTime(),
    verdict,
    input: runState.input,
    generated: runState.generated,
    response: runState.response,
    checks,
    diagnostics: runState.diagnostics,
  };
  try {
    fs.mkdirSync(path.dirname(RESULT_FILE), { recursive: true });
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("could not write result file: " + e.message);
  }
}