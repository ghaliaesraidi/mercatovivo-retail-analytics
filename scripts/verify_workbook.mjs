import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const workbookPath = path.join(projectRoot, "workbook", "data_audit_starter.xlsx");
const assetsDir = path.join(projectRoot, "assets");

await fs.mkdir(assetsDir, { recursive: true });
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

const summary = await workbook.inspect({
  kind: "workbook,sheet,table,formula",
  maxChars: 12000,
  tableMaxRows: 8,
  tableMaxCols: 9,
  tableMaxCellChars: 100,
});
await fs.writeFile(path.join(assetsDir, "workbook_inspection.ndjson"), `${summary.ndjson}\n`, "utf8");

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
await fs.writeFile(path.join(assetsDir, "formula_error_scan.ndjson"), `${errors.ndjson}\n`, "utf8");

for (const [sheetName, filename] of [
  ["START_HERE", "workbook_start_here.png"],
  ["AUDIT_LOG", "workbook_audit_log.png"],
]) {
  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(path.join(assetsDir, filename), new Uint8Array(await preview.arrayBuffer()));
}

console.log(summary.ndjson);
console.log(errors.ndjson || "No formula errors found.");
