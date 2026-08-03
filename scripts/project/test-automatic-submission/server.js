import http from "node:http";
import os from "node:os";
import { PAGE_PORT } from "./config.js";

// The automatic submission flow starts with POST /melding pointing at a public
// URL. download-url-service then fetches that URL and harvests the RDFa inside.
// For a test we don't have a real publication server, so this container serves
// the rendered besluitenlijst HTML on its own IP and hands that URL to the flow.
// The URL must be reachable from other containers on the same docker network,
// hence we bind 0.0.0.0 and use the container's non-internal IPv4 (not localhost).

function pickOwnIp() {
  const ipv4s = [];
  for (const [, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs) {
      if (a.family === "IPv4" && !a.internal) ipv4s.push(a.address);
    }
  }
  if (ipv4s.length !== 1) {
    throw new Error(
      "expected exactly 1 non-internal IPv4, found " +
        ipv4s.length +
        " (" + ipv4s.join(", ") + ") - self-hosting needs a single network"
    );
  }
  return ipv4s[0];
}

export async function startPageServer(html, docUri, runId) {
  const ownIp = pickOwnIp();
  const pageUrl =
    "http://" + ownIp + ":" + PAGE_PORT + "/besluitenlijst-" + runId + ".html";

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise((r) => server.listen(PAGE_PORT, "0.0.0.0", r));

  // Self-fetch before returning: confirms the page is actually reachable at
  // the URL we're about to hand to download-url-service, and that the rendered
  // HTML contains the docUri we expect. Catches wiring mistakes early instead
  // of letting the job time out ~96s into the download step.
  const selfRes = await fetch(pageUrl);
  const selfBody = await selfRes.text();
  if (selfRes.status !== 200) {
    throw new Error("page server self-fetch returned " + selfRes.status + " (expected 200)");
  }
  if (selfBody.indexOf(docUri) === -1) {
    throw new Error("page server self-fetch body does not contain docUri " + docUri);
  }
  return { server, pageUrl };
}