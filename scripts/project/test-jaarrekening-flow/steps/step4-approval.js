// STEP 4: vendor A checks on databankerediensten that the gemeente advies
// was approved and refers to the eredienst document.
import { GEMEENTE_ORG, KFB_ORG } from "../config.js";
import { say, step, logRetry } from "../log.js";
import { vendorLogin, vendorSparql } from "../vendor.js";
import { approvalCheckQuery } from "../queries.js";
import { sleep } from "./util.js";

export async function step4Approval(ctx, eredienstDocument) {
  step(4, "vendor A checks on databankerediensten that the document was approved");

  const cookie = (await vendorLogin(KFB_ORG, ctx.vendors.a.uri, ctx.vendors.a.key)).cookie;
  await pollApproval("step 4", cookie, eredienstDocument, GEMEENTE_ORG);
  return { cookie };
}

async function pollApproval(stepName, cookie, eredienstDocument, gemeente) {
  const start = Date.now();
  let attempt = 0;
  while (true) {
    if (Date.now() - start > 300000) {
      throw new Error(stepName + ": timed out waiting for the gemeente advies to surface in the databank graphs (last attempt: " + attempt + ")");
    }
    const rows = await vendorSparql(cookie, "approval-check (gemeente advies on databank vendor graph)", approvalCheckQuery(eredienstDocument, gemeente));
    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      say("OK the gemeente advies refers to the document");
      say("  advies submission:  " + row.adviesSubmission.value);
      say("  artikel:            " + row.artikel.value);
      say("  artikel type:       " + row.artikelType.value);
      say("  submission status:  " + row.status.value);
      return;
    }
    if (rows && rows.error) {
      say(rows.error);
    }
    logRetry(++attempt, "gemeente advies not visible yet", 2000);
    await sleep(2000);
  }
}
