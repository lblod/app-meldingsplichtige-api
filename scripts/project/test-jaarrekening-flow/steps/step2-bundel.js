// STEP 2: vendor A (CKB Grobbendonk role) publishes the bundle referring to
// the kerkfabriek jaarrekening.
import { CKB_ORG, DOC_URI_BASE, CLASSIFICATIE_CKB } from "../config.js";
import { say, step, logRetry } from "../log.js";
import { resolveOrgan } from "../orgs.js";
import { renderBundlePage } from "../template.js";
import { verifySelfFetch } from "../server.js";
import { submitMelding, waitVerstuurd } from "../checks.js";
import { vendorLogin, vendorSparql, vendorLogout } from "../vendor.js";
import { ckbDiscoveryQuery } from "../queries.js";
import { sleep, assertFound } from "./util.js";

// TODO : make this more realistic:
// connect to centrale vindplaats, and first search for eredienst related to CKB_ORG,
// Kerkfabriek St.-Lambertus van Grobbendonk under label. Just like a vendor would query
// the https://centrale-vindplaats.lblod.info/sparql should be configurable

// TODO : the `ckbDiscoveryQuery()` as it' stands is going to fail as soon as multple submissions are ther
//  yuo should "look" for the most recent one, related to eredienst you found in previous TODO

// TODO : this resolution should also go through https://centrale-vindplaats.lblod.info/sparql and should be configurable

// The step 1 submission document only becomes visible to vendor B after
// propagation; poll until it surfaces instead of failing on the first query.
export async function step2Bundel(ctx, eredienstDocument) {
  step(2, "vendor A (CKB Grobbendonk role) publishes the bundle");

  const cookie = (await vendorLogin(CKB_ORG, ctx.vendors.a.uri, ctx.vendors.a.key)).cookie;

  let discovery = null;
  const start = Date.now();
  let attempt = 0;
  while (true) {
    discovery = await vendorSparql(cookie, "discovery (CKB: kerkfabriek jaarrekening on vendor SPARQL)", ckbDiscoveryQuery());
    if (Array.isArray(discovery) && discovery.length > 0) break;
    if (discovery && discovery.error) throw new Error("step 2: discovery query failed: " + discovery.error);
    if (Date.now() - start > 90000) {
      throw new Error("step 2: no SubmissionDocument found for the kerkfabriek jaarrekening after 90s (last attempt: " + attempt + ")");
    }
    logRetry(++attempt, "SubmissionDocument not visible to vendor B yet", 2000);
    await sleep(2000);
  }
  assertFound("step 2: no SubmissionDocument found for the kerkfabriek jaarrekening", discovery);

  const found = discovery[0].subject.value;
  if (found !== eredienstDocument) {
    say("WARNING discovery returned " + found + ", using the fresh document instead");
    discovery[0].subject.value = eredienstDocument;
  }

  const organCkb = await resolveOrgan(CKB_ORG, "centraal kerkbestuur", CLASSIFICATIE_CKB);
  ctx.pages.set("/bundel-" + ctx.runId + ".html",
    await renderBundlePage(ctx.runId, organCkb.organInTijd, organCkb.organAbstract,
      organCkb.organLabel, eredienstDocument));
  await verifySelfFetch(ctx.pageUrls.bundel);

  const submission = await submitMelding(
    "step 2", CKB_ORG, ctx.pageUrls.bundel,
    DOC_URI_BASE + ctx.runId + "-bundel",
    ctx.vendors.a.uri, ctx.vendors.a.key
  );
  await waitVerstuurd("step 2", submission.submissionUri, ctx.pageUrls.bundel);
  await vendorLogout(cookie);
  return { submission };
}
