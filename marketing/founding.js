// The live "X of 250 left" count for the Founding Coach card. /api/founding is proxied to the app
// (netlify.toml). Without it the card keeps its plain "first 250 coaches" line.
(function () {
  var el = document.getElementById("founding-spots");
  if (!el || !window.fetch) return;
  fetch("/api/founding", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (f) {
      if (!f || !f.open || typeof f.left !== "number") return;
      el.textContent = f.left === 0 ? "All " + f.cap + " founding spots are taken" : f.left + " of " + f.cap + " spots left";
    })
    .catch(function () {});
})();
