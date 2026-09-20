import readline from "node:readline/promises";
import { VENDOR_A_URI, VENDOR_B_URI } from "./config.js";

// CLI input for the jaarrekening flow, in the same spirit as
// test-automatic-submission/input.js: a production safety gate, and vendor
// keys asked interactively (with vendor name + URI) when not given as args.

async function askVendorKey(reader, label, uri, fromArg) {
  if (fromArg) {
    console.log("Key for " + label + ": <from arg>");
    return fromArg;
  }
  while (true) {
    const key = (await reader.question("Key for " + label + " (" + uri + "): ")).trim();
    if (key) return key;
    console.error("  required, try again");
  }
}

export async function collectInput(args) {
  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("!!  WARNING: this script submits test submissions into the    !!");
    console.log("!!  automatic submission flow. It will create real data.      !!");
    console.log("!!  DO NOT run this against a production stack.               !!");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("");
    const safety = (await reader.question("Are you in production? type NO to continue: ")).trim();
    if (safety !== "NO") {
      console.log("Aborting - type NO (CAPS) to confirm you are not in production.");
      process.exit(0);
    }
    return {
      keyA: await askVendorKey(reader, "vendor A (kerkfabriek + CKB)", VENDOR_A_URI, args.keyA),
      keyB: await askVendorKey(reader, "vendor B (gemeente)", VENDOR_B_URI, args.keyB),
    };
  } finally {
    reader.close();
  }
}
