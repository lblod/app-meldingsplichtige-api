import http from "node:http";
import os from "node:os";
import { PAGE_PORT } from "./config.js";

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