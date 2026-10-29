/*
 * Renders LaxVault's brand images (icons, favicons, social card, lockups) from
 * the crease mark. Run: node scripts/brand/render.cjs  (needs Playwright + Chromium),
 * then convert public/brand/*.png to .webp (Pillow: Image.open(f).save(f2, "WEBP", quality=92)) and delete the PNGs.
 * PLACEHOLDER typography: the wordmark uses DejaVu Sans Condensed Bold until the
 * Saira Condensed wordmark artwork is supplied. Colors follow palette B.
 */
const { chromium } = require("playwright");
const path = require("path");
const BG = "#070b0b", TEAL = "#19c3ae", BALL = "#d7f34a", FG = "#e6f2ef";
const out = (f) => path.join(__dirname, "..", "..", "public", f);

const mark = (size, pad = 0) => `
<svg width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${64 + pad * 2} ${64 + pad * 2}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="26" fill="none" stroke="${TEAL}" stroke-width="5" stroke-linecap="round" stroke-dasharray="140 23.4" transform="rotate(-21.4 32 32)"/>
  <rect x="23" y="38" width="18" height="12" fill="none" stroke="${FG}" stroke-width="3.5"/>
  <circle cx="50.4" cy="13.6" r="5.5" fill="${BALL}"/>
</svg>`;
const word = (px) => `<span style="font:700 ${px}px 'DejaVu Sans Condensed','DejaVu Sans',sans-serif;letter-spacing:.02em;color:${FG}">Lax<span style="color:${TEAL}">Vault</span></span>`;
const wrap = (w, h, body, bg = BG) => `<html><body style="margin:0;width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center;gap:${Math.round(w / 30)}px;flex-direction:var(--dir,row)">${body}</body></html>`;

const jobs = [
  ["icon-192.png", 192, 192, mark(192, 6)],
  ["icon-512.png", 512, 512, mark(512, 6)],
  ["icon-maskable-512.png", 512, 512, mark(512, 26)],
  ["apple-touch-icon.png", 180, 180, mark(180, 6)],
  ["favicon-32.png", 32, 32, mark(32, 2)],
  ["favicon-48.png", 48, 48, mark(48, 2)],
  ["brand/icon.png", 512, 512, mark(512, 6)],
  ["brand/lockup-horizontal.png", 900, 240, mark(170, 0) + word(120)],
  ["social-card.png", 1200, 630, `<div style="display:flex;align-items:center;gap:36px">${mark(220, 0)}<div>${word(150)}<div style="font:500 38px 'DejaVu Sans Condensed',sans-serif;color:#93aaa6;margin-top:8px;letter-spacing:.14em;text-transform:uppercase">Drill · Plan · Run</div></div></div>`],
];
(async () => {
  const browser = await chromium.launch();
  for (const [file, w, h, body] of jobs) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(wrap(w, h, body));
    await page.screenshot({ path: out(file) });
    await page.close();
  }
  // stacked lockup (square)
  const page = await browser.newPage({ viewport: { width: 520, height: 520 } });
  await page.setContent(wrap(520, 520, mark(260, 0) + word(88)).replace("var(--dir,row)", "column"));
  await page.screenshot({ path: out("brand/lockup-stacked.png") });
  await browser.close();
})();
