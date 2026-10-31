import { useEffect, useState } from "react";
import { api } from "./api";
import { setBilling } from "./tier";

/** The founding rate's spots: how many of the cap are left (null when Stripe can't say) and whether checkout is open. */
export type Founding = { cap: number; left: number | null; open: boolean };

/** Asked once per page load; every counter on the page shares the answer. */
let pending: Promise<Founding | null> | null = null;

/** The live "X of 250 left" count, or null until it loads (or when the API can't be reached). */
export function useFounding(): Founding | null {
  const [state, setState] = useState<Founding | null>(null);
  useEffect(() => {
    let live = true;
    pending ??= api
      .founding()
      .then((f) => {
        // Public, so it also tells a signed-out visitor that paid plans are on sale.
        if (f.open) setBilling(true);
        return f;
      })
      .catch(() => null);
    pending.then((f) => live && setState(f));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** "212 of 250 spots left", or the plain cap when the count isn't known. */
export function foundingLine(f: Founding | null, cap = 250): string {
  if (f?.left === 0) return `All ${f.cap} founding spots are taken`;
  if (f && f.left !== null) return `${f.left} of ${f.cap} spots left`;
  return `Limited to the first ${f?.cap ?? cap} coaches`;
}
