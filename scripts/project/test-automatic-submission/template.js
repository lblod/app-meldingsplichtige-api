import fs from "node:fs";
import {
  BESLUITENLIJST_TYPE,
  ORGAN_IN_TIJD,
  ORGAN_ABSTRACT,
  ORGAN_LABEL,
  DOC_URI_BASE,
} from "./config.js";

function todayString() {
  const date = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function toDateTime(dateString, hours, minutes, seconds, milliseconds) {
  return (
    dateString +
    "T" +
    String(hours).padStart(2, "0") + ":" +
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0") + "." +
    String(milliseconds).padStart(3, "0") + "Z"
  );
}

export function renderTemplate(runId) {
  const docUri = DOC_URI_BASE + runId;
  const today = todayString();
  const substitutions = {
    BESLUITENLIJST_TYPE,
    RUN_ID: runId,
    DOC_URI: docUri,
    ORGAN_IN_TIJD,
    ORGAN_ABSTRACT,
    ORGAN_LABEL,
    DATE_PUBLICATION: today,
    ZITTING_GEPLANDE_START: toDateTime(today, 18, 0, 0, 0),
    ZITTING_START: toDateTime(today, 18, 5, 0, 0),
    ZITTING_END: toDateTime(today, 20, 0, 0, 0),
    AGENDAPUNT_TITLE: "Test agendapunt " + runId,
    BESLUIT_TITLE: "Test besluit " + runId,
    BESLUIT_DESCRIPTION: "Beschrijving van Test besluit " + runId + ".",
  };
  const template = fs.readFileSync("/script/besluitenlijst.template.html", "utf8");
  let html = template;
  for (const [placeholder, value] of Object.entries(substitutions)) {
    html = html.split("{{" + placeholder + "}}").join(value);
  }
  if (html.indexOf("{{") !== -1) {
    throw new Error("unreplaced {{...}} remains in rendered HTML - check template placeholders");
  }
  return { html, docUri };
}