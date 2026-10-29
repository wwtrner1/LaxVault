/**
 * Public drill pages for the marketing site: one static page per starter
 * drill (setup, coaching points, gear, diagram) with an "Add to my practice"
 * button into the app, an index, and the sitemap. Run after changing the
 * starter drills:
 *
 *   npx tsx scripts/drill-pages.tsx
 *
 * Writes marketing/drills/** and marketing/sitemap.xml. The marketing site has
 * no build step, so the output is committed.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STARTER_DRILLS, type StarterDrill } from "../src/lib/starters/drills";
import { starterDrillScene } from "../src/lib/starters";
import { sceneToSvg } from "../src/lib/export";
import { MADE_WITH } from "../src/lib/site";

const SITE = "https://lax-vault.com";
const APP = "https://app.lax-vault.com";
const OUT = join(import.meta.dirname, "..", "marketing", "drills");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (d: StarterDrill) => d.key;
const players = (d: StarterDrill) => (d.players.max ? `${d.players.min} to ${d.players.max} players` : `${d.players.min}+ players`);

const STYLE = `:root{--bg:#070B0B;--surface:#111918;--line:#1f2b29;--accent:#19C3AE;--text:#E6F2EF;--muted:#9bb3ae;--ball:#D7F34A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit}.wrap{max-width:1040px;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--line)}header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;height:64px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;font-size:22px}.brand img{border-radius:6px;display:block}
.btn{display:inline-block;background:var(--accent);color:#04100e;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--line)}
.btn:focus-visible,a:focus-visible{outline:3px solid var(--ball);outline-offset:3px}
h1{font-size:clamp(30px,5vw,46px);line-height:1.08;margin:28px 0 8px;letter-spacing:-.02em}
.meta{color:var(--muted);margin:0 0 20px}.crumbs{margin-top:20px;font-size:14px;color:var(--muted)}
.grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px;align-items:start;padding-bottom:48px}
.diagram{background:#fff;border-radius:12px;padding:8px}.diagram svg{display:block;width:100%;height:auto}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px}
.card h2{margin:0 0 8px;font-size:19px}.card p,.card li{color:var(--muted)}.card ul{margin:0;padding-left:20px}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 20px}
.list{list-style:none;margin:0;padding:0 0 48px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.list a{display:block;height:100%;text-decoration:none;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px}
.list b{display:block;font-size:17px}.list span{color:var(--muted);font-size:14px}
.cat{margin:28px 0 10px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
footer{border-top:1px solid var(--line);padding:24px 0;color:var(--muted);font-size:14px}
@media (max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}`;

function page(o: { title: string; description: string; path: string; body: string; json?: object }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}" />
<link rel="canonical" href="${SITE}${o.path}" />
<link rel="icon" href="/favicon-32.png" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.description)}" />
<meta property="og:url" content="${SITE}${o.path}" />
<meta property="og:image" content="${SITE}/social-card.png" />
<meta name="twitter:card" content="summary_large_image" />
${o.json ? `<script type="application/ld+json">${JSON.stringify(o.json).replace(/</g, "\\u003c")}</script>\n` : ""}<style>${STYLE}</style>
</head>
<body>
<header><div class="wrap"><a class="brand" href="/"><img src="/icon-192.png" width="36" height="36" alt="" />LaxVault</a><a class="btn" href="${APP}/tonight">Build tonight's practice</a></div></header>
<main class="wrap">
${o.body}
</main>
<footer><div class="wrap">${esc(MADE_WITH)} · <a href="/drills/">All drills</a> · <a href="/">Home</a></div></footer>
</body>
</html>
`;
}

function drillPage(d: StarterDrill): string {
  const svg = sceneToSvg(starterDrillScene(d)).replace(/<\?xml[^>]*>/, "");
  const add = `${APP}/drills?add=${encodeURIComponent(d.key)}`;
  const desc = `${d.name}: a ${d.minutes}-minute lacrosse ${d.category.toLowerCase()} drill for ${d.levels.join(", ").toLowerCase()} players. Setup, coaching points and a diagram.`;
  const body = `<p class="crumbs"><a href="/drills/">Lacrosse drills</a> · ${esc(d.category)}</p>
<h1>${esc(d.name)}</h1>
<p class="meta">${esc(d.category)} · ${d.minutes} min · ${players(d)} · ${esc(d.levels.join(", "))}</p>
<div class="cta"><a class="btn" href="${add}">Add to my practice, free</a><a class="btn ghost" href="${APP}/tonight">Build a whole practice</a></div>
<div class="grid">
<figure class="diagram" aria-label="Diagram of ${esc(d.name)}" style="margin:0">${svg}</figure>
<div>
<section class="card"><h2>Setup</h2><p>${esc(d.setup)}</p></section>
<section class="card"><h2>Coaching points</h2><ul>${d.coachingPoints.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>
${d.equipment.length ? `<section class="card"><h2>Gear</h2><p>${esc(d.equipment.join(", "))}</p></section>` : ""}
</div>
</div>`;
  return page({
    title: `${d.name} · lacrosse drill with diagram | LaxVault`,
    description: desc,
    path: `/drills/${slug(d)}/`,
    body,
    json: { "@context": "https://schema.org", "@type": "HowTo", name: d.name, description: desc, totalTime: `PT${d.minutes}M`, tool: d.equipment.map((e) => ({ "@type": "HowToTool", name: e })), step: d.coachingPoints.map((c) => ({ "@type": "HowToStep", text: c })) },
  });
}

function indexPage(): string {
  const cats = [...new Set(STARTER_DRILLS.map((d) => d.category))];
  const body = `<h1>Lacrosse drills with diagrams</h1>
<p class="meta">${STARTER_DRILLS.length} drills youth and high-school programs run most, each with setup, coaching points and a diagram. Add any of them to your practice for free.</p>
${cats
  .map(
    (c) => `<h2 class="cat">${esc(c)}</h2>
<ul class="list">${STARTER_DRILLS.filter((d) => d.category === c)
      .map((d) => `<li><a href="/drills/${slug(d)}/"><b>${esc(d.name)}</b><span>${d.minutes} min · ${esc(d.levels.join(", "))}</span></a></li>`)
      .join("")}</ul>`,
  )
  .join("\n")}`;
  return page({ title: "Lacrosse drills with diagrams | LaxVault", description: `${STARTER_DRILLS.length} free lacrosse drills with setup, coaching points and diagrams, for youth and high-school coaches.`, path: "/drills/", body });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), indexPage());
for (const d of STARTER_DRILLS) {
  mkdirSync(join(OUT, slug(d)), { recursive: true });
  writeFileSync(join(OUT, slug(d), "index.html"), drillPage(d));
}
const urls = ["/", "/drills/", ...STARTER_DRILLS.map((d) => `/drills/${slug(d)}/`)];
writeFileSync(
  join(OUT, "..", "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`,
);
console.log(`Wrote ${STARTER_DRILLS.length} drill pages, the index and sitemap.xml`);
