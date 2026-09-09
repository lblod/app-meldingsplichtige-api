import readline from "node:readline/promises";
import { sparql } from "./sparql.js";
import { vendorsSearchQuery, eenhedenSearchQuery } from "./queries.js";

async function prompt(reader, label, defaultValue) {
  const suffix = defaultValue === "" || defaultValue == null ? "" : " [" + defaultValue + "]";
  while (true) {
    const raw = (await reader.question(label + suffix + ": ")).trim();
    const value = raw === "" ? defaultValue : raw;
    if (value == null || value === "") {
      console.error("  required, try again");
      continue;
    }
    return value;
  }
}

async function promptValidated(reader, label, defaultValue, isValid, hint) {
  while (true) {
    const raw = (await reader.question(label + " [" + defaultValue + "]: ")).trim();
    const value = raw === "" ? defaultValue : raw;
    if (!isValid(value)) {
      console.error("  " + hint);
      continue;
    }
    return value;
  }
}

async function searchAndPick(reader, label, runSearch) {
  while (true) {
    const search = (await reader.question("search " + label + " by name (or part of it, empty lists the first matches): ")).trim();
    const rows = await sparql(runSearch(search));
    if (rows && rows.error) throw new Error("search failed: " + rows.error);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("  no " + label + " found for '" + search + "', try again");
      continue;
    }
    rows.forEach((row, index) => console.log("[" + (index + 1) + "] " + row.label.value + " (" + row.uri.value + ")"));
    const chosen = rows[Number((await reader.question("pick a number: ")).trim()) - 1];
    if (chosen) return { uri: chosen.uri.value, label: chosen.label.value };
    console.log("  invalid choice, try again");
  }
}

export async function collectInput(argv) {
  const reader = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("!!  WARNING: this script submits a test submission into the   !!");
    console.log("!!  automatic submission flow. It will create real data.      !!");
    console.log("!!  DO NOT run this against a production stack.               !!");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("");
    const safety = (await reader.question("Are you in production? type NO to continue: ")).trim();
    if (safety !== "NO") {
      console.log("Aborting - type NO (CAPS) to confirm you are not in production.");
      process.exit(0);
    }

    let vendorUri;
    if (argv[0]) {
      vendorUri = argv[0];
      console.log("Vendor URI: " + vendorUri + " (from arg)");
    } else {
      const vendor = await searchAndPick(reader, "vendor", (search) => vendorsSearchQuery(search));
      vendorUri = vendor.uri;
      console.log("note: the vendor key (password) will be asked after the bestuurseenheid");
    }

    let eenheidUri;
    if (argv[2]) {
      eenheidUri = argv[2];
      console.log("Bestuurseenheid URI: " + eenheidUri + " (from arg)");
    } else {
      const eenheid = await searchAndPick(
        reader,
        "bestuurseenheid (gemeente, where this vendor can act on behalf of)",
        (search) => eenhedenSearchQuery(vendorUri, search)
      );
      eenheidUri = eenheid.uri;
    }

    let vendorKey;
    if (argv[1]) {
      vendorKey = argv[1];
      console.log("Vendor key: <from arg>");
    } else {
      vendorKey = await prompt(reader, "Vendor key (password)", "");
    }

    let organUri;
    if (argv[3]) {
      organUri = argv[3];
      console.log("Bestuursorgaan (in tijd) URI: " + organUri + " (from arg)");
    }

    const statusChoice = await promptValidated(
      reader,
      "Status (1=Concept, 2=Inzendbaar)",
      "1",
      (value) => value === "1" || value === "2",
      "enter 1 or 2"
    );

    return { vendorUri, vendorKey, statusChoice, eenheidUri, organUri };
  } finally {
    reader.close();
  }
}
