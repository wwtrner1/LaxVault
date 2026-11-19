// Bundle entry for lax-vault.com (npm run hero:build writes marketing/hero-play.js).
import { mountAll } from "./heroPlay";

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountAll);
else mountAll();
