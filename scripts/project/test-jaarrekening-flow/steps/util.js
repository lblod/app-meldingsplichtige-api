// Small helpers shared by the step files.

export function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

export function assertFound(message, rows) {
  if (rows && rows.error) throw new Error(message + ": " + rows.error);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(message + " (empty result)");
}
