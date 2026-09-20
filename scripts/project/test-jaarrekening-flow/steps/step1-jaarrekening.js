// STEP 1: vendor A submits the jaarrekening for Kerkfabriek St.-Lambertus.
import { KFB_ORG, DOC_URI_BASE, CLASSIFICATIE_KERKRAAD } from "../config.js";
import { say, step } from "../log.js";
import { resolveOrgan } from "../orgs.js";
import { renderJaarrekeningPage } from "../template.js";
import { verifySelfFetch } from "../server.js";
import { submitMelding, waitVerstuurd } from "../checks.js";
import { vendorLogin, vendorLogout } from "../vendor.js";

// TODO : make this more realistic:
// connect to centrale vindplaats, and first search for eredienst that has
// Kerkfabriek St.-Lambertus van Grobbendonk under label. Just like a vendor would query
// the https://centrale-vindplaats.lblod.info/sparql should be configurable

// TODO : this resolution should also go through https://centrale-vindplaats.lblod.info/sparql and should be configurable
export async function step1Jaarrekening(ctx) {
  step(1, "vendor A submits the jaarrekening for Kerkfabriek St.-Lambertus van Grobbendonk");

  const organKfb = await resolveOrgan(KFB_ORG, "kerkfabriek", CLASSIFICATIE_KERKRAAD);
  const pageKey = "/jaarrekening-" + ctx.runId + ".html";
  ctx.pages.set(pageKey, await renderJaarrekeningPage(
    ctx.runId, organKfb.organInTijd, organKfb.organAbstract, organKfb.organLabel));
  await verifySelfFetch(ctx.pageUrls.jaarrekening);

  const submission = await submitMelding(
    "step 1", KFB_ORG, ctx.pageUrls.jaarrekening,
    DOC_URI_BASE + ctx.runId + "-jaarrekening",
    ctx.vendors.a.uri, ctx.vendors.a.key
  );
  const cookie = (await vendorLogin(KFB_ORG, ctx.vendors.a.uri, ctx.vendors.a.key)).cookie;
  const state = await waitVerstuurd(cookie, "step 1", submission.submissionUri);
  await vendorLogout(cookie);
  const document = state.submissionDocument.value;
  say("SubmissionDocument " + document);
  return { submission, document };
}
