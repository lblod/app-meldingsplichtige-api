import readline from "node:readline/promises";

async function prompt(rl, label, def) {
  const suffix = def === "" || def == null ? "" : " [" + def + "]";
  while (true) {
    const raw = (await rl.question(label + suffix + ": ")).trim();
    const val = raw === "" ? def : raw;
    if (val == null || val === "") {
      console.error("  required, try again");
      continue;
    }
    return val;
  }
}

async function promptValidated(rl, label, def, ok, hint) {
  while (true) {
    const raw = (await rl.question(label + " [" + def + "]: ")).trim();
    const val = raw === "" ? def : raw;
    if (!ok(val)) {
      console.error("  " + hint);
      continue;
    }
    return val;
  }
}

export async function collectInput(argv) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("!!  WARNING: this script submits a test submission into the   !!");
    console.log("!!  automatic submission flow. It will create real data.      !!");
    console.log("!!  DO NOT run this against a production stack.               !!");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("");
    const safety = (await rl.question("Are you in production? [yes/NO] ")).trim();
    if (safety !== "NO" && safety !== "") {
      console.log("Aborting - this script is not safe for production. It's a CAPS NO.");
      process.exit(0);
    }

    let vendorUri, vendorKey;
    if (argv[0]) {
      vendorUri = argv[0];
      console.log("Vendor URI: " + vendorUri + " (from arg)");
    } else {
      vendorUri = await promptValidated(
        rl,
        "Vendor URI",
        "",
        (v) => { try { new URL(v); return true; } catch (e) { return false; } },
        "must be a valid URL"
      );
    }
    if (argv[1]) {
      vendorKey = argv[1];
      console.log("Vendor key: <from arg>");
    } else {
      vendorKey = await prompt(rl, "Vendor key", "");
    }

    const statusChoice = await promptValidated(
      rl,
      "Status (1=Concept, 2=Inzendbaar)",
      "1",
      (v) => v === "1" || v === "2",
      "enter 1 or 2"
    );

    return { vendorUri, vendorKey, statusChoice };
  } finally {
    rl.close();
  }
}
