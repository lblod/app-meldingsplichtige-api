// STEP 3: vendor B (gemeente Grobbendonk) publishes the gunstig advies.
import { GEMEENTE_ORG, DOC_URI_BASE, KFB_ORG, CLASSIFICATIE_GEMEENTERAAD } from "../config.js";
import { step, logRetry } from "../log.js";
import { resolveOrgan } from "../orgs.js";
import { renderAdviesPage } from "../template.js";
import { verifySelfFetch } from "../server.js";
import { submitMelding, waitVerstuurd } from "../checks.js";
import { vendorLogin, vendorSparql, vendorLogout } from "../vendor.js";
import { gemeenteDiscoveryQuery } from "../queries.js";
import { sleep, assertFound } from "./util.js";

// TODO : the `gemeenteDiscoveryQuery()` as it' stands is going to fail as soon as multple submissions are ther
//  yuo should "look" for the most recent one, related to eredienst you found in previous TODO

// The CKB bundle chain only becomes visible to the gemeente after the
// vendor-data-distribution (erediensten instance) has copied the databank
// org graph into the vendors-erediensten graphs; poll until it surfaces.
export async function step3Advies(ctx, eredienstDocument) {
  step(3, "vendor B (gemeente Grobbendonk) publishes the gunstig advies");

  const cookie = (await vendorLogin(GEMEENTE_ORG, ctx.vendors.b.uri, ctx.vendors.b.key)).cookie;

  let discovery = null;
  const start = Date.now();
  let attempt = 0;
  while (true) {
    discovery = await vendorSparql(cookie, "discovery (gemeente: CKB bundle chain on vendor SPARQL)", gemeenteDiscoveryQuery(KFB_ORG));
    if (Array.isArray(discovery) && discovery.length > 0) break;
    if (discovery && discovery.error) throw new Error("step 3: discovery query failed: " + discovery.error);
    if (Date.now() - start > 300000) {
      throw new Error("step 3: no eredienstDocument found via the CKB bundle chain after 300s (last attempt: " + attempt + ")");
    }
    logRetry(++attempt, "CKB bundle not visible to the gemeente yet", 2000);
    await sleep(2000);
  }
  assertFound("step 3: no eredienstDocument found via the CKB bundle chain", discovery);

  // TODO : this resolution should also go through https://centrale-vindplaats.lblod.info/sparql and should be configurable
  const organGemeente = await resolveOrgan(GEMEENTE_ORG, "gemeente", CLASSIFICATIE_GEMEENTERAAD);
  ctx.pages.set("/advies-" + ctx.runId + ".html",
    await renderAdviesPage(ctx.runId, organGemeente.organInTijd, organGemeente.organAbstract,
      organGemeente.organLabel, KFB_ORG, eredienstDocument));
  await verifySelfFetch(ctx.pageUrls.advies);

  const submission = await submitMelding(
    "step 3", GEMEENTE_ORG, ctx.pageUrls.advies,
    DOC_URI_BASE + ctx.runId + "-advies-besluit",
    ctx.vendors.b.uri, ctx.vendors.b.key
  );
  await waitVerstuurd(cookie, "step 3", submission.submissionUri, ctx.pageUrls.advies);
  await vendorLogout(cookie);
  return { submission };
}
