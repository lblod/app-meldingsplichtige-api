import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  JAARREKENING_TYPE,
  CKB_BUNDLE_TYPE,
  ADVIES_BESLUIT_TYPE,
  ARTIKELTYPE_GUNSTIG_ADVIES,
  RAPPORTJAAR,
  DOC_URI_BASE,
} from "./config.js";

// mu-scripts mounts this script folder at /script; direct node runs resolve it
// relative to this file, so both work.
const TEMPLATE_BASE = dirname(fileURLToPath(import.meta.url));

// The three annotated RDFa pages follow the harvest-crawler annotation model
// documented on pages-vendors:
//  - document properties: rdf:type + dct:type (document/besluit type),
//    eli:date_publication, eli:passed_by (bestuursorgaan in tijd),
//    eli:is_about (eredienstbestuur), elod:financialYear (rapportjaar)
//  - zitting: isGehoudenDoor organ chain, geplandeStart/started/ended,
//    agendapunt + behandeling van agendapunt + besluit (advice page)
//  - references: CKB document carries dct:relation to the eredienst document,
//    the gemeente artikel carries eli:refers_to + eli:type_document (ArtikelType)

export function renderJaarrekeningPage(runId, organInTijd, organAbstract, organLabel) {
  return renderTemplate(
    "jaarrekening.template.html",
    {
      DOC_URI: DOC_URI_BASE + runId + "-jaarrekening",
      JAARREKENING_TYPE,
      RUN_ID: runId,
      ORGAN_IN_TIJD: organInTijd,
      ORGAN_ABSTRACT: organAbstract,
      ORGAN_LABEL: organLabel,
      DATE_PUBLICATION: today(),
      RAPPORTJAAR,
      ZITTING_GEPLANDE_START: today() + "T16:00:00.000Z",
      ZITTING_START: today() + "T16:05:00.000Z",
      ZITTING_END: today() + "T18:00:00.000Z",
    }
  );
}

export function renderBundlePage(runId, organInTijd, organAbstract, organLabel, eredienstDocument) {
  return renderTemplate(
    "bundel.template.html",
    {
      DOC_URI: DOC_URI_BASE + runId + "-bundel",
      CKB_BUNDLE_TYPE,
      RUN_ID: runId,
      ORGAN_IN_TIJD: organInTijd,
      ORGAN_ABSTRACT: organAbstract,
      ORGAN_LABEL: organLabel,
      DATE_PUBLICATION: today(),
      RAPPORTJAAR,
      ERDIENST_DOCUMENT: eredienstDocument,
      ZITTING_GEPLANDE_START: today() + "T16:00:00.000Z",
      ZITTING_START: today() + "T16:05:00.000Z",
      ZITTING_END: today() + "T18:00:00.000Z",
    }
  );
}

export function renderAdviesPage(serverId, organInTijd, organAbstract, organLabel, kfbOrg, eredienstDocument) {
  return renderTemplate(
    "advies.template.html",
    {
      BESLUIT_URI: DOC_URI_BASE + serverId + "-advies-besluit",
      ADVIES_BESLUIT_TYPE,
      ARTIKELTYPE: ARTIKELTYPE_GUNSTIG_ADVIES,
      RUN_ID: serverId,
      ORGAN_IN_TIJD: organInTijd,
      ORGAN_ABSTRACT: organAbstract,
      ORGAN_LABEL: organLabel,
      DATE_PUBLICATION: today(),
      RAPPORTJAAR,
      KFB_ORG: kfbOrg,
      KFB_NAME: "Kerkfabriek St.-Lambertus van Grobbendonk",
      ERDIENST_DOCUMENT: eredienstDocument,
      ZITTING_GEPLANDE_START: today() + "T16:00:00.000Z",
      ZITTING_START: today() + "T16:05:00.000Z",
      ZITTING_END: today() + "T18:00:00.000Z",
    }
  );
}

async function renderTemplate(filename, values) {
  let html = await readFile(join(TEMPLATE_BASE, filename), "utf8");
  for (const key of Object.keys(values)) {
    html = html.replaceAll("{{" + key + "}}", values[key]);
  }
  return html;
}

function today() {
  const now = new Date();
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}
