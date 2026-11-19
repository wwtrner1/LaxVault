/**
 * The hero play window: a small animated play for the home pages (the app's
 * Landing, lax-vault.com and any other page that wants one). Plain DOM and SVG,
 * no React and no libraries, so the marketing site loads it as one small file
 * (`npm run hero:build` writes marketing/hero-play.js) and the app mounts the
 * same code. The play is data: players in field yards on a men's half field
 * and a list of frames, each with its moves and a coaching line, which is the
 * same idea as the Designer's frames (lib/frames.ts).
 *
 * Mount: `<div data-hero-play></div>` (the marketing script mounts every one it
 * finds) or `mountHeroPlay(el, { href })` from code.
 */

type Side = "o" | "d" | "g";
type Spot = [along: number, across: number];
type Move = { who: string; to: Spot; kind: "cut" | "dodge" | "pick"; bend?: number };
type Ball = { from: string; to: string; kind: "pass" | "shot" };
export type HeroFrame = { title: string; note: string; moves: Move[]; ball?: Ball };
export type HeroPlay = { name: string; players: { id: string; label: string; side: Side; at: Spot }[]; carrier: string; frames: HeroFrame[] };

/** Our own teaching play: a dodge from behind (X), a pick on the crease and the feed. */
export const HERO_PLAY: HeroPlay = {
  name: "2-3-1 · X dodge, pick and feed",
  carrier: "1",
  players: [
    { id: "1", label: "1", side: "o", at: [9.5, 30] },
    { id: "2", label: "2", side: "o", at: [19, 15] },
    { id: "3", label: "3", side: "o", at: [19, 45] },
    { id: "4", label: "4", side: "o", at: [21.5, 30] },
    { id: "5", label: "5", side: "o", at: [31, 21] },
    { id: "6", label: "6", side: "o", at: [31, 39] },
    { id: "g", label: "G", side: "g", at: [15.6, 30] },
  ],
  frames: [
    { title: "Set the 2-3-1", note: "1 has it behind the cage. Two up top, three across, one on the crease.", moves: [] },
    {
      title: "1 dodges, 4 sets the pick",
      note: "1 drives up the right side. 4 steps out and picks for 5, who curls toward the crease.",
      moves: [
        { who: "1", to: [15.5, 40.5], kind: "dodge" },
        { who: "4", to: [26.5, 24], kind: "pick" },
        { who: "5", to: [21, 27], kind: "cut", bend: 0.3 },
      ],
    },
    {
      title: "Feed the cutter",
      note: "1 looks shot first, feed second. The crease defender is caught on the pick, so 1 feeds 5.",
      moves: [{ who: "6", to: [27, 37], kind: "cut", bend: -0.2 }],
      ball: { from: "1", to: "5", kind: "pass" },
    },
    { title: "Finish low", note: "5 catches on the doorstep and shoots low to high. 6 fills for the rebound.", moves: [], ball: { from: "5", to: "goal", kind: "shot" } },
  ],
};

const NS = "http://www.w3.org/2000/svg";
// Field geometry in yards (men's half field: 60 wide, end line to midfield 55, goal line 15 out).
const U = 9;
const PAD = 10;
const W = 60 * U + PAD * 2;
const H = 40 * U + PAD * 2;
const GOAL: Spot = [15, 30];
const xy = ([along, across]: Spot) => ({ x: PAD + across * U, y: PAD + along * U });

const STEP_MS = 1500;
const HOLD_MS = 1700;

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>, parent?: Element) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.appendChild(n);
  return n;
}

const CSS = `
.hp{--hp-ink:#070B0B;--hp-panel:#111918;--hp-line:rgba(230,242,239,.78);--hp-teal:#19C3AE;--hp-lime:#D7F34A;font-family:Barlow,system-ui,sans-serif;color:#E6F2EF;background:var(--hp-panel);border:1px solid rgba(25,195,174,.35);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.45);overflow:hidden;max-width:560px;margin-inline:auto;width:100%}
.hp-bar{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid rgba(230,242,239,.08);font:600 12px/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.04em;color:rgba(230,242,239,.62)}
.hp-bar i{width:9px;height:9px;border-radius:50%;background:rgba(230,242,239,.18)}.hp-bar i:first-child{background:var(--hp-teal)}
.hp-bar b{margin-left:6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hp-title{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:10px 16px 0}
.hp-title strong{font:800 18px/1.15 "Saira Condensed",Barlow,sans-serif;letter-spacing:.02em;text-transform:uppercase}
.hp-title span{font:600 12px/1 "IBM Plex Mono",ui-monospace,monospace;color:var(--hp-teal)}
.hp svg{display:block;width:100%;height:auto}
.hp-note{min-height:3.2em;margin:0;padding:8px 16px 4px;font-size:14.5px;line-height:1.4;color:rgba(230,242,239,.9)}
.hp-note b{color:var(--hp-lime);font-weight:700}
.hp-ctl{display:flex;align-items:center;gap:6px;padding:8px 12px 12px}
.hp-ctl button{appearance:none;border:1px solid rgba(230,242,239,.18);background:transparent;color:inherit;border-radius:8px;min-width:36px;height:34px;font:700 13px/1 Barlow,sans-serif;cursor:pointer}
.hp-ctl button:hover,.hp-ctl button:focus-visible{border-color:var(--hp-teal);outline:none;color:var(--hp-teal)}
.hp-dots{display:flex;flex:1;min-width:0;max-width:110px;gap:5px;margin:0 6px}.hp-dots span{flex:1;height:4px;border-radius:2px;background:rgba(230,242,239,.18);overflow:hidden}
.hp-dots span i{display:block;height:100%;width:0;background:var(--hp-teal)}
.hp-ctl a{margin-left:auto;flex:none;color:var(--hp-teal);font:700 13px/1 Barlow,sans-serif;text-decoration:none;white-space:nowrap}.hp-ctl a:hover{text-decoration:underline}
.hp-foot{display:flex;justify-content:space-between;padding:0 16px 10px;font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;color:rgba(230,242,239,.42)}
`;

function ensureCss() {
  if (document.getElementById("hp-css")) return;
  const s = document.createElement("style");
  s.id = "hp-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

function drawField(svg: SVGSVGElement) {
  el("rect", { x: 0, y: 0, width: W, height: H, fill: "#14532D" }, svg);
  // Mowing stripes, 5 yards each.
  for (let i = 0; i < 9; i += 2) el("rect", { x: 0, y: PAD + i * 5 * U, width: W, height: 5 * U, fill: "#166534", opacity: 0.7 }, svg);
  const g = el("g", { fill: "none", stroke: "var(--hp-line)", "stroke-width": 2 }, svg);
  const tl = xy([0, 0]);
  const br = xy([40, 60]);
  el("path", { d: `M${tl.x} ${br.y + PAD} V${tl.y} H${br.x} V${br.y + PAD}` }, g); // sidelines and end line
  el("line", { x1: xy([15, 10]).x, y1: xy([15, 10]).y, x2: xy([15, 50]).x, y2: xy([15, 50]).y, opacity: 0.6 }, g); // goal line extended
  el("path", { d: `M${xy([35, 0]).x} ${xy([35, 0]).y} H${xy([35, 60]).x} M${xy([0, 10]).x} ${xy([0, 10]).y} V${xy([35, 10]).y} M${xy([0, 50]).x} ${xy([0, 50]).y} V${xy([35, 50]).y}` }, g); // restraining box
  const c = xy(GOAL);
  el("circle", { cx: c.x, cy: c.y, r: 3 * U, fill: "rgba(255,255,255,.06)" }, g); // crease, 9 ft radius
  el("path", { d: `M${c.x - 9} ${c.y} L${c.x} ${c.y - 14} L${c.x + 9} ${c.y} Z`, fill: "rgba(255,255,255,.12)", "stroke-width": 2.4 }, g); // goal
  el("text", { x: W - PAD - 4, y: H - PAD - 6, "text-anchor": "end", fill: "rgba(230,242,239,.35)", stroke: "none", "font-size": 12, "font-family": "IBM Plex Mono, monospace" }, svg).textContent = "MEN'S HALF FIELD";
}

/** A line from a to b, bowed by `bend` (a share of its length) for cuts, as an SVG path. */
function lineD(a: { x: number; y: number }, b: { x: number; y: number }, kind: string, bend = 0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  if (kind === "dodge") {
    // A carry: small waves along the line.
    const n = Math.max(3, Math.round(len / 16));
    let d = `M${a.x} ${a.y}`;
    for (let i = 1; i <= n; i++) {
      const t0 = (i - 1) / n;
      const t1 = i / n;
      const tm = (t0 + t1) / 2;
      const amp = i === n ? 0 : i % 2 ? 6 : -6;
      d += ` Q${a.x + dx * tm - (dy / len) * amp} ${a.y + dy * tm + (dx / len) * amp} ${a.x + dx * t1} ${a.y + dy * t1}`;
    }
    return d;
  }
  const mx = a.x + dx / 2 - (dy / len) * bend * len;
  const my = a.y + dy / 2 + (dx / len) * bend * len;
  return `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** A point along a quadratic (or straight) line at t. */
function along(a: { x: number; y: number }, b: { x: number; y: number }, bend: number, t: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const m = { x: a.x + dx / 2 - (dy / len) * bend * len, y: a.y + dy / 2 + (dx / len) * bend * len };
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * m.x + t * t * b.x, y: u * u * a.y + 2 * u * t * m.y + t * t * b.y };
}

export function mountHeroPlay(host: HTMLElement, opts: { play?: HeroPlay; href?: string; label?: string } = {}) {
  const play = opts.play ?? HERO_PLAY;
  ensureCss();
  host.innerHTML = "";
  const root = document.createElement("figure");
  root.className = "hp";
  root.style.margin = "0";
  root.setAttribute("aria-label", `An animated lacrosse play: ${play.name}`);
  root.innerHTML = `<div class="hp-bar" aria-hidden="true"><i></i><i></i><i></i><b>LaxVault · ${opts.label ?? "Play designer"}</b></div><div class="hp-title"><strong></strong><span></span></div>`;
  (root.querySelector(".hp-title strong") as HTMLElement).textContent = play.name;
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": `${play.name}, drawn on a men's half field` }) as SVGSVGElement;
  root.appendChild(svg);
  const note = document.createElement("p");
  note.className = "hp-note";
  note.setAttribute("aria-live", "polite");
  root.appendChild(note);
  const ctl = document.createElement("div");
  ctl.className = "hp-ctl";
  ctl.innerHTML = `<button type="button" data-a="back" aria-label="Back one frame">‹</button><button type="button" data-a="play" aria-label="Pause">❚❚</button><button type="button" data-a="next" aria-label="Next frame">›</button><div class="hp-dots" aria-hidden="true">${play.frames.map(() => "<span><i></i></span>").join("")}</div>${opts.href ? `<a href="${opts.href}">Draw your own →</a>` : ""}`;
  root.appendChild(ctl);
  const foot = document.createElement("div");
  foot.className = "hp-foot";
  foot.innerHTML = "<span>Made with LaxVault</span><span>lax-vault.com</span>";
  root.appendChild(foot);
  host.appendChild(root);

  drawField(svg);
  const defs = el("defs", {}, svg);
  const marker = (id: string, color: string) => {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0 0 L10 5 L0 10 Z", fill: color }, m);
  };
  const uid = Math.random().toString(36).slice(2, 7);
  marker(`hpa-${uid}`, "#F8FAFC");
  marker(`hps-${uid}`, "#F87171");
  const trails = el("g", { fill: "none", "stroke-linecap": "round" }, svg);
  const tokens = el("g", {}, svg);

  // Where each player stands at the start of each frame.
  const starts: Record<string, Spot>[] = [];
  let pos: Record<string, Spot> = Object.fromEntries(play.players.map((p) => [p.id, p.at]));
  for (const f of play.frames) {
    starts.push(pos);
    pos = { ...pos };
    for (const m of f.moves) pos[m.who] = m.to;
  }
  // Who holds the ball at the start of each frame.
  const holders: string[] = [];
  let h = play.carrier;
  for (const f of play.frames) {
    holders.push(h);
    if (f.ball?.kind === "pass") h = f.ball.to;
  }

  const tok: Record<string, SVGGElement> = {};
  for (const p of play.players) {
    const g = el("g", {}, tokens) as SVGGElement;
    if (p.side === "g") el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 5, fill: "#0B1524", stroke: "#F8FAFC", "stroke-width": 2 }, g);
    else el("circle", { r: 12, fill: p.side === "o" ? "#1D4ED8" : "#B91C1C", stroke: "#F8FAFC", "stroke-width": 2 }, g);
    const t = el("text", { y: 4.5, "text-anchor": "middle", fill: "#fff", "font-size": 13, "font-weight": 700, "font-family": "Barlow, sans-serif" }, g);
    t.textContent = p.label;
    tok[p.id] = g;
  }
  const ball = el("circle", { r: 5.5, fill: "#FACC15", stroke: "#0B1524", "stroke-width": 1.5 }, svg);

  const place = (id: string, at: { x: number; y: number }) => tok[id].setAttribute("transform", `translate(${at.x} ${at.y})`);

  let frame = 0;
  let t0 = performance.now();
  let playing = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let raf = 0;
  let visible = true;
  const dots = [...ctl.querySelectorAll<HTMLElement>(".hp-dots i")];
  const playBtn = ctl.querySelector<HTMLButtonElement>('[data-a="play"]')!;
  const stepLabel = root.querySelector(".hp-title span") as HTMLElement;

  // Where a player ends up after frame i's moves.
  const pos2 = (i: number, id: string): Spot => play.frames[i].moves.find((m) => m.who === id)?.to ?? starts[i][id];

  /** Draw frame `i` at progress `p` (0 = its start, 1 = its moves done). */
  const draw = (i: number, p: number) => {
    const f = play.frames[i];
    const s = starts[i];
    trails.replaceChildren();
    // Lines from earlier frames stay faint, so the play reads as a whole.
    for (let j = 0; j <= i; j++) {
      const fj = play.frames[j];
      const pj = j < i ? 1 : ease(Math.min(1, p));
      const faint = j < i;
      for (const m of fj.moves) {
        const a = xy(starts[j][m.who]);
        const b = xy(m.to);
        const path = el("path", {
          d: lineD(a, b, m.kind, m.bend),
          stroke: "#F8FAFC",
          "stroke-width": 2.6,
          opacity: faint ? 0.32 : 0.95,
          ...(m.kind === "pick" ? {} : { "marker-end": `url(#hpa-${uid})` }),
        }, trails);
        const len = (path as SVGPathElement).getTotalLength?.() ?? 0;
        if (!faint && len) {
          path.setAttribute("stroke-dasharray", `${len}`);
          path.setAttribute("stroke-dashoffset", `${len * (1 - pj)}`);
          if (pj < 0.98) path.removeAttribute("marker-end");
        }
        if (m.kind === "pick" && pj > 0.98) {
          // A pick ends in a bar across the line.
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
          el("line", { x1: b.x - (dy / d) * 9, y1: b.y + (dx / d) * 9, x2: b.x + (dy / d) * 9, y2: b.y - (dx / d) * 9, stroke: "#F8FAFC", "stroke-width": 3, opacity: faint ? 0.32 : 1 }, trails);
        }
      }
      if (fj.ball) {
        const from = xy(pos2(j, fj.ball.from));
        const to = fj.ball.to === "goal" ? { x: xy(GOAL).x, y: xy(GOAL).y - 6 } : xy(pos2(j, fj.ball.to));
        const shot = fj.ball.kind === "shot";
        el("path", {
          d: `M${from.x} ${from.y} L${to.x} ${to.y}`,
          stroke: shot ? "#F87171" : "#F8FAFC",
          "stroke-width": shot ? 3.2 : 2.4,
          "stroke-dasharray": shot ? "none" : "7 6",
          opacity: faint ? 0.32 : pj > 0.05 ? 0.95 : 0,
          "marker-end": `url(#${shot ? "hps" : "hpa"}-${uid})`,
        }, trails);
      }
    }
    const k = ease(Math.min(1, p));
    for (const pl of play.players) {
      const m = f.moves.find((x) => x.who === pl.id);
      const a = xy(s[pl.id]);
      place(pl.id, m ? along(a, xy(m.to), m.kind === "dodge" ? 0 : m.bend ?? 0, k) : a);
    }
    // The ball rides with its holder, or flies on a pass or shot.
    const holder = holders[i];
    const at = (id: string) => {
      const tr = tok[id].getAttribute("transform")!.match(/translate\(([-\d.]+) ([-\d.]+)\)/)!;
      return { x: +tr[1] + 9, y: +tr[2] - 9 };
    };
    let b = at(holder);
    if (f.ball) {
      const from = at(f.ball.from);
      const to = f.ball.to === "goal" ? { x: xy(GOAL).x, y: xy(GOAL).y - 6 } : at(f.ball.to);
      b = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
    }
    ball.setAttribute("cx", `${b.x}`);
    ball.setAttribute("cy", `${b.y}`);
    note.innerHTML = `<b>${i + 1}. ${f.title}.</b> ${f.note}`;
    stepLabel.textContent = `Frame ${i + 1} of ${play.frames.length}`;
    dots.forEach((d, j) => (d.style.width = j < i ? "100%" : j === i ? `${Math.round(Math.min(1, p) * 100)}%` : "0"));
  };

  const tick = (now: number) => {
    raf = 0;
    if (!playing || !visible) return;
    const el = now - t0;
    const moving = play.frames[frame].moves.length || play.frames[frame].ball ? STEP_MS : 0;
    if (el > moving + HOLD_MS) {
      frame = (frame + 1) % play.frames.length;
      t0 = now;
      draw(frame, 0);
    } else draw(frame, moving ? el / moving : 1);
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    if (!raf && playing && visible) raf = requestAnimationFrame(tick);
  };
  const setPlaying = (on: boolean) => {
    playing = on;
    playBtn.textContent = on ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
    if (on) {
      t0 = performance.now();
      run();
    }
  };
  ctl.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest("button")?.dataset.a;
    if (!a) return;
    if (a === "play") return setPlaying(!playing);
    setPlaying(false);
    frame = (frame + (a === "next" ? 1 : play.frames.length - 1)) % play.frames.length;
    draw(frame, 1);
  });
  // Only animate while on screen, so a long page never burns a phone's battery.
  const io = "IntersectionObserver" in window ? new IntersectionObserver(([en]) => ((visible = en.isIntersecting), run())) : null;
  io?.observe(root);
  draw(0, playing ? 0 : 1);
  if (!playing) {
    frame = play.frames.length - 1;
    draw(frame, 1);
    setPlaying(false);
  }
  run();
  return () => {
    io?.disconnect();
    if (raf) cancelAnimationFrame(raf);
    host.innerHTML = "";
  };
}

/** For the marketing site's bundle: mount every `[data-hero-play]` on the page. */
export function mountAll() {
  document.querySelectorAll<HTMLElement>("[data-hero-play]").forEach((n) => mountHeroPlay(n, { href: n.dataset.href, label: n.dataset.label }));
}
