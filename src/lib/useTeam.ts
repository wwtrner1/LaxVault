import { useEffect, useState } from "react";
import { DOCS_LOCAL, DOCS_REMOTE } from "./drills";
import { loadTeam, type TeamBrand } from "./team";

/** The team, kept current when it changes here or arrives from the account. */
export function useTeam(): TeamBrand {
  const [team, setTeam] = useState(loadTeam);
  useEffect(() => {
    const read = () => setTeam(loadTeam());
    window.addEventListener(DOCS_LOCAL, read);
    window.addEventListener(DOCS_REMOTE, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(DOCS_LOCAL, read);
      window.removeEventListener(DOCS_REMOTE, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return team;
}

