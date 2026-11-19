import { HeroPlayWindow } from "../components/HeroPlayWindow";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MarketingFooter, MarketingNav } from "../components/Marketing";
import { Icon } from "../components/Icon";
import { PUBLIC_TIERS } from "../lib/plan";
import { useTier } from "../lib/tier";
import { foundingLine, useFounding } from "../lib/founding";
import "../styles/home.css";

/** Plan card buttons, as labelled on the canvas. */
const PLAN_CTA: Record<string, string> = {
  free: "Start on Sideline",
  solo: "Choose Coach",
  crew: "Choose Staff",
};

const PILLARS = [
  {
    icon: "pencil" as const,
    title: "Draw it",
    status: "Ready",
    body: "A drawing board for lacrosse: place players, pull a cut or a pass, add text. Save it to your Vault and print it.",
    to: "/build",
    cta: "Open the designer",
  },
  {
    icon: "board" as const,
    title: "Plan the practice",
    status: "Ready",
    body: "Build tonight's script in timed blocks. Drop in the plays you want to rep, see the clock times, print the script and the cards.",
    to: "/practice",
    cta: "Build a practice",
  },
  {
    icon: "play" as const,
    title: "Run it from the sideline",
    status: "Ready",
    body: "A bright, big-type live mode: one clock per period, a horn at zero, the drill and coaching points under it. It keeps time through a locked phone.",
    to: "/practice/live",
    cta: "Try live mode",
  },
];

const STEPS = [
  { n: "01", title: "Pick a plan", body: "Start from a ready-made practice for your age group, or line up your own timed blocks." },
  { n: "02", title: "Make it yours", body: "Swap in starter drills or draw your own sets and slides on a real men's field." },
  { n: "03", title: "Run it", body: "Print the script and drill cards, or run it live on the field with the clock." },
];

export function Landing() {
  const { hash } = useLocation();
  const tier = useTier();
  const founding = useFounding();

  // The shared nav links to /#how from any page; scroll there once the section exists.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="marketing">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <MarketingNav />

      <main id="main">
        <section className="home-hero" aria-labelledby="hero-h">
          <div className="home-hero-copy">
            <img className="home-hero-badge" src="/brand/icon.webp" width={120} height={120} alt="LaxVault" fetchPriority="high" />
            <p className="home-eyebrow">Free Sideline plan · no card</p>
            <h1 id="hero-h">
              Practice · <span className="hl-teal">Plan</span> · <span className="hl-cyan">Play</span>
            </h1>
            <p className="home-hero-lede">
              LaxVault is a practice planner and drawing board for lacrosse coaches. Keep your drills in one searchable
              Vault, build a timed practice from them, and print what you need for the clipboard. Men's field, women's field and box.
            </p>
            <div className="home-hero-actions">
              <Link to="/tonight" className="btn btn-primary btn-lg">
                Build tonight's practice — free
              </Link>
              <Link to="/build" className="btn btn-outline-dark btn-lg">
                Open the designer
              </Link>
            </div>
            <p className="home-hero-fine">Comes with starter drills, plays and ready-made practice plans. Works on the laptop you plan on and the phone or tablet you carry to the field.</p>
          </div>
          <figure className="home-hero-frame">
            <HeroPlayWindow />
          </figure>
        </section>

        <section className="home-built" aria-label="Built for">
          <p className="home-eyebrow">Built for</p>
          <ul>
            <li>Youth coaches</li>
            <li>Volunteer assistants</li>
            <li>High school programs</li>
            <li>Club teams</li>
          </ul>
        </section>

        <section className="home-all" id="everything" aria-labelledby="all-h">
          <div className="home-band-head">
            <p className="home-eyebrow">What you get</p>
            <h2 id="all-h">Three jobs, one place</h2>
            <p>What works today is marked Ready. The rest is on the way, and we will say so.</p>
          </div>
          <ul className="home-all-grid">
            {PILLARS.map((p) => (
              <li key={p.title}>
                <Link to={p.to} className="home-all-card">
                  <Icon name={p.icon} size={22} />
                  <b>
                    {p.title} <span className="pill">{p.status}</span>
                  </b>
                  <small>{p.body}</small>
                  <small>
                    <b>{p.cta}</b>
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-how" id="how" aria-labelledby="how-h">
          <div className="home-band-head">
            <p className="home-eyebrow">How it works</p>
            <h2 id="how-h">Three steps, about five minutes</h2>
            <p>If you can run a slide deck, you already know how to run this.</p>
          </div>
          <ol className="home-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="home-plans" aria-labelledby="plans-h">
          <div className="home-band-head">
            <p className="home-eyebrow">Plans</p>
            <h2 id="plans-h">Start free. Upgrade when it earns it.</h2>
            <p>
              Sideline is free for good. Coach is $39 a year, and the first 250 coaches lock in the Founding Coach rate of $29 a
              year for life. Every paid plan comes with a 14-day money-back guarantee.
            </p>
            <p>
              <b>Founding Coach: {foundingLine(founding)}.</b>
            </p>
          </div>
          <div className="home-plan-grid">
            {PUBLIC_TIERS.map((t) => (
              <div className={`home-plan${t.featured ? " is-featured" : ""}`} key={t.id}>
                {t.featured && <span className="home-plan-flag">Most coaches pick this</span>}
                <h3>{t.name}</h3>
                <p>{t.blurb}</p>
                <div className="home-plan-price">
                  <b>{t.price}</b>
                  <small>{t.cadence}</small>
                </div>
                <div className="home-plan-cta">
                  <Link to="/pricing" className={`btn ${t.featured ? "btn-primary" : "btn-ghost"}`}>
                    {tier.id === t.id ? "Your current plan" : PLAN_CTA[t.id]}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div>
            <Link to="/pricing" className="btn btn-ghost">
              Compare the plans
            </Link>
          </div>
        </section>

        <section className="home-cta" aria-labelledby="cta-h">
          <h2 id="cta-h">
            Your first drill is about <span>ninety seconds away.</span>
          </h2>
          <p>No card to start. Draw something, put it in tonight's practice, print the script.</p>
          <Link to="/build" className="btn btn-primary btn-lg">
            Open the designer
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
