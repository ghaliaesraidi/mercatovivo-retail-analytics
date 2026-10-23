import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = JSON.parse(await fs.readFile(path.join(root, "output", "analysis_results.json"), "utf8"));

const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const euro = (value) => `€${(value / 1000).toFixed(1)}K`;
const pct = (value, places = 1) => `${(value * 100).toFixed(places)}%`;
const monthLabel = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleString("en", {month: "short", timeZone: "UTC"});

const monthly = results.by_month;
const salesMin = Math.min(...monthly.map((row) => row.net_sales_eur));
const salesMax = Math.max(...monthly.map((row) => row.net_sales_eur));
const chartX = 90;
const chartY = 335;
const chartW = 850;
const chartH = 180;
const points = monthly.map((row, index) => {
  const x = chartX + (index / (monthly.length - 1)) * chartW;
  const y = chartY + chartH - ((row.net_sales_eur - salesMin) / (salesMax - salesMin)) * chartH;
  return {x, y, ...row};
});
const linePath = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
const areaPath = `${linePath} L${points.at(-1).x.toFixed(1)},${(chartY + chartH).toFixed(1)} L${points[0].x.toFixed(1)},${(chartY + chartH).toFixed(1)} Z`;

const targetRows = results.target_summary;
const varianceScale = 2200;
const varianceZeroX = 1390;
const categoryRows = [...results.by_category].sort((a, b) => a.gross_margin_pct - b.gross_margin_pct);
const catMin = 0.38;
const catMax = 0.58;
const catBarX = 280;
const catBarW = 430;

const cards = [
  ["Net sales", euro(results.overall.net_sales_eur), "clean extract"],
  ["Gross profit", euro(results.overall.gross_profit_eur), "after product cost"],
  ["Gross margin", pct(results.overall.gross_margin_pct), "chain total"],
  ["Transactions", results.overall.transactions.toLocaleString("en"), `€${results.overall.average_basket_eur.toFixed(2)} avg basket`],
];

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">MercatoVivo Sicilia validated portfolio dashboard</title>
  <desc id="desc">A static dashboard preview showing 2025 sales, margin, store target variance, category margin and key recommendations after documented data cleaning.</desc>
  <defs>
    <linearGradient id="header" x1="0" x2="1"><stop offset="0" stop-color="#17324d"/><stop offset="1" stop-color="#0d5960"/></linearGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14a39a" stop-opacity=".28"/><stop offset="1" stop-color="#14a39a" stop-opacity=".02"/></linearGradient>
    <style>
      text{font-family:Inter,Segoe UI,Arial,sans-serif;fill:#17324d}.small{font-size:16px;fill:#607286}.label{font-size:18px;font-weight:600}.section{font-size:22px;font-weight:700}.kpi{font-size:36px;font-weight:750}.white{fill:#fff}.muted{fill:#9fb2c4}.grid{stroke:#dce5eb;stroke-width:1}.panel{fill:#fff;stroke:#e0e8ed;stroke-width:1}.good{fill:#16856f}.bad{fill:#c4544d}.teal{fill:#128078}.navy{fill:#17324d}
    </style>
  </defs>
  <rect width="1600" height="1000" fill="#f4f7f9"/>
  <rect width="1600" height="92" fill="url(#header)"/>
  <text x="52" y="42" class="white" font-size="29" font-weight="750">MercatoVivo Sicilia</text>
  <text x="52" y="70" class="muted" font-size="16">2025 retail performance • validated analytical preview</text>
  <text x="1548" y="50" class="white" text-anchor="end" font-size="17">Synthetic portfolio case</text>

  ${cards.map((card, index) => {
    const x = 50 + index * 385;
    return `<g><rect x="${x + 2}" y="122" width="355" height="118" rx="12" fill="#dce5eb" opacity=".55"/><rect x="${x}" y="118" width="355" height="118" rx="12" class="panel"/><rect x="${x}" y="118" width="7" height="118" rx="3" fill="#14a39a"/><text x="${x + 28}" y="151" class="small">${esc(card[0])}</text><text x="${x + 28}" y="195" class="kpi">${esc(card[1])}</text><text x="${x + 28}" y="219" class="small">${esc(card[2])}</text></g>`;
  }).join("\n  ")}

  <rect x="50" y="266" width="930" height="306" rx="14" class="panel"/>
  <text x="78" y="302" class="section">Monthly net sales</text>
  <text x="78" y="325" class="small">Peak: Aug ${euro(Math.max(...monthly.map((row) => row.net_sales_eur)))} • Low: Feb ${euro(Math.min(...monthly.map((row) => row.net_sales_eur)))}</text>
  ${[0, 0.5, 1].map((ratio) => {
    const y = chartY + chartH - ratio * chartH;
    const value = salesMin + ratio * (salesMax - salesMin);
    return `<line x1="${chartX}" y1="${y}" x2="${chartX + chartW}" y2="${y}" class="grid"/><text x="${chartX - 12}" y="${y + 5}" class="small" text-anchor="end">${euro(value)}</text>`;
  }).join("\n  ")}
  <path d="${areaPath}" fill="url(#area)"/>
  <path d="${linePath}" fill="none" stroke="#128078" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#fff" stroke="#128078" stroke-width="3"/><text x="${point.x}" y="${chartY + chartH + 27}" class="small" text-anchor="middle">${monthLabel(point.month)}</text>`).join("\n  ")}

  <rect x="1010" y="266" width="540" height="306" rx="14" class="panel"/>
  <text x="1038" y="302" class="section">Sales versus annual target</text>
  <text x="1038" y="325" class="small">Variance after cleaning</text>
  <line x1="${varianceZeroX}" y1="344" x2="${varianceZeroX}" y2="540" stroke="#93a6b5" stroke-width="2"/>
  ${targetRows.map((row, index) => {
    const y = 357 + index * 39;
    const width = Math.abs(row.variance_pct) * varianceScale;
    const x = row.variance_pct < 0 ? varianceZeroX - width : varianceZeroX;
    const color = row.variance_pct < 0 ? "#c4544d" : "#16856f";
    return `<text x="1038" y="${y + 16}" class="small">${esc(row.store_name.replace("MercatoVivo ", ""))}</text><rect x="${x}" y="${y}" width="${width}" height="22" rx="4" fill="${color}"/><text x="${row.variance_pct < 0 ? x - 8 : x + width + 8}" y="${y + 16}" font-size="15" font-weight="700" text-anchor="${row.variance_pct < 0 ? "end" : "start"}" fill="${color}">${row.variance_pct >= 0 ? "+" : ""}${pct(row.variance_pct)}</text>`;
  }).join("\n  ")}

  <rect x="50" y="602" width="740" height="338" rx="14" class="panel"/>
  <text x="78" y="640" class="section">Gross margin by category</text>
  <text x="78" y="664" class="small">Chain margin: ${pct(results.overall.gross_margin_pct)}</text>
  ${categoryRows.map((row, index) => {
    const y = 690 + index * 25;
    const width = ((row.gross_margin_pct - catMin) / (catMax - catMin)) * catBarW;
    const chainX = catBarX + ((results.overall.gross_margin_pct - catMin) / (catMax - catMin)) * catBarW;
    const color = row.gross_margin_pct < results.overall.gross_margin_pct ? "#d08b52" : "#128078";
    return `<text x="78" y="${y + 15}" class="small">${esc(row.category)}</text><rect x="${catBarX}" y="${y}" width="${Math.max(3, width)}" height="17" rx="4" fill="${color}"/><line x1="${chainX}" y1="${y - 2}" x2="${chainX}" y2="${y + 19}" stroke="#17324d" stroke-width="2"/><text x="${catBarX + catBarW + 12}" y="${y + 15}" font-size="15" font-weight="700">${pct(row.gross_margin_pct)}</text>`;
  }).join("\n  ")}

  <rect x="820" y="602" width="730" height="338" rx="14" class="panel"/>
  <text x="850" y="640" class="section">Management priorities</text>
  <rect x="850" y="674" width="8" height="69" rx="4" fill="#c4544d"/>
  <text x="874" y="695" class="label">1. Stabilize Lentini operations</text>
  <text x="874" y="720" class="small">−6.2% to target • 4.0% waste rate • 296 stockout days</text>
  <rect x="850" y="760" width="8" height="69" rx="4" fill="#d08b52"/>
  <text x="874" y="781" class="label">2. Add promotion margin gates</text>
  <text x="874" y="806" class="small">Promo margin ${pct(results.promo_vs_non_promo.find((row) => row.promo_status === "Promotion").gross_margin_pct)} vs ${pct(results.promo_vs_non_promo.find((row) => row.promo_status === "No promotion").gross_margin_pct)} non-promo</text>
  <rect x="850" y="846" width="8" height="69" rx="4" fill="#128078"/>
  <text x="874" y="867" class="label">3. Review category mix and pricing</text>
  <text x="874" y="892" class="small">Pantry ${pct(results.by_category.find((row) => row.category === "Pantry").gross_margin_pct)} • Meat &amp; Seafood ${pct(results.by_category.find((row) => row.category === "Meat & Seafood").gross_margin_pct)}</text>
  <text x="1550" y="975" text-anchor="end" class="small">Source: synthetic MercatoVivo extracts • Cleaning rules documented in SQL</text>
</svg>`;

await fs.mkdir(path.join(root, "assets"), {recursive: true});
await fs.writeFile(path.join(root, "assets", "portfolio_dashboard.svg"), svg, "utf8");
console.log("Wrote assets/portfolio_dashboard.svg");
