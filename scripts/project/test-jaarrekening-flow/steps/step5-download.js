// STEP 5: vendor A downloads the source document via the mapped URL.
import { say, step } from "../log.js";
import { vendorSparql, vendorDownload, vendorLogout } from "../vendor.js";
import { downloadLinkQuery } from "../queries.js";
import { assertFound } from "./util.js";

export async function step5Download(ctx, jar, cookie) {
  step(5, "vendor A downloads the source document via the mapped URL");

  const fileRows = await vendorSparql(cookie, "download-link lookup (jaarrekening formData on databank vendor graph)", downloadLinkQuery(jar.submission.submissionUri));
  assertFound("step 5: no file with a download link found on the jaarrekening formData", fileRows);

  const rawDownloadLink = fileRows[0].downloadLink.value;
  const hadPrimarySource = fileRows[0].hadPrimarySource ? fileRows[0].hadPrimarySource.value : null;
  // Whatever host the VDDS put on the nie:url, fetch it through the mu-identifier
  // on the docker network; any other host does not resolve from here.
  const downloadLink = rawDownloadLink.replace(
    /^(https?:\/\/[^\/]+)(\/files\/)/, "http://identifier$2");
  say("mapped download link: " + rawDownloadLink + " -> " + downloadLink);
  if (hadPrimarySource) say("hadPrimarySource (original URL): " + hadPrimarySource);

  if (!downloadLink.startsWith("http://identifier/") ||
      !new RegExp("^http://identifier/files/[0-9a-f-]+/download$").test(downloadLink)) {
    throw new Error("step 5: FAIL the download URL was not mapped (expected http://identifier/files/<uuid>/download)");
  }
  if (!hadPrimarySource) {
    throw new Error("step 5: FAIL the original URL was not retained under prov:hadPrimarySource");
  }

  const file = await vendorDownload(cookie, downloadLink);
  if (file.status !== 200) {
    throw new Error("step 5: FAIL the download returned " + file.status);
  }
  say("OK downloaded " + file.size + " bytes (" + file.contentType + ")");
  await vendorLogout(cookie);
  return { downloadLink };
}
