import fs from "node:fs";
import {
  BESLUITENLIJST_TYPE,
  ORGAN_IN_TIJD,
  ORGAN_ABSTRACT,
  ORGAN_LABEL,
  DOC_URI_BASE,
} from "./config.js";

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

function dateTime(dateStr, h, m, s, ms) {
  return (
    dateStr +
    "T" +
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0") + "." +
    String(ms).padStart(3, "0") + "Z"
  );
}

export function renderTemplate(runId) {
  const docUri = DOC_URI_BASE + runId;
  const today = todayStr();
  const subs = {
    BESLUITENLIJST_TYPE,
    RUN_ID: runId,
    DOC_URI: docUri,
    ORGAN_IN_TIJD,
    ORGAN_ABSTRACT,
    ORGAN_LABEL,
    DATE_PUBLICATION: today,
    ZITTING_GEPLANDE_START: dateTime(today, 18, 0, 0, 0),
    ZITTING_START: dateTime(today, 18, 5, 0, 0),
    ZITTING_END: dateTime(today, 20, 0, 0, 0),
    AGENDAPUNT_TITLE: "Test agendapunt " + runId,
    BESLUIT_TITLE: "Test besluit " + runId,
    BESLUIT_DESCRIPTION: "Beschrijving van Test besluit " + runId + ".",
  };
  const tpl = fs.readFileSync("/script/besluitenlijst.template.html", "utf8");
  let html = tpl;
  for (const [k, v] of Object.entries(subs)) {
    html = html.split("{{" + k + "}}").join(v);
  }
  if (html.indexOf("{{") !== -1) {
    throw new Error("unreplaced {{...}} remains in rendered HTML - check template placeholders");
  }
  return { html, docUri };
}