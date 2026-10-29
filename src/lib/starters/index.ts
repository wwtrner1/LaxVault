import { newDrill, type Drill } from "../drills";
import { gateSave, type Tier } from "../plan";
import { newPeriod, type Script } from "../practice";
import type { Scene, StoredPlay } from "../types";
import { starterScene } from "./diagram";
import { starterDrill, type StarterDrill } from "./drills";
import type { StarterPlan } from "./plans";

export { STARTER_DRILLS } from "./drills";
export { STARTER_PLAYS } from "./plays";
export { STARTER_PLANS, planMinutes } from "./plans";

/** The diagram scene for a starter drill. */
export const starterDrillScene = (s: StarterDrill): Scene => starterScene(`drill-${s.key}`, s.sketch);

/** A drill's diagram: the Vault play it points at, or else the starter it came from. */
export function drillDiagram(d: Drill, playById: Map<string, StoredPlay>): { scene: Scene; name: string } | undefined {
  const play = d.playId ? playById.get(d.playId) : undefined;
  if (play) return { scene: play.scene, name: play.name };
  const s = d.starterId ? starterDrill(d.starterId) : undefined;
  return s ? { scene: starterDrillScene(s), name: s.name } : undefined;
}

/** A coach's own copy of a starter drill. */
export function drillFromStarter(s: StarterDrill): Drill {
  const { key, levels: _levels, sketch: _sketch, ...rest } = s;
  return { ...newDrill(s.name, s.category), ...rest, equipment: [...s.equipment], coachingPoints: [...s.coachingPoints], players: { ...s.players }, starterId: key };
}

export type PlanResult = { script: Script; drills: Drill[]; added: number; missed: string[] };

/**
 * A starter plan as the coach's script. Drills the library already has from a
 * starter are reused; the rest are added while the plan's cap allows, and any
 * that don't fit stay as a name in the period's note.
 */
export function applyPlan(plan: StarterPlan, drills: Drill[], tier: Tier, keep: Pick<Script, "start">): PlanResult {
  const lib = [...drills];
  const missed: string[] = [];
  let added = 0;
  const idFor = (key: string): string | undefined => {
    const have = lib.find((d) => d.starterId === key);
    if (have) return have.id;
    const s = starterDrill(key);
    if (!s) return undefined;
    if (!gateSave(tier, lib.length).ok) {
      missed.push(s.name);
      return undefined;
    }
    const d = drillFromStarter(s);
    lib.unshift(d);
    added++;
    return d.id;
  };
  const periods = plan.periods.map((p) => {
    const ids = p.drills.map(idFor);
    const left = p.drills.filter((_, i) => !ids[i]).map((k) => starterDrill(k)?.name).filter(Boolean);
    const note = left.length ? `${p.note} (${left.join(", ")})`.slice(0, 120) : p.note;
    return { ...newPeriod(p.title, p.minutes, note), drillIds: ids.filter((x): x is string => !!x) };
  });
  return { script: { name: plan.name, start: keep.start, periods }, drills: lib, added, missed: [...new Set(missed)] };
}
