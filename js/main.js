/* Génère tout le site à partir de data/profile.js et data/games.js.
   Pas besoin de toucher à ce fichier pour ajouter un jeu. */
(function () {
  "use strict";

  const R = window.PFRender;
  const { esc } = R;
  const P = window.PROFILE || {};
  const CATS = P.categories || [];
  const catLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || id || "";
  let GAMES = R.normalizeAll(window.GAMES);

  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- Style (sombre / carnet) ---------- */
  const STYLE_KEY = "pf-style";
  const ICONS = {
    dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
    sketch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`
  };
  function applyStyle(style) {
    document.documentElement.dataset.style = style;
    const next = style === "dark" ? "sketch" : "dark";
    const btn = $("#style-toggle");
    btn.innerHTML = `${ICONS[next]}<span class="lbl">${next === "sketch" ? "Carnet" : "Sombre"}</span>`;
    btn.setAttribute("aria-label", next === "sketch" ? "Passer au style carnet" : "Passer au style sombre");
  }
  function initStyle() {
    let saved = null;
    try { saved = localStorage.getItem(STYLE_KEY); } catch (e) { /* stockage indisponible */ }
    applyStyle(saved || P.defaultStyle || "dark");
    $("#style-toggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.style === "dark" ? "sketch" : "dark";
      applyStyle(next);
      try { localStorage.setItem(STYLE_KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- Nav ---------- */
  function initNav() {
    $("#logo").textContent = P.logo || P.name || "Portfolio";
    document.title = [P.name, P.role].filter(Boolean).join(" | ") || "Portfolio";
    const adminLink = $("#admin-link");
    if (adminLink && P.admin && P.admin.showLink === false) adminLink.hidden = true;

    const nav = $("#nav");
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const menuBtn = $("#menu-btn");
    const links = $("#nav-links");
    const setMenu = (open) => {
      links.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", () => setMenu(!links.classList.contains("open")));
    links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });

    // Lien actif selon la section visible
    const anchors = [...links.querySelectorAll('a[href^="#"]')];
    const sections = anchors.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          anchors.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    const parts = String(P.name || "").trim().split(/\s+/);
    const last = parts.length > 1 ? parts.pop() : "";
    const nameHTML = last ? `${esc(parts.join(" "))} <span class="hl">${esc(last)}</span>` : `<span class="hl">${esc(parts[0] || "")}</span>`;
    $("#hero").innerHTML = `
      ${P.status ? `<span class="status">${esc(P.status)}</span>` : ""}
      <h1>${nameHTML}</h1>
      ${P.role ? `<p class="role">${esc(P.role)}</p>` : ""}
      ${P.intro ? `<p class="intro">${esc(P.intro)}</p>` : ""}
      <div class="hero-cta">
        <a class="btn btn-accent" href="#projets">Voir mes projets</a>
        ${P.contact && P.contact.cv ? `<a class="btn btn-ghost" href="${esc(P.contact.cv)}" target="_blank" rel="noopener">Mon CV ↗</a>` : `<a class="btn btn-ghost" href="#apropos">À propos</a>`}
      </div>`;
  }

  /* ---------- Projets ---------- */
  const state = { cat: "all", tech: "all" };

  function renderSpotlight() {
    const g = GAMES.find((x) => x.featured);
    const box = $("#spotlight");
    box.innerHTML = g ? R.spotlightHTML(g, catLabel) : "";
    R.bindHover(box);
  }

  function renderFilters() {
    const usedCats = CATS.filter((c) => GAMES.some((g) => g.category === c.id));
    const techCount = {};
    GAMES.forEach((g) => g.tech.forEach((t) => { techCount[t] = (techCount[t] || 0) + 1; }));
    const techs = Object.keys(techCount).sort((a, b) => techCount[b] - techCount[a] || a.localeCompare(b));
    if (state.cat !== "all" && !usedCats.some((c) => c.id === state.cat)) state.cat = "all";
    if (state.tech !== "all" && !techCount[state.tech]) state.tech = "all";

    const chip = (kind, value, label, count, small) =>
      `<button type="button" class="chip${small ? " chip-sm" : ""}" data-kind="${kind}" data-value="${esc(value)}" aria-pressed="${state[kind] === value}">
        ${esc(label)}${count != null ? `<span class="count">${count}</span>` : ""}
      </button>`;

    $("#filters").innerHTML = `
      ${usedCats.length > 1 ? `<div class="filter-row" role="group" aria-label="Filtrer par catégorie">
        <span class="filter-label">Type</span>
        ${chip("cat", "all", "Tous", GAMES.length)}
        ${usedCats.map((c) => chip("cat", c.id, c.label, GAMES.filter((g) => g.category === c.id).length)).join("")}
      </div>` : ""}
      ${techs.length > 1 ? `<div class="filter-row" role="group" aria-label="Filtrer par technologie">
        <span class="filter-label">Techno</span>
        ${chip("tech", "all", "Toutes", null, true)}
        ${techs.map((t) => chip("tech", t, t, null, true)).join("")}
      </div>` : ""}`;
  }

  function renderGrid() {
    const list = GAMES.filter((g) =>
      (state.cat === "all" || g.category === state.cat) &&
      (state.tech === "all" || g.tech.includes(state.tech)));
    const grid = $("#grid");
    grid.innerHTML = list.map((g, i) => R.cardHTML(g, catLabel, i)).join("");
    R.bindHover(grid);
    $("#empty").hidden = list.length > 0;
    $("#projects-eyebrow").textContent = `// ${String(GAMES.length).padStart(2, "0")} projets`;
  }

  function renderProjects() {
    renderSpotlight();
    renderFilters();
    renderGrid();
  }

  function initProjects() {
    renderProjects();
    $("#filters").addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      state[btn.dataset.kind] = btn.dataset.value;
      document.querySelectorAll(`.chip[data-kind="${btn.dataset.kind}"]`).forEach((c) => c.setAttribute("aria-pressed", String(c === btn)));
      renderGrid();
    });
    $("#reset-filters").addEventListener("click", () => {
      state.cat = "all"; state.tech = "all";
      renderFilters(); renderGrid();
    });
  }

  /* ---------- À propos ---------- */
  function renderAbout() {
    const initials = String(P.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
    const skills = P.skills || [];
    $("#about").innerHTML = `
      <div class="about-text">
        <div class="section-head" style="margin-bottom:0">
          <p class="eyebrow">// À propos</p>
          <h2 class="section-title">Qui suis-je ?</h2>
        </div>
        <div class="about-id">
          <div class="avatar">${P.avatar ? `<img src="${esc(P.avatar)}" alt="${esc(P.name)}">` : esc(initials)}</div>
          <div>
            <strong>${esc(P.name)}</strong>
            ${P.location ? `<p class="loc">${esc(P.location)}</p>` : ""}
          </div>
        </div>
        ${(P.about || []).map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>
      ${skills.length ? `<div class="skills">
        <h3>Compétences</h3>
        ${skills.map((s) => `<div class="skill-group"><p class="eyebrow">${esc(s.group)}</p>${R.tagsHTML(s.items || [])}</div>`).join("")}
      </div>` : ""}`;
  }

  /* ---------- Parcours ---------- */
  function renderTimeline() {
    const items = P.timeline || [];
    if (!items.length) { $("#parcours").hidden = true; document.querySelector('a[href="#parcours"]').hidden = true; return; }
    $("#timeline").innerHTML = items.map((t) => `
      <li class="tl-item">
        <p class="tl-date">${esc(t.date)}</p>
        <div class="tl-main">
          <span class="tl-kind">${t.type === "work" ? "Expérience" : "Formation"}</span>
          <h3>${esc(t.title)}</h3>
          ${t.place ? `<p class="tl-place">${esc(t.place)}</p>` : ""}
          ${t.text ? `<p class="tl-text">${esc(t.text)}</p>` : ""}
        </div>
      </li>`).join("");
  }

  /* ---------- Contact & footer ---------- */
  function renderContact() {
    const c = P.contact || {};
    const links = c.links || [];
    $("#contact-box").innerHTML = `
      <p class="eyebrow">// Contact</p>
      <h2>On travaille ensemble ?</h2>
      ${c.pitch ? `<p class="pitch">${esc(c.pitch)}</p>` : ""}
      ${c.email ? `<div class="email-row">
        <a class="email" href="mailto:${esc(c.email)}">${esc(c.email)}</a>
        <button class="btn" type="button" id="copy-email">Copier</button>
      </div>` : ""}
      <div class="contact-links">
        ${links.map((l) => `<a class="btn btn-ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}
        ${c.cv ? `<a class="btn btn-accent" href="${esc(c.cv)}" target="_blank" rel="noopener">Télécharger mon CV</a>` : ""}
      </div>`;

    const copy = $("#copy-email");
    if (copy) copy.addEventListener("click", () => {
      const done = () => { copy.textContent = "Copié"; setTimeout(() => { copy.textContent = "Copier"; }, 1600); };
      const fallback = () => {
        const r = document.createRange(); r.selectNodeContents($(".email"));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        copy.textContent = "Sélectionné";
      };
      try { navigator.clipboard.writeText(c.email).then(done, fallback); } catch (e) { fallback(); }
    });

    $("#footer").innerHTML = `
      <span>© ${new Date().getFullYear()} ${esc(P.name)}</span>
      <span class="footer-links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</span>`;
  }

  /* ---------- Fiche projet ---------- */
  const modal = $("#modal");
  let current = null;
  let mediaIndex = 0;

  function showMedia(i) {
    const items = R.mediaItems(current);
    const stage = $("#stage-media");
    if (!stage) return;
    if (!items.length) { stage.innerHTML = R.placeholder(current); return; }
    mediaIndex = (i + items.length) % items.length;
    stage.innerHTML = R.stageHTML(current, items[mediaIndex]);
    modal.querySelectorAll(".thumb").forEach((t, j) => t.setAttribute("aria-current", String(j === mediaIndex)));
  }

  function openProject(id, push = true, keepMedia = false) {
    const g = GAMES.find((x) => x.id === id);
    if (!g) return false;
    const sameProject = current && current.id === g.id;
    const scroll = $("#modal-inner").scrollTop;
    current = g;
    $("#modal-inner").innerHTML = R.ficheHTML(g, catLabel);
    showMedia(keepMedia && sameProject ? mediaIndex : 0);
    if (!modal.open) modal.showModal();
    $("#modal-inner").scrollTop = keepMedia && sameProject ? scroll : 0;
    if (push && location.hash !== "#jeu-" + g.id) {
      try { history.pushState(null, "", "#jeu-" + g.id); } catch (e) { /* historique indisponible */ }
    }
    return true;
  }

  function closeProject() {
    if (modal.open) modal.close();
  }

  function initModal() {
    document.addEventListener("click", (e) => {
      const card = e.target.closest("[data-open]");
      if (card) { e.preventDefault(); openProject(card.dataset.open); }
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".modal-close")) return closeProject();
      if (e.target.closest(".viewer-nav.prev")) return showMedia(mediaIndex - 1);
      if (e.target.closest(".viewer-nav.next")) return showMedia(mediaIndex + 1);
      const t = e.target.closest(".thumb");
      if (t) showMedia(Number(t.dataset.i));
    });
    modal.addEventListener("keydown", (e) => {
      if (e.target.closest("audio, video")) return;
      if (e.key === "ArrowLeft") showMedia(mediaIndex - 1);
      if (e.key === "ArrowRight") showMedia(mediaIndex + 1);
    });
    modal.addEventListener("close", () => {
      $("#modal-inner").innerHTML = ""; // coupe vidéos, sons et iframes
      current = null;
      if (location.hash.startsWith("#jeu-")) {
        try { history.replaceState(null, "", "#projets"); } catch (e) { /* ignore */ }
      }
    });
    const fromHash = () => {
      const m = location.hash.match(/^#jeu-(.+)$/);
      if (m) openProject(decodeURIComponent(m[1]), false);
      else closeProject();
    };
    window.addEventListener("popstate", fromHash);
    fromHash();
  }

  /* ---------- Aperçu en direct depuis la page admin ---------- */
  // Quand le site est affiché dans l'aperçu de admin.html, l'admin envoie
  // les projets en cours d'édition et les fichiers pas encore publiés.
  function initPreviewBridge() {
    if (window.parent === window) return;
    let urls = {};
    window.addEventListener("message", (e) => {
      if (e.source !== window.parent || !e.data || e.data.type !== "pf-preview") return;
      const d = e.data;
      if (d.files) {
        Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
        urls = {};
        Object.entries(d.files).forEach(([path, blob]) => { urls[path] = URL.createObjectURL(blob); });
        R.setSrcMap(urls);
      }
      if (d.style) document.documentElement.dataset.style = d.style;
      GAMES = R.normalizeAll(d.games);
      const reopen = current && current.id;
      renderProjects();
      if (d.open) {
        if (!openProject(d.open, false, d.open === reopen)) closeProject();
      } else {
        closeProject();
        if (d.scroll) $("#projets").scrollIntoView({ block: "start" });
      }
    });
    window.parent.postMessage({ type: "pf-preview-ready" }, "*");
  }

  /* ---------- Démarrage ---------- */
  initStyle();
  initNav();
  renderHero();
  initProjects();
  renderAbout();
  renderTimeline();
  renderContact();
  initModal();
  initPreviewBridge();
})();
