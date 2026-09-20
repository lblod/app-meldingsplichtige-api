import http from "node:http";
import dgram from "node:dgram";
import os from "node:os";
import { PAGE_PORT } from "./config.js";
import { logCommand } from "./log.js";

// Serves every annotated page on the container IP, so other containers
// (download-url-service) can harvest them without JS.

// port 0 (the default is the fixed PAGE_PORT) makes the OS pick an ephemeral
// port, which lets parallel batch runs each use their own server at once.
export async function startPageServer(pages, port = PAGE_PORT) {
  // pages: Map<path, html>
  const server = http.createServer(function (request, response) {
    const path = request.url.replace(/\?.*$/, "");
    const html = pages.get(path);
    if (html) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
    } else {
      response.writeHead(404).end("not found");
    }
  });
  await new Promise((resolve) => server.listen(port, "0.0.0.0", resolve));
  return server;
}

export function pickOwnIp() {
  // Ask the OS which local address a real connection to the identifier
  // endpoint would use, so we bind to the interface other containers can
  // reach us on. Works with any number of networks (mu-scripts joins 1,
  // direct runs may join more).
  const address = outboundAddressTo("identifier", 80);
  const ownIp = address || firstNonInternalIpv4();
  if (!ownIp) {
    throw new Error("could not determine a closable non-internal IPv4 address");
  }
  return ownIp;
}

function outboundAddressTo(host, port) {
  const socket = dgram.createSocket("udp4");
  return new Promise(function (resolve) {
    socket.connect(port, host, function () {
      try { resolve(socket.address().address); } catch (resolveError) { resolve(null); }
      socket.close();
    });
    socket.on("error", function () { resolve(null); });
  });
}

function firstNonInternalIpv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const entry of interfaces[name] || []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return null;
}

export function buildPageUrls(runId, ownIp, port = PAGE_PORT) {
  return {
    jaarrekening: "http://" + ownIp + ":" + port + "/jaarrekening-" + runId + ".html",
    bundel: "http://" + ownIp + ":" + port + "/bundel-" + runId + ".html",
    advies: "http://" + ownIp + ":" + port + "/advies-" + runId + ".html",
  };
}

export async function verifySelfFetch(pageUrl) {
  logCommand("self-fetch check (annotated page served here, page-server endpoint)", "GET", pageUrl);
  const response = await fetch(pageUrl);
  if (response.status !== 200) throw new Error("self-fetch of " + pageUrl + " returned " + response.status);
  const text = await response.text();
  if (!text.includes("<html")) throw new Error("self-fetch of " + pageUrl + " returned unexpected body");
}
