import { useRef, useState } from "react";
import { gateBranding, type Tier } from "../lib/plan";
import { DEFAULT_TEAM, inkOn, logoFromFile, saveTeam } from "../lib/team";
import { useTeam } from "../lib/useTeam";
import { askUpgrade } from "../lib/upgrade";
import { useToast } from "../lib/toast";

/**
 * Account → Your team: name, logo and two colors. Any coach can set them up
 * and see the preview; they print on scripts, drill cards and playbook PDFs,
 * head live practice mode and dress the player link with Coach and up.
 */
export function TeamCard({ tier }: { tier: Tier }) {
  const team = useTeam();
  const toast = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState(false);
  const gate = gateBranding(tier);

  const pick = async (f: File) => {
    setBusy(true);
    try {
      saveTeam({ ...team, logo: await logoFromFile(f) });
      toast("Logo saved.");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card team-card">
      <h3>Your team</h3>
      <p>Your team's name, logo and colors on practice scripts, drill cards, playbook PDFs, live practice mode and the player link.</p>
      <div className="team-row">
        <div className="team-preview" style={{ background: team.secondary, color: inkOn(team.secondary), borderBottom: `6px solid ${team.primary}` }} aria-label="Preview">
          {team.logo ? <img src={team.logo} alt="Your logo" /> : <span className="team-nologo">Logo</span>}
          <b>{team.name || "Team name"}</b>
        </div>
        <div className="team-fields">
          <label className="field">
            <span>Team name</span>
            <input
              className="input"
              value={name}
              maxLength={60}
              placeholder="Riverside U14 Boys"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() !== team.name && saveTeam({ ...team, name: name.trim() })}
            />
          </label>
          <div className="chip-row">
            <label className="team-color">
              <input type="color" value={team.primary} onChange={(e) => saveTeam({ ...team, primary: e.target.value })} />
              Main color
            </label>
            <label className="team-color">
              <input type="color" value={team.secondary} onChange={(e) => saveTeam({ ...team, secondary: e.target.value })} />
              Second color
            </label>
          </div>
          <div className="chip-row">
            <button type="button" className="btn btn-ghost" onClick={() => file.current?.click()} disabled={busy}>
              {busy ? "Saving…" : team.logo ? "Change logo" : "Add logo"}
            </button>
            {team.logo && (
              <button type="button" className="btn btn-quiet" onClick={() => saveTeam({ ...team, logo: undefined })}>
                Remove logo
              </button>
            )}
            {(team.name || team.logo || team.primary !== DEFAULT_TEAM.primary || team.secondary !== DEFAULT_TEAM.secondary) && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  saveTeam({ ...DEFAULT_TEAM });
                  setName("");
                }}
              >
                Clear
              </button>
            )}
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden onChange={(e) => (e.target.files?.[0] && void pick(e.target.files[0]), (e.target.value = ""))} />
          <small className="hint">Square logos look best. It's shrunk to a small image here, so any size works.</small>
        </div>
      </div>
      {!gate.ok && (
        <p className="team-gate">
          Set it up now and see the preview. It shows on your prints, live mode and player link with Coach.{" "}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => askUpgrade(gate)}>
            {gate.cta}
          </button>
        </p>
      )}
    </section>
  );
}
