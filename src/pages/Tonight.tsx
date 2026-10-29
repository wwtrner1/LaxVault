import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "../components/Shell";
import { Icon } from "../components/Icon";
import { loadDrills, saveDrills } from "../lib/drills";
import { clockTimes, loadScript, newPeriod, saveScript } from "../lib/practice";
import { applyPlan } from "../lib/starters";
import { starterDrill } from "../lib/starters/drills";
import { AGE_GROUPS, minuteChoices, NIGHT_KINDS, tonightsPlan, type AgeGroup, type NightKind } from "../lib/starters/tonight";
import { useTier } from "../lib/tier";
import { track } from "../lib/track";
import "../styles/tonight.css";

const PREF = "laxvault.tonight.v1";

function loadPref(): { age: AgeGroup; kind: NightKind; minutes: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(PREF) ?? "null");
    if (raw && AGE_GROUPS.some((a) => a.id === raw.age) && NIGHT_KINDS.some((k) => k.id === raw.kind) && typeof raw.minutes === "number") return raw;
  } catch {
    /* fall through to the defaults */
  }
  return { age: "u12", kind: "practice", minutes: 60 };
}

/**
 * Build tonight's practice: age group, minutes and what kind of night, then
 * one button. The script lands on Practice ready to print or run live.
 */
export function Tonight() {
  const navigate = useNavigate();
  const tier = useTier();
  const first = useMemo(loadPref, []);
  const [age, setAge] = useState<AgeGroup>(first.age);
  const [kind, setKind] = useState<NightKind>(first.kind);
  const minutesList = minuteChoices(age, kind);
  const [minutesPick, setMinutes] = useState(first.minutes);
  const minutes = minutesList.includes(minutesPick) ? minutesPick : minutesList[minutesList.length - 1];
  const [start, setStart] = useState(() => loadScript().start || "18:00");

  const plan = useMemo(() => tonightsPlan(age, kind, minutes), [age, kind, minutes]);
  const times = clockTimes({ name: plan.name, start, periods: plan.periods.map((p) => newPeriod(p.title, p.minutes)) });

  const build = () => {
    const current = loadScript();
    const busy = current.periods.some((p) => p.playIds.length || p.drillIds?.length);
    if (busy && !window.confirm(`Replace "${current.name}" with this plan? Your drills and plays stay in your library.`)) return;
    const res = applyPlan(plan, loadDrills(), tier, { start });
    if (res.added) saveDrills(res.drills);
    saveScript(res.script);
    try {
      localStorage.setItem(PREF, JSON.stringify({ age, kind, minutes }));
    } catch {
      /* the choice just isn't remembered next time */
    }
    track("plan_built", { age, kind, minutes });
    const missNote = res.missed.length ? ` Your free library is full, so ${res.missed.join(", ")} ${res.missed.length === 1 ? "is" : "are"} named in the period note.` : "";
    navigate("/practice", { state: { built: `Tonight's practice is ready: ${minutes} minutes, ${plan.periods.length} periods.${missNote} Print it or run it live.` } });
  };

  return (
    <Shell title="Tonight's practice">
      <div className="page-head">
        <div>
          <h2>Build tonight's practice</h2>
          <p>Three choices and one button. You get a timed script with a drill, setup and coaching points for every period, ready to print or run live at the field.</p>
        </div>
      </div>

      <div className="tn">
        <div className="tn-steps">
          <fieldset className="tn-step">
            <legend>
              <span className="tn-num">1</span> Who are you coaching?
            </legend>
            <div className="tn-choices">
              {AGE_GROUPS.map((a) => (
                <button key={a.id} type="button" className={`tn-choice${age === a.id ? " is-on" : ""}`} aria-pressed={age === a.id} onClick={() => setAge(a.id)}>
                  <b>{a.label}</b>
                  <span>{a.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="tn-step">
            <legend>
              <span className="tn-num">2</span> What kind of night?
            </legend>
            <div className="tn-choices">
              {NIGHT_KINDS.map((k) => (
                <button key={k.id} type="button" className={`tn-choice${kind === k.id ? " is-on" : ""}`} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
                  <b>{k.label}</b>
                  <span>{k.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="tn-step">
            <legend>
              <span className="tn-num">3</span> How long do you have the field?
            </legend>
            <div className="tn-minutes">
              {minutesList.map((m) => (
                <button key={m} type="button" className={`tn-min${minutes === m ? " is-on" : ""}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
              <label className="tn-start">
                <span>Starts at</span>
                <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
            </div>
          </fieldset>
        </div>

        <section className="tn-preview" aria-labelledby="tn-plan-h">
          <h3 id="tn-plan-h">{plan.name}</h3>
          <p className="tn-meta">
            {minutes} minutes · {plan.periods.length} periods · from the {plan.level.toLowerCase()} starter plans
          </p>
          <ol className="tn-periods">
            {plan.periods.map((p, i) => (
              <li key={`${p.title}-${i}`}>
                <span className="tn-time">{times[i]}</span>
                <div>
                  <b>{p.title}</b> <span className="tn-len">{p.minutes} min</span>
                  <p>{p.drills.length ? p.drills.map((k) => starterDrill(k)?.name).filter(Boolean).join(", ") : p.note}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={build}>
            <Icon name="check" size={18} /> Make this tonight's practice
          </button>
          <p className="tn-fine">
            You can change any period after. Want to pick the plan yourself? <Link to="/practice">Open Practice</Link>.
          </p>
        </section>
      </div>
    </Shell>
  );
}
