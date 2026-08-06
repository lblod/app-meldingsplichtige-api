import readline from "node:readline/promises";

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

    let vendorUri, vendorKey;
    if (argv[0]) {
      vendorUri = argv[0];
      console.log("Vendor URI: " + vendorUri + " (from arg)");
    } else {
      vendorUri = await promptValidated(
        reader,
        "Vendor URI",
        "",
        (value) => { try { new URL(value); return true; } catch (error) { return false; } },
        "must be a valid URL"
      );
    }
    if (argv[1]) {
      vendorKey = argv[1];
      console.log("Vendor key: <from arg>");
    } else {
      vendorKey = await prompt(reader, "Vendor key", "");
    }

    const statusChoice = await promptValidated(
      reader,
      "Status (1=Concept, 2=Inzendbaar)",
      "1",
      (value) => value === "1" || value === "2",
      "enter 1 or 2"
    );

    return { vendorUri, vendorKey, statusChoice };
  } finally {
    reader.close();
  }
}