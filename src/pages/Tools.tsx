import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";

type Tool = { icon: string; title: string; body: string; to: string; cta: string };

/** Everything that speeds up drawing a play, on one page. The libraries live in the Designer's tool panel. */
const DRAW_FASTER: Tool[] = [
  {
    icon: "pencil",
    title: "Formation library",
    body: "Drop a full offensive set on the field in one click, by game type and personnel.",
    to: "/build",
    cta: "Open the Designer",
  },
  {
    icon: "zone",
    title: "Defense library",
    body: "Show a front and coverage behind your play so the routes read against something.",
    to: "/build",
    cta: "Open the Designer",
  },
  {
    icon: "pen",
    title: "Route tree",
    body: "Pick a route tile and put it on a receiver. Our tree, the five-man set and more tiles are in the panel.",
    to: "/build",
    cta: "Open the Designer",
  },
  {
    icon: "copy",
    title: "Saved play format",
    body: "Save a play's look (colors, lines, text) once, then apply it to any other play from the Designer.",
    to: "/build",
    cta: "Open the Designer",
  },
  {
    icon: "sparkle",
    title: "Starter plays",
    body: "56 ready-made plays you can add to the Vault and change.",
    to: "/starters",
    cta: "Browse starters",
  },
];

export function Tools() {
  return (
    <Shell title="More tools">
      <div className="page-head">
        <div>
          <h2>More tools</h2>
          <p>The formation and defense libraries, the route tree and Saved play format — everything that speeds up drawing a play.</p>
        </div>
      </div>
      <div className="tools-grid">
        {DRAW_FASTER.map((t) => (
          <section key={t.title} className="tools-card">
            <Icon name={t.icon} size={28} />
            <h3>{t.title}</h3>
            <p>{t.body}</p>
            <Link to={t.to} className="btn btn-ghost">
              {t.cta}
            </Link>
          </section>
        ))}
      </div>
    </Shell>
  );
}
