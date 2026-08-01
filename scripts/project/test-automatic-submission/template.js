import fs from "node:fs";
import {
  BESLUITENLIJST_TYPE,
  ORGAN_IN_TIJD,
  ORGAN_ABSTRACT,
  ORGAN_LABEL,
} from "./config.js";

// Render the template by plain {{PLACEHOLDER}} substitution; assert nothing
// unreplaced remains.
export function renderTemplate(runId, derived, datumPublicatie) {
  const subs = {
    BESLUITENLIJST_TYPE: BESLUITENLIJST_TYPE,
    RUN_ID: runId,
    DOC_URI: derived.docUri,
    ORGAN_IN_TIJD: ORGAN_IN_TIJD,
    ORGAN_ABSTRACT: ORGAN_ABSTRACT,
    ORGAN_LABEL: ORGAN_LABEL,
    DATE_PUBLICATION: datumPublicatie,
    ZITTING_GEPLANDE_START: derived.zittingGeplandeStart,
    ZITTING_START: derived.zittingStart,
    ZITTING_END: derived.zittingEnd,
    AGENDAPUNT_TITLE: derived.agendapuntTitle,
    BESLUIT_TITLE: derived.besluitTitle,
    BESLUIT_DESCRIPTION: derived.besluitDescription,
  };
  const tpl = fs.readFileSync("/script/besluitenlijst.template.html", "utf8");
  let html = tpl;
  for (const [k, v] of Object.entries(subs)) {
    html = html.split("{{" + k + "}}").join(v);
  }
  if (html.indexOf("{{") !== -1) {
    throw new Error("unreplaced {{...}} remains in rendered HTML — check template placeholders");
  }
  return html;
}