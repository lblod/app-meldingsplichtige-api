import fs from "node:fs";
import path from "node:path";

// vendor-data-distribution copies submissions to the vendor graph in batches,
// every PROCESSING_INTERVAL ms (VDDS default: 300000 = 5 minutes). The interval
// is configured as an environment variable on the service in
// docker-compose.yml / docker-compose.override.yml. The mu script container
// mounts the repo at /data/app (see scripts/project/config.json), so those
// files can be read from there to know how long distribution can lag.

const SERVICE = "vendor-data-distribution";
const KEY = "PROCESSING_INTERVAL";
const DEFAULT_INTERVAL = 300000;
const COMPOSE_ROOTS = ["/data/app", process.cwd()];
const COMPOSE_FILES = ["docker-compose.yml", "docker-compose.override.yml"];

function composeFiles() {
  for (const root of COMPOSE_ROOTS) {
    const files = COMPOSE_FILES.map((name) => path.join(root, name)).filter((file) => fs.existsSync(file));
    if (files.length > 0) return { files, root };
  }
  return { files: [], root: null };
}

function cleanValue(raw) {
  let value = raw.trim();
  const quoted = value.match(/^(['"])(.*)\1$/);
  if (quoted) return quoted[2].trim();
  const hashIndex = value.indexOf(" #");
  if (hashIndex !== -1) value = value.slice(0, hashIndex);
  return value.trim();
}

// Line-based scan for the service's environment block, tolerant of the mapping
// form (KEY: value) and the list form (- KEY=value). Later files (the override)
// win, like a real compose merge.
function scanServiceEnvironment(lines, serviceName) {
  const entries = {};
  let inService = false;
  let inEnvironment = false;
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    if (indent <= 2) {
      inService = indent === 2 && stripped === serviceName + ":";
      inEnvironment = false;
      continue;
    }
    if (!inService) continue;
    if (indent === 4) {
      inEnvironment = stripped === "environment:";
      continue;
    }
    if (!inEnvironment) continue;
    const mapMatch = stripped.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (mapMatch) entries[mapMatch[1]] = cleanValue(mapMatch[2]);
    const listMatch = stripped.match(/^-\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (listMatch) entries[listMatch[1]] = cleanValue(listMatch[2]);
  }
  return entries;
}

export function readProcessingInterval() {
  const { files, root } = composeFiles();
  let intervalMs = null;
  let source = KEY + " not set in " + (root ? path.join(root, "docker-compose*.yml") : "docker-compose*.yml");
  for (const file of files) {
    const entries = scanServiceEnvironment(fs.readFileSync(file, "utf8").split(/\r?\n/), SERVICE);
    if (entries[KEY] != null) {
      const parsed = Number(entries[KEY]);
      if (Number.isFinite(parsed) && parsed > 0) {
        intervalMs = parsed;
        source = path.basename(file) + " (" + KEY + ")";
      }
    }
  }
  if (intervalMs == null) intervalMs = DEFAULT_INTERVAL;
  return { intervalMs, source };
}
