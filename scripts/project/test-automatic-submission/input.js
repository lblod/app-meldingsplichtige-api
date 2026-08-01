import readline from "node:readline/promises";
import { STATUS_CONCEPT, STATUS_INZENDBAAR } from "./config.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function dateAt18(dateStr) {
  return dateStr + "T18:00:00.000Z";
}
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

// Collect vendor credentials (prompted or from args) and the submission status.
// All other values use defaults — no prompting.
export async function collectInput(argv, runId) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    // Production guard — this test submits a besluitenlijst into the real flow.
    console.log("");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("!!  WARNING: this script submits a test submission into the   !!");
    console.log("!!  automatic submission flow. It will create real data.      !!");
    console.log("!!  DO NOT run this against a production stack.               !!");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("");
    const safety = (await rl.question("Are you in production? [no] ")).trim().toLowerCase();
    if (safety !== "no" && safety !== "") {
      console.log("Aborting — this script is not safe for production.");
      process.exit(0);
    }

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

    // The API accepts "concept" or "inzendbaar" on POST (see
    // automatic-submission-service/jsonld-input.js). "Inzendbaar" triggers the
    // full chain; validate then promotes the submission to "verstuurd".
    const statusChoice = await promptValidated(
      rl,
      "Status (1=Concept, 2=Inzendbaar)",
      "1",
      (v) => v === "1" || v === "2",
      "enter 1 or 2"
    );

    // Defaults for everything else.
    const today = todayStr();
    return {
      vendorUri,
      vendorKey,
      datumZitting: today,
      datumPublicatie: today,
      titelAgendapunt: "Test agendapunt " + runId,
      titelBesluit: "Test besluit " + runId,
      statusChoice,
    };
  } finally {
    rl.close();
  }
}

export function deriveValues(input, runId, docUriBase) {
  const docUri = docUriBase + runId;
  const zittingGeplandeStart = dateAt18(input.datumZitting);
  const zittingStart = datePlus(input.datumZitting, 18, 5, 0, 0);
  const zittingEnd = datePlus(input.datumZitting, 20, 0, 0, 0);
  const besluitDescription = "Beschrijving van " + input.titelBesluit + ".";
  const submissionStatus =
    input.statusChoice === "1" ? STATUS_CONCEPT : STATUS_INZENDBAAR;
  return {
    docUri,
    zittingGeplandeStart,
    zittingStart,
    zittingEnd,
    besluitDescription,
    besluitTitle: input.titelBesluit,
    agendapuntTitle: input.titelAgendapunt,
    submissionStatus,
  };
}