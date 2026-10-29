import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { SCREENS, TUTORIALS } from "../lib/guide";
import "../styles/guide.css";

/**
 * The coach's guide: short tutorials that walk through the main jobs, and a
 * reference of every button on every screen, with a find box.
 */
export function Guide() {
  const [find, setFind] = useState("");
  const { hash } = useLocation();
  // Links from other screens land on their section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  const q = find.trim().toLowerCase();
  const screens = SCREENS.map((s) => ({
    ...s,
    buttons: q ? s.buttons.filter((b) => [b.name, b.where, b.does, s.screen].join(" ").toLowerCase().includes(q)) : s.buttons,
  })).filter((s) => s.buttons.length);

  return (
    <Shell title="Guide">
      <div className="page-head">
        <div>
          <h2>Coach's guide</h2>
          <p>Step-by-step tutorials for the jobs you do every week, and what every button does, screen by screen.</p>
        </div>
      </div>

      <nav className="gd-jump" aria-label="On this page">
        <a href="#tutorials">Tutorials</a>
        <a href="#buttons">Every button</a>
        {SCREENS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.screen}
          </a>
        ))}
      </nav>

      <section id="tutorials" aria-labelledby="gd-tut-h">
        <h3 id="gd-tut-h" className="gd-h">Tutorials</h3>
        <div className="gd-tuts">
          {TUTORIALS.map((t) => (
            <details key={t.id} id={t.id} className="gd-tut" open={hash ? hash === `#${t.id}` : t.id === "first-practice"}>
              <summary>
                <b>{t.title}</b>
                <span>
                  {t.minutes} min · {t.who}
                </span>
              </summary>
              <ol>
                {t.steps.map((s, k) => (
                  <li key={k}>
                    <p>{s.text}</p>
                    {s.to && (
                      <Link to={s.to} className="btn btn-ghost btn-sm">
                        {s.cta} <Icon name="next" size={13} />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>

      <section id="buttons" aria-labelledby="gd-btn-h">
        <div className="gd-btn-head">
          <h3 id="gd-btn-h" className="gd-h">Every button</h3>
          <div className="search-box gd-find">
            <Icon name="search" size={16} />
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a button, like Export or Sets" aria-label="Find a button" />
          </div>
        </div>
        {!screens.length && <p className="gd-none">Nothing matches “{find}”. Try one word, like print, set or clock.</p>}
        {screens.map((s) => (
          <section key={s.id} id={s.id} className="gd-screen" aria-labelledby={`gd-${s.id}`}>
            <div className="gd-screen-head">
              <h4 id={`gd-${s.id}`}>{s.screen}</h4>
              <Link to={s.to} className="btn btn-quiet btn-sm">
                Open <Icon name="next" size={13} />
              </Link>
            </div>
            <p className="gd-intro">{s.intro}</p>
            <table className="gd-table">
              <thead>
                <tr>
                  <th scope="col">Button</th>
                  <th scope="col">Where</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                {s.buttons.map((b) => (
                  <tr key={b.name}>
                    <th scope="row">{b.name}</th>
                    <td>{b.where}</td>
                    <td>{b.does}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </section>

      <p className="gd-foot">
        Still stuck? In the Designer, open Extras → Help → How the designer works for the tour, or <Link to="/help">tell us what slowed you down</Link>.
      </p>
    </Shell>
  );
}
