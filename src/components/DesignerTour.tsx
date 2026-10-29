import { useState } from "react";
import { Modal } from "./Modal";

const TOUR_KEY = "laxvault.tour.v1";

/** Whether this browser has seen the walkthrough (it opens by itself once). */
export const tourSeen = () => {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return true;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* storage blocked — it may show again next visit */
  }
};

type Slide = { title: string; touch: string; mouse: string; art: React.ReactNode };

/** A strip of field the slides draw on. */
function Field({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="tour-art" aria-hidden="true">
      <rect width="320" height="180" rx="10" fill="#fff" />
      {[30, 90, 150].map((y) => (
        <rect key={y} x="0" y={y} width="320" height="30" fill="#f2f6f9" />
      ))}
      <line x1="10" y1="104" x2="310" y2="104" stroke="#0b1524" strokeWidth="2" strokeDasharray="7 5" />
      {children}
    </svg>
  );
}

const Token = ({ x, y, label, fill, cls = "" }: { x: number; y: number; label: string; fill: string; cls?: string }) => (
  <g className={cls} style={{ transformOrigin: `${x}px ${y}px` }}>
    <circle cx={x} cy={y} r="11" fill={fill} />
    <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Saira Condensed, sans-serif">
      {label}
    </text>
  </g>
);

const Finger = ({ x, y, cls }: { x: number; y: number; cls: string }) => (
  <circle cx={x} cy={y} r="13" className={`tour-finger ${cls}`} style={{ transformOrigin: `${x}px ${y}px` }} />
);

const FOOTBALL_SLIDES: Slide[] = [
  {
    title: "Put players on the field",
    touch: "Tap Players in the bar at the bottom, then tap a position to drop it. For a whole set at once, open Tools → Sets → Formations.",
    mouse: "Drag a player from Offense · Defense onto the field, or click it to drop it in the middle. Libraries · Layers → Formations drops a whole set.",
    art: (
      <Field>
        <Token x={90} y={116} label="X" fill="#1e4fd8" cls="tour-drop d1" />
        <Token x={160} y={116} label="C" fill="#16c8e8" cls="tour-drop d2" />
        <Token x={160} y={146} label="Q" fill="#111" cls="tour-drop d3" />
        <Token x={240} y={116} label="Z" fill="#1d7a50" cls="tour-drop d4" />
      </Field>
    ),
  },
  {
    title: "Draw a route",
    touch: "Tap Route, then press on the player and drag the route out with your finger; it straightens into clean legs when you lift. Or tap the player, each turn and the end, then double-tap the last point or tap Finish line.",
    mouse: "Pick a line tool (press L for a straight route), click the player, each turn and the end, then double-click or press Enter.",
    art: (
      <Field>
        <Token x={90} y={116} label="X" fill="#1e4fd8" />
        <path d="M90 116 L90 56 L170 30" fill="none" stroke="#0b1524" strokeWidth="3" strokeLinecap="round" className="tour-draw" />
        <circle cx="90" cy="56" r="4" fill="#0b1524" className="tour-dot d2" />
        <circle cx="170" cy="30" r="4" fill="#0b1524" className="tour-dot d3" />
        <Finger x={90} y={56} cls="tour-tap d2" />
        <Finger x={170} y={30} cls="tour-tap d3" />
      </Field>
    ),
  },
  {
    title: "Move it, change it",
    touch: "Tap a player to select him. If he's part of a formation, the whole group is framed and labelled; tap him again to pick just him. His routes light up, so you can see what moves with him. Press and hold for Duplicate, Delete, Lock and more.",
    mouse: "Drag to move; the route follows. Right-click a player for Duplicate, Delete, Lock and more. Delete removes, Ctrl+C and Ctrl+V copy and paste (even onto another play), Ctrl+D duplicates, Ctrl+Z undoes.",
    art: (
      <Field>
        <g className="tour-slide">
          <Token x={110} y={116} label="Z" fill="#1d7a50" />
          <path d="M110 116 L110 60 L60 36" fill="none" stroke="#0b1524" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="tour-menu">
          <rect x="196" y="40" width="94" height="74" rx="6" fill="#0b1524" />
          {["Duplicate", "Lock", "Delete"].map((t, i) => (
            <text key={t} x="208" y={62 + i * 20} fontSize="11" fill={t === "Delete" ? "#ffb4a8" : "#fff"} fontFamily="Barlow, sans-serif">
              {t}
            </text>
          ))}
        </g>
      </Field>
    ),
  },
  {
    title: "Zoom in to edit",
    touch: "Pinch anywhere on the field to zoom the play (the page itself stays put). Drag the empty field with one finger to move around, or double-tap a spot to jump straight to it. − Fit + sit by your thumb. No need to turn the phone sideways, but you can.",
    mouse: "Ctrl + scroll, or pinch on a trackpad, zooms around the pointer. Fit puts the whole field back.",
    art: (
      <Field>
        <g className="tour-zoom" style={{ transformOrigin: "160px 104px" }}>
          <Token x={140} y={116} label="Y" fill="#d24b3e" />
          <Token x={180} y={116} label="H" fill="#f28c28" />
        </g>
        <Finger x={130} y={80} cls="tour-pinch-a" />
        <Finger x={190} y={130} cls="tour-pinch-b" />
      </Field>
    ),
  },
  {
    title: "Or just say the play",
    touch: "Tap the mic and call it: “Trips right, X go, Z post, H flat.” It keeps listening until you tap Done. Say “scratch that” to take back the last part. Check the chips, then Yes, draw it.",
    mouse: "Type the call, or click the mic and say it. It keeps listening until you click Done. Check the chips, then Yes, draw it.",
    art: (
      <svg viewBox="0 0 320 180" className="tour-art" aria-hidden="true">
        <rect width="320" height="180" rx="10" fill="#0b1524" />
        <rect x="20" y="30" width="200" height="34" rx="6" fill="#132138" />
        <text x="32" y="52" fontSize="12" fill="#fff" fontFamily="Barlow, sans-serif" className="tour-type">
          Trips right, X go, Z post
        </text>
        <circle cx="252" cy="47" r="17" fill="#0ea2be" className="tour-mic" />
        <rect x="246" y="38" width="12" height="14" rx="6" fill="#0b1524" />
        {["Trips Right", "X · go", "Z · post"].map((c, i) => (
          <g key={c} className={`tour-chip d${i + 2}`}>
            <rect x={20 + i * 96} y="96" width="88" height="26" rx="4" fill="#26405f" />
            <text x={30 + i * 96} y="113" fontSize="11" fill="#cfe2f0" fontFamily="IBM Plex Mono, monospace">
              {c}
            </text>
          </g>
        ))}
      </svg>
    ),
  },
  {
    title: "Save it, then print it",
    touch: "Save play keeps it in your Vault. Add it to a playbook, drop it into a practice plan, or print it for the sideline.",
    mouse: "Save play keeps it in your Vault. Add it to a playbook, drop it into a practice plan, or print it for the sideline.",
    art: (
      <svg viewBox="0 0 320 180" className="tour-art" aria-hidden="true">
        <rect width="320" height="180" rx="10" fill="#0b1524" />
        <rect x="24" y="70" width="90" height="34" rx="6" fill="#0ea2be" className="tour-save" />
        <text x="69" y="92" textAnchor="middle" fontSize="12" fontWeight="700" fill="#04212a" fontFamily="Saira Condensed, sans-serif">
          SAVE PLAY
        </text>
        <g className="tour-band">
          <rect x="150" y="40" width="146" height="100" rx="8" fill="#fff" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={160 + (i % 2) * 66} y={50 + Math.floor(i / 2) * 44} width="58" height="36" rx="3" fill="#f2f6f9" stroke="#ccd7e5" />
          ))}
        </g>
      </svg>
    ),
  },
];

/**
 * The designer walkthrough: six short animated slides covering the moves a
 * coach makes most. Opens by itself the first time, and from More or the
 * Tools guide whenever it's wanted.
 */
/** The offensive end of a lacrosse field: goal and crease up top, box lines and the restraining line. */
function LaxField({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="tour-art" aria-hidden="true">
      <rect width="320" height="180" rx="10" fill="#fff" />
      <g stroke="#cbdae4" strokeWidth="2" fill="none">
        <line x1="60" y1="0" x2="60" y2="150" />
        <line x1="260" y1="0" x2="260" y2="150" />
        <line x1="0" y1="150" x2="320" y2="150" />
        <circle cx="160" cy="46" r="20" fill="#f5f8fa" />
        <polygon points="152,46 160,36 168,46" strokeLinejoin="round" />
      </g>
      {children}
    </svg>
  );
}

const LAX_SLIDES: Slide[] = [
  {
    title: "Put players on the field",
    touch: "Tap Players in the bar at the bottom, then tap a position to drop it: A attack, M midfield, D defense, G goalie. The ball and cones are there too. Tools → Sets drops a whole set.",
    mouse: "Drag a player from Offense · Defense onto the field, or click it to drop it in the middle. Offense is the team with the ball; Defense draws in triangles. The Sets tab drops a whole 2-3-1 or a man-down box in one tap.",
    art: (
      <LaxField>
        <Token x={110} y={70} label="A" fill="#1e4fd8" cls="tour-drop d1" />
        <Token x={210} y={70} label="A" fill="#1e4fd8" cls="tour-drop d2" />
        <Token x={160} y={18} label="A" fill="#1e4fd8" cls="tour-drop d3" />
        <Token x={160} y={128} label="M" fill="#1d7a50" cls="tour-drop d4" />
      </LaxField>
    ),
  },
  {
    title: "Draw the movement",
    touch: "Tap a line tool, then press on the player and drag out the dodge or cut; it straightens into clean legs when you lift. Dashed is a pass. Double-tap the last point or tap Finish line.",
    mouse: "Pick Cut on the floating toolbar (or press 1), click the player, each turn and the end, then double-click or press Enter. Pass is the dashed line, Dodge the wavy one, Pick ends in a flat bar.",
    art: (
      <LaxField>
        <Token x={160} y={128} label="M" fill="#1d7a50" />
        <Token x={210} y={70} label="A" fill="#1e4fd8" />
        <path d="M160 128 L120 100 L118 76" fill="none" stroke="#0b1524" strokeWidth="3" strokeLinecap="round" className="tour-draw" />
        <path d="M210 70 L172 120" fill="none" stroke="#0b1524" strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" className="tour-draw" />
        <circle cx="118" cy="76" r="4" fill="#0b1524" className="tour-dot d2" />
        <Finger x={118} y={76} cls="tour-tap d2" />
      </LaxField>
    ),
  },
  {
    ...FOOTBALL_SLIDES[2],
    touch: "Tap a player to select it; a popup says what it is and what you can do, and the bar at the bottom has Duplicate, Delete and Lock. Press and hold for everything else.",
    mouse: "Click anything and a popup says what it is, with its most used actions. Drag to move; the player's lines follow. Right-click for the full menu. Delete removes, Ctrl+C and Ctrl+V copy and paste (even onto another drill), Ctrl+D duplicates, Ctrl+Z undoes.",
    art: (
      <LaxField>
        <g className="tour-slide">
          <Token x={110} y={110} label="M" fill="#1d7a50" />
          <path d="M110 110 L90 70" fill="none" stroke="#0b1524" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="tour-menu">
          <rect x="196" y="40" width="94" height="74" rx="6" fill="#0b1524" />
          {["Duplicate", "Lock", "Delete"].map((t, i) => (
            <text key={t} x="208" y={62 + i * 20} fontSize="11" fill={t === "Delete" ? "#ffb4a8" : "#fff"} fontFamily="Barlow, sans-serif">
              {t}
            </text>
          ))}
        </g>
      </LaxField>
    ),
  },
  {
    ...FOOTBALL_SLIDES[3],
    touch: "Pinch anywhere on the field to zoom the drawing (the page itself stays put). Drag the empty field with one finger to move around, or double-tap a spot to jump straight to it. − Fit + sit by your thumb.",
    art: (
      <LaxField>
        <g className="tour-zoom" style={{ transformOrigin: "160px 90px" }}>
          <Token x={140} y={90} label="A" fill="#1e4fd8" />
          <Token x={180} y={90} label="M" fill="#1d7a50" />
        </g>
        <Finger x={130} y={60} cls="tour-pinch-a" />
        <Finger x={190} y={120} cls="tour-pinch-b" />
      </LaxField>
    ),
  },
  {
    ...FOOTBALL_SLIDES[3],
    title: "Make room for the field",
    touch: "Open the tools with Tools at the top left and close them with Done. Details on the top bar opens the play panel.",
    mouse: "The teal tabs on each edge of the field tuck the tools panel and the Selection · Play panel away, and bring them back. Ctrl+\\ hides or shows both at once.",
    art: (
      <LaxField>
        <rect x="4" y="44" width="14" height="72" rx="4" fill="#19C3AE" />
        <rect x="302" y="44" width="14" height="72" rx="4" fill="#19C3AE" />
        <Token x={140} y={90} label="A" fill="#1e4fd8" />
        <Token x={180} y={90} label="M" fill="#1d7a50" />
        <Finger x={12} y={80} cls="tour-tap d2" />
      </LaxField>
    ),
  },
  {
    ...FOOTBALL_SLIDES[5],
    title: "Save it, then coach it",
    touch: "Save keeps the diagram in your Vault. Attach it to a drill on Drills, put the drill in tonight's practice, and run it live at the field.",
    mouse: "Save keeps the diagram in your Vault. Attach it to a drill on Drills, put the drill in tonight's practice, and run it live at the field. The Guide in the side menu shows what every button does.",
  },
];

const SLIDES = LAX_SLIDES;

export function DesignerTour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const close = () => {
    markSeen();
    onClose();
  };
  return (
    <Modal
      title="How the designer works"
      onClose={close}
      footer={
        <>
          <span className="tour-count" aria-live="polite">
            {i + 1} of {SLIDES.length}
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => setI((n) => n - 1)} disabled={i === 0}>
            Back
          </button>
          <button type="button" className="btn btn-primary" onClick={() => (last ? close() : setI((n) => n + 1))}>
            {last ? "Start drawing" : "Next"}
          </button>
        </>
      }
    >
      <div className="tour">
        {/* Keyed so each slide's animation starts from the top. */}
        <div className="tour-stage" key={i}>
          {s.art}
        </div>
        <h3 className="tour-title">{s.title}</h3>
        <p className="tour-text">{touch ? s.touch : s.mouse}</p>
        <div className="tour-dots" role="tablist" aria-label="Slides">
          {SLIDES.map((d, n) => (
            <button
              key={d.title}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`${n + 1}: ${d.title}`}
              className={n === i ? "is-on" : ""}
              onClick={() => setI(n)}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
