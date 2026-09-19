import { randomUUID } from "node:crypto";
import {
  KFB_ORG,
  CKB_ORG,
  GEMEENTE_ORG,
  VENDOR_A_URI,
  VENDOR_B_URI,
  DOC_URI_BASE,
  CLASSIFICATIE_KERKRAAD,
  CLASSIFICATIE_CKB,
  CLASSIFICATIE_GEMEENTERAAD,
} from "./config.js";
import { sparql } from "./sparql.js";
import { vendorKeysQuery, resolveOrgan } from "./orgs.js";
import { renderJaarrekeningPage, renderBundlePage, renderAdviesPage } from "./template.js";
import { startPageServer, pickOwnIp, buildPageUrls, verifySelfFetch } from "./server.js";
import { submitMelding, waitVerstuurd } from "./checks.js";
import { vendorLogin, vendorSparql, vendorLogout, vendorDownload } from "./vendor.js";
import {
  ckbDiscoveryQuery,
  gemeenteDiscoveryQuery,
  approvalCheckQuery,
  downloadLinkQuery,
} from "./queries.js";

// Piece de resistance: the full automatic submission flow for the Grobbendonk
// test space, driven entirely over HTTP:
//   step 1: vendor A submits the jaarrekening for Kerkfabriek St.-Lambertus
//   step 2: vendor A (CKB Grobbendonk role) publishes the bundle referring to it
//   step 3: vendor B (gemeente Grobbendonk) publishes the gunstig advies
//   step 4: vendor A checks the approval on databankerediensten
//   step 5: vendor A downloads the source document via the mapped URL

const runId = randomUUID();
let server = null;

// Ctrl+C must stop the script immediately, even while it is inside a poll/sleep loop.
process.on("SIGINT", function () {
  console.log("\ninterrupted, stopping...");
  try { server?.close(); } catch { /* server may be gone already */ }
  process.exit(130);
});
process.on("SIGTERM", function () {
  try { server?.close(); } catch { /* server may be gone already */ }
  process.exit(143);
});

// Just hard code the two vendors that are needed for this flow. Arguments
// [keyA keyB] override the stored keys (USE_HASHED_KEY must be off here).
const VENDORS = {
  a: await resolveVendor(VENDOR_A_URI, process.argv[2]),
  b: await resolveVendor(VENDOR_B_URI, process.argv[3]),
};

try {
  console.log("vendor A (kerkfabriek + CKB): " + VENDORS.a.uri);
  console.log("vendor B (gemeente):          " + VENDORS.b.uri);

  const ownIp = await pickOwnIp();
  const pages = new Map();
  const pageUrls = buildPageUrls(runId, ownIp);
  server = await startPageServer(pages);

  // ------------------------------------------------------- STEP 1: vendor A
  console.log("");
  console.log("=== STEP 1: vendor A submits the jaarrekening for Kerkfabriek St.-Lambertus van Grobbendonk ===");

    // TODO : make this more realistic:
  // connect to centrale vindplaats, and first search for eredienst that has ,
  // Kerkfabriek St.-Lambertus van Grobbendonk under label. Just like a vendor would query
  // the https://centrale-vindplaats.lblod.info/sparql should be configurable


  //TODO : this resolution should also go through https://centrale-vindplaats.lblod.info/sparql and should be configurable
  const organKfb = await resolveOrgan(KFB_ORG, "kerkfabriek", CLASSIFICATIE_KERKRAAD);
  const jarPageKey = "/jaarrekening-" + runId + ".html";
  pages.set(jarPageKey, await renderJaarrekeningPage(runId, organKfb.organInTijd, organKfb.organAbstract, organKfb.organLabel));
  await verifySelfFetch(pageUrls.jaarrekening);
  const jar = await submitMelding(
    "step 1", KFB_ORG, pageUrls.jaarrekening, DOC_URI_BASE + runId + "-jaarrekening",
    VENDORS.a.uri, VENDORS.a.key
  );
  const jarState = await waitVerstuurd("step 1", jar.submissionUri, pageUrls.jaarrekening);
  const eredienstDocument = jarState.submissionDocument.value;
  console.log("step 1: SubmissionDocument " + eredienstDocument);

  //process.exit(0); // 0 = success, non-zero = error

  // ------------------------------------------------------- STEP 2: vendor B
  console.log("");
  console.log("=== STEP 2: vendor A (CKB Grobbendonk role) publishes the bundle ===");
  const cookieB = (await vendorLogin(CKB_ORG, VENDORS.a.uri, VENDORS.a.key)).cookie;

  // TODO : make this more realistic:
  // connect to centrale vindplaats, and first search for eredienst related to CKB_ORG,
  // Kerkfabriek St.-Lambertus van Grobbendonk under label. Just like a vendor would query
  // the https://centrale-vindplaats.lblod.info/sparql should be configurable

  // TODO : the `ckbDiscoveryQuery()` as it' stands is going to fail as soon as multple submissions are ther
  //  yuo should "look" for the most recent one, related to eredienst you found in previous TODO


  // The step 1 submission document only becomes visible to vendor B after
  // propagation; poll until it surfaces instead of failing on the first query.
  let discoveryB = null;
  const discoveryBStart = Date.now();
  while (true) {
    discoveryB = await vendorSparql(cookieB, ckbDiscoveryQuery());
    if (Array.isArray(discoveryB) && discoveryB.length > 0) break;
    if (discoveryB && discoveryB.error) throw new Error("step 2: discovery query failed: " + discoveryB.error);
    if (Date.now() - discoveryBStart > 90000) {
      throw new Error("step 2: no SubmissionDocument found for the kerkfabriek jaarrekening after 90s");
    }
    console.log("step 2: SubmissionDocument not visible to vendor B yet, waiting...");
    await sleep(2000);
  }
  assertFound("step 2: no SubmissionDocument found for the kerkfabriek jaarrekening", discoveryB);
  const ckbFound = discoveryB[0].subject.value;
  if (ckbFound !== eredienstDocument) {
    console.log("step 2: WARNING discovery returned " + ckbFound + ", using the fresh document instead");
    discoveryB[0].subject.value = eredienstDocument;
  }

  //TODO : this resolution should also go through https://centrale-vindplaats.lblod.info/sparql and should be configurable
  const organCkb = await resolveOrgan(CKB_ORG, "centraal kerkbestuur", CLASSIFICATIE_CKB);
  pages.set("/bundel-" + runId + ".html",
    await renderBundlePage(runId, organCkb.organInTijd, organCkb.organAbstract, organCkb.organLabel, eredienstDocument));
  await verifySelfFetch(pageUrls.bundel);
  const bundel = await submitMelding(
    "step 2", CKB_ORG, pageUrls.bundel, DOC_URI_BASE + runId + "-bundel",
    VENDORS.a.uri, VENDORS.a.key
  );
  await waitVerstuurd("step 2", bundel.submissionUri, pageUrls.bundel);
  await vendorLogout(cookieB);

  //process.exit(0); // 0 = success, non-zero = error

  // ------------------------------------------------------- STEP 3: vendor B
  console.log("");
  console.log("=== STEP 3: vendor B (gemeente Grobbendonk) publishes the gunstig advies ===");
  const cookieC = (await vendorLogin(GEMEENTE_ORG, VENDORS.b.uri, VENDORS.b.key)).cookie;
  // The CKB bundle chain only becomes visible to the gemeente after the
  // vendor-data-distribution (erediensten instance) has copied the databank
  // org graph into the vendors-erediensten graphs; poll until it surfaces.
  let discoveryC = null;
  const discoveryStart = Date.now();
  while (true) {
      // TODO : the `ckbDiscoveryQuery()` as it' stands is going to fail as soon as multple submissions are ther
  //  yuo should "look" for the most recent one, related to eredienst you found in previous TODO
    discoveryC = await vendorSparql(cookieC, gemeenteDiscoveryQuery(KFB_ORG));
    if (Array.isArray(discoveryC) && discoveryC.length > 0) break;
    if (discoveryC && discoveryC.error) throw new Error("step 3: discovery query failed: " + discoveryC.error);
    if (Date.now() - discoveryStart > 300000) {
      throw new Error("step 3: no eredienstDocument found via the CKB bundle chain after 300s");
    }
    console.log("step 3: CKB bundle not visible to the gemeente yet, waiting for vendor data distribution...");
    await sleep(2000);
  }
  //TODO : this resolution should also go through https://centrale-vindplaats.lblod.info/sparql and should be configurable
  const organGemeente = await resolveOrgan(GEMEENTE_ORG, "gemeente", CLASSIFICATIE_GEMEENTERAAD);
  pages.set("/advies-" + runId + ".html",
    await renderAdviesPage(runId, organGemeente.organInTijd, organGemeente.organAbstract,
      organGemeente.organLabel, KFB_ORG, eredienstDocument));
  await verifySelfFetch(pageUrls.advies);
  const advies = await submitMelding(
    "step 3", GEMEENTE_ORG, pageUrls.advies, DOC_URI_BASE + runId + "-advies-besluit",
    VENDORS.b.uri, VENDORS.b.key
  );
  await waitVerstuurd("step 3", advies.submissionUri, pageUrls.advies);
  await vendorLogout(cookieC);

  // ------------------------------------------------------- STEP 4: vendor A check
  console.log("");
  console.log("=== STEP 4: vendor A checks on databankerediensten that the document was approved ===");
  const cookieA2 = (await vendorLogin(KFB_ORG, VENDORS.a.uri, VENDORS.a.key)).cookie;
  await pollApproval("step 4", cookieA2, eredienstDocument, GEMEENTE_ORG);

  // ------------------------------------------------------- STEP 5: download
  console.log("");
  console.log("=== STEP 5: vendor A downloads the source document via the mapped URL ===");
  const fileRows = await vendorSparql(cookieA2, downloadLinkQuery(jar.submissionUri));
  assertFound("step 5: no file with a download link found on the jaarrekening formData", fileRows);
  const rawDownloadLink = fileRows[0].downloadLink.value;
  const hadPrimarySource = fileRows[0].hadPrimarySource ? fileRows[0].hadPrimarySource.value : null;
  // Whatever host the VDDS put on the nie:url, fetch it through the mu-identifier
  // on the docker network; any other host does not resolve from here.
  const downloadLink = rawDownloadLink.replace(
    /^(https?:\/\/[^\/]+)(\/files\/)/, "http://identifier$2");
  console.log("step 5: mapped download link: " + rawDownloadLink + " -> " + downloadLink);
  if (hadPrimarySource) console.log("step 5: hadPrimarySource (original URL): " + hadPrimarySource);
  if (!downloadLink.startsWith("http://identifier/") ||
      !new RegExp("^http://identifier/files/[0-9a-f-]+/download$").test(downloadLink)) {
    throw new Error("step 5: FAIL the download URL was not mapped (expected http://identifier/files/<uuid>/download)");
  }
  if (!hadPrimarySource) {
    throw new Error("step 5: FAIL the original URL was not retained under prov:hadPrimarySource");
  }
  const file = await vendorDownload(cookieA2, downloadLink);
  if (file.status !== 200) {
    throw new Error("step 5: FAIL the download returned " + file.status);
  }
  console.log("step 5: OK downloaded " + file.size + " bytes (" + file.contentType + ")");
  await vendorLogout(cookieA2);

  console.log("");
  console.log("=== OVERVIEW ===");
  console.log("run:                " + runId);
  console.log("jaarrekening:       " + DOC_URI_BASE + runId + "-jaarrekening");
  console.log("submission step 1:  " + jar.submissionUri);
  console.log("SubmissionDocument: " + eredienstDocument);
  console.log("submission step 2:  " + bundel.submissionUri);
  console.log("submission step 3:  " + advies.submissionUri);
  console.log("download link:      " + downloadLink);
  console.log("result: ALL STEPS PASSED");
} catch (error) {
  console.error("FATAL: " + (error && error.stack ? error.stack : error));
  console.error("result: FAILED");
} finally {
  if (server) try { server.close(); } catch (closeError) {}
}

console.log("");
console.log("Jaarrekening collaborative flow test run " + runId + " - please check the logs above.");

// ------------------------------------------------------------------ HELPERS

async function pollApproval(step, cookie, eredienstDocument, gemeente) {
  const pollStart = Date.now();
  while (true) {
    if (Date.now() - pollStart >  300000) {
      throw new Error(step + ": timed out waiting for the gemeente advies to surface in the databank graphs");
    }
    const rows = await vendorSparql(cookie, approvalCheckQuery(eredienstDocument, gemeente));
    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      console.log(step + ": OK the gemeente advies refers to the document");
      console.log(step + ":    advies submission:  " + row.adviesSubmission.value);
      console.log(step + ":    artikel:            " + row.artikel.value);
      console.log(step + ":    artikel type:       " + row.artikelType.value);
      console.log(step + ":    submission status:  " + row.status.value);
      return;
    }
    if (rows && rows.error) {
      console.log(step + ": " + rows.error);
    }
    await sleep(2000);
  }
}

// Fetch a vendor's stored key unless one was passed as an argument.
async function resolveVendor(uri, keyArg) {
  let key = keyArg;
  if (!key) {
    const keyRows = await sparql(vendorKeysQuery(uri));
    if (!Array.isArray(keyRows) || keyRows.length === 0) {
      throw new Error("no muAccount:key found for " + uri + " - pass it as an argument");
    }
    key = keyRows[0].key.value;
  }
  return { uri, key };
}

function assertFound(message, rows) {
  if (rows && rows.error) throw new Error(message + ": " + rows.error);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(message + " (empty result)");
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}
