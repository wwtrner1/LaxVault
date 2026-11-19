import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

/**
 * Whether the signed-in account is the owner. This only decides what to show:
 * the server checks the owner list again on every /api/admin request.
 * Only a real answer for a signed-in account is remembered; "nobody signed in" or a failed look-up never is.
 */
const known = new Map<string, boolean>();

export function useOwner(): boolean | null {
  const { account, status, renew } = useAuth();
  const [owner, setOwner] = useState<boolean | null>(account ? known.get(account.id) ?? null : null);
  useEffect(() => {
    // Until sign-in has been looked up, we don't know yet: /admin must not bounce the owner on a fresh load.
    if (!account) return setOwner(status === "loading" ? null : false);
    const cached = known.get(account.id);
    if (cached !== undefined) return setOwner(cached);
    let live = true;
    // The account can answer "nobody signed in" while this page still shows a coach (the sign-in cookie ran out).
    // That isn't a "not the owner": refresh the sign-in and ask once more.
    const ask = async () => {
      const r = await api.me();
      if (r.user || !(await renew())) return r;
      return api.me();
    };
    ask()
      .then((r) => {
        const next = Boolean(r.user && r.owner);
        if (r.user) known.set(account.id, next);
        if (live) setOwner(next);
      })
      .catch(() => live && setOwner(false));
    return () => {
      live = false;
    };
  }, [account, status, renew]);
  return owner;
}
