import { Link } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";

type Tool = { icon: string; title: string; body: string; to: string; cta: string };

/** Everything that speeds up drawing a play, on one page. The tools live in the Designer's tool panel. */
const DRAW_FASTER: Tool[] = [
  {
    icon: "pen",
    title: "Lacrosse sets",
    body: "Drop a whole offense (2-3-1, 1-4-1, 2-2-2, 1-3-2, man-up 3-3) or a defense in one tap from the Sets tab.",
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
];

export function Tools() {
  return (
    <Shell title="More tools">
      <div className="page-head">
        <div>
          <h2>More tools</h2>
          <p>Lacrosse sets and Saved play format: everything that speeds up drawing.</p>
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
