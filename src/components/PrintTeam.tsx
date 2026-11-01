import { gateBranding, type Tier } from "../lib/plan";
import { hasTeam, inkOn } from "../lib/team";
import { useTeam } from "../lib/useTeam";

/** The team band at the top of a printed practice script or drill cards (Coach and up). */
export function PrintTeam({ tier }: { tier: Tier }) {
  const team = useTeam();
  if (!gateBranding(tier).ok || !hasTeam(team)) return null;
  return (
    <div className="print-team" style={{ background: team.secondary, color: inkOn(team.secondary), borderBottom: `4px solid ${team.primary}` }}>
      {team.logo && <img src={team.logo} alt="" />}
      {team.name && <b>{team.name}</b>}
    </div>
  );
}
