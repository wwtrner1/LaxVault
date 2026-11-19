import { useEffect, useRef } from "react";
import { mountHeroPlay } from "../lib/heroPlay";

/** The animated play window for the app's own pages (the same code lax-vault.com loads). */
export function HeroPlayWindow({ href = "/build", label }: { href?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? mountHeroPlay(ref.current, { href, label }) : undefined), [href, label]);
  return <div ref={ref} className="hero-play-host" />;
}
