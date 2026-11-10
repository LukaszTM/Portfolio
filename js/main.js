/* ===== UZUPEŁNIJ: dane kontaktowe =====
   Puste pole oznacza, że przycisk się nie pokaże.
   email:    np. "imie.nazwisko@gmail.com"
   linkedin: np. "https://www.linkedin.com/in/twoj-profil"
   cv:       np. "cv.pdf" (plik wgrany obok index.html)
   where:    lokalizacja widoczna w ramce „Czego szukam" */
const PROFILE = {
  email: "",
  linkedin: "",
  cv: "",
  where: "Województwo lubelskie"
};

(function () {
  // kontakt
  const email = document.getElementById("c-email");
  const linkedin = document.getElementById("c-linkedin");
  const cv = document.getElementById("c-cv");
  if (PROFILE.email) { email.href = "mailto:" + PROFILE.email; email.hidden = false; }
  if (PROFILE.linkedin) { linkedin.href = PROFILE.linkedin; linkedin.hidden = false; }
  if (PROFILE.cv) { cv.href = PROFILE.cv; cv.hidden = false; }
  if (!PROFILE.email) { document.getElementById("c-github").classList.add("primary"); }
  if (PROFILE.where) { document.getElementById("where").textContent = PROFILE.where; }

  // zwrotnica: wybór roli
  const PATHS = ["ai", "android", "python"];
  const tabs = Array.from(document.querySelectorAll(".switch-tab"));
  const tracks = Array.from(document.querySelectorAll(".switch path[data-track]"));
  const pitches = Array.from(document.querySelectorAll("[data-pitch]"));
  const panel = document.getElementById("pitch");
  const list = document.getElementById("project-list");
  const projects = Array.from(list.querySelectorAll(".project"));

  function setPath(path, opts) {
    if (PATHS.indexOf(path) === -1) { path = "ai"; }
    tabs.forEach(function (tab) {
      const on = tab.dataset.path === path;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on) { panel.setAttribute("aria-labelledby", tab.id); }
    });
    tracks.forEach(function (track) {
      const on = track.dataset.track === path;
      track.classList.toggle("is-set", on);
      if (on) { track.parentNode.appendChild(track); }
    });
    pitches.forEach(function (p) { p.hidden = p.dataset.pitch !== path; });
    projects
      .slice()
      .sort(function (a, b) { return Number(a.dataset[path]) - Number(b.dataset[path]); })
      .forEach(function (project) {
        project.classList.toggle("is-key", Number(project.dataset[path]) <= 3);
        list.appendChild(project);
      });
    if (opts && opts.remember) {
      const url = new URL(window.location.href);
      url.searchParams.set("rola", path);
      try { history.replaceState(null, "", url); } catch (e) { /* podgląd bez adresu */ }
    }
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { setPath(tab.dataset.path, { remember: true }); });
    tab.addEventListener("keydown", function (event) {
      let next = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") { next = tabs[(i + 1) % tabs.length]; }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") { next = tabs[(i + tabs.length - 1) % tabs.length]; }
      if (next) { event.preventDefault(); next.focus(); setPath(next.dataset.path, { remember: true }); }
    });
  });

  let start = "ai";
  try { start = new URLSearchParams(window.location.search).get("rola") || "ai"; } catch (e) { /* zostaje domyślna */ }
  setPath(start);
})();
