(function () {
  "use strict";

  const R = window.PFRender;
  const { esc, T } = R;
  let P = window.PROFILE || {};
  let GAMES = R.normalizeAll(window.GAMES);
  const cats = () => P.categories || [];
  const catLabel = (id) => (cats().find((c) => c.id === id) || {}).label || id || "";

  const $ = (sel, root = document) => root.querySelector(sel);
  const eyebrow = (k) => (T(k) ? `<p class="eyebrow">// ${esc(T(k))}</p>` : "");

  function applyTexts() {
    document.querySelectorAll("[data-t]").forEach((el) => {
      const v = T(el.dataset.t);
      el.textContent = v ? (el.dataset.prefix || "") + v : "";
      el.hidden = !v;
    });
  }

  function renderNav() {
    $("#logo").textContent = P.logo || P.name || "";
    document.title = [P.name, P.role].filter(Boolean).join(" | ") || "Portfolio";
    const desc = document.querySelector('meta[name="description"]');
    if (desc && P.intro) desc.setAttribute("content", P.intro);
    const adminLink = $("#admin-link");
    if (adminLink && P.admin && P.admin.showLink === false) adminLink.hidden = true;
  }

  function initNav() {
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

  function renderHero() {
    const parts = String(P.name || "").trim().split(/\s+/);
    const last = parts.length > 1 ? parts.pop() : "";
    const nameHTML = last ? `${esc(parts.join(" "))} <span class="hl">${esc(last)}</span>` : `<span class="hl">${esc(parts[0] || "")}</span>`;
    const cv = P.contact && P.contact.cv;
    const second = cv
      ? (T("heroCv") ? `<a class="btn btn-ghost" href="${esc(cv)}" target="_blank" rel="noopener">${esc(T("heroCv"))}</a>` : "")
      : (T("heroAbout") ? `<a class="btn btn-ghost" href="#apropos">${esc(T("heroAbout"))}</a>` : "");
    $("#hero").innerHTML = `
      ${P.status ? `<span class="status">${esc(P.status)}</span>` : ""}
      <h1>${nameHTML}</h1>
      ${P.role ? `<p class="role">${esc(P.role)}</p>` : ""}
      ${P.intro ? `<p class="intro">${esc(P.intro)}</p>` : ""}
      <div class="hero-cta">
        ${T("heroProjects") ? `<a class="btn btn-accent" href="#projets">${esc(T("heroProjects"))}</a>` : ""}
        ${second}
      </div>`;
  }

  const state = { cat: "all", tech: "all" };

  function renderSpotlight() {
    const g = GAMES.find((x) => x.featured);
    const box = $("#spotlight");
    box.innerHTML = g ? R.spotlightHTML(g, catLabel) : "";
    R.bindHover(box);
  }

  function renderFilters() {
    const usedCats = cats().filter((c) => GAMES.some((g) => g.category === c.id));
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
      ${usedCats.length > 1 ? `<div class="filter-row" role="group" aria-label="${esc(T("filterType"))}">
        ${T("filterType") ? `<span class="filter-label">${esc(T("filterType"))}</span>` : ""}
        ${chip("cat", "all", T("filterAll"), GAMES.length)}
        ${usedCats.map((c) => chip("cat", c.id, c.label, GAMES.filter((g) => g.category === c.id).length)).join("")}
      </div>` : ""}
      ${techs.length > 1 ? `<div class="filter-row" role="group" aria-label="${esc(T("filterTech"))}">
        ${T("filterTech") ? `<span class="filter-label">${esc(T("filterTech"))}</span>` : ""}
        ${chip("tech", "all", T("filterAllTech"), null, true)}
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
    const eb = $("#projects-eyebrow");
    eb.textContent = T("projectsEyebrow") ? `// ${String(GAMES.length).padStart(2, "0")} ${T("projectsEyebrow")}` : "";
    eb.hidden = !T("projectsEyebrow");
  }

  function renderProjects() {
    renderSpotlight();
    renderFilters();
    renderGrid();
  }

  function initProjects() {
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

  function renderAbout() {
    const initials = String(P.name || "?").split(/\s+/).map((w) => w[0] || "").join("").slice(0, 3).toUpperCase();
    const skills = (P.skills || []).filter((s) => s.group || (s.items || []).length);
    $("#about").innerHTML = `
      <div class="about-text">
        <div class="section-head" style="margin-bottom:0">
          ${eyebrow("aboutEyebrow")}
          ${T("aboutTitle") ? `<h2 class="section-title">${esc(T("aboutTitle"))}</h2>` : ""}
        </div>
        <div class="about-id">
          <div class="avatar">${P.avatar ? `<img src="${esc(R.src(P.avatar))}" alt="${esc(P.name)}">` : esc(initials)}</div>
          <div>
            <strong>${esc(P.name)}</strong>
            ${P.location ? `<p class="loc">${esc(P.location)}</p>` : ""}
          </div>
        </div>
        ${(P.about || []).map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>
      ${skills.length ? `<div class="skills">
        ${T("skillsTitle") ? `<h3>${esc(T("skillsTitle"))}</h3>` : ""}
        ${skills.map((s) => `<div class="skill-group">${s.group ? `<p class="eyebrow">${esc(s.group)}</p>` : ""}${R.tagsHTML(s.items || [])}</div>`).join("")}
      </div>` : ""}`;
  }

  function renderTimeline() {
    const items = P.timeline || [];
    $("#parcours").hidden = !items.length;
    const link = document.querySelector('#nav-links a[href="#parcours"]');
    if (link) link.hidden = !items.length || !T("navJourney");
    $("#timeline").innerHTML = items.map((t) => {
      const kind = T(t.type === "work" ? "journeyWork" : "journeyEdu");
      return `
      <li class="tl-item">
        <p class="tl-date">${esc(t.date)}</p>
        <div class="tl-main">
          ${kind ? `<span class="tl-kind">${esc(kind)}</span>` : ""}
          <h3>${esc(t.title)}</h3>
          ${t.place ? `<p class="tl-place">${esc(t.place)}</p>` : ""}
          ${t.text ? `<p class="tl-text">${esc(t.text)}</p>` : ""}
        </div>
      </li>`;
    }).join("");
  }

  function renderContact() {
    const c = P.contact || {};
    const links = (c.links || []).filter((l) => l && l.url);
    $("#contact-box").innerHTML = `
      ${eyebrow("contactEyebrow")}
      ${T("contactTitle") ? `<h2>${esc(T("contactTitle"))}</h2>` : ""}
      ${c.pitch ? `<p class="pitch">${esc(c.pitch)}</p>` : ""}
      ${c.email ? `<div class="email-row">
        <a class="email" href="mailto:${esc(c.email)}">${esc(c.email)}</a>
        ${T("contactCopy") ? `<button class="btn" type="button" id="copy-email">${esc(T("contactCopy"))}</button>` : ""}
      </div>` : ""}
      <div class="contact-links">
        ${links.map((l) => `<a class="btn btn-ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}
        ${c.cv && T("contactCv") ? `<a class="btn btn-accent" href="${esc(R.src(c.cv))}" target="_blank" rel="noopener">${esc(T("contactCv"))}</a>` : ""}
      </div>`;

    const copy = $("#copy-email");
    if (copy) copy.addEventListener("click", () => {
      const done = () => { copy.textContent = T("contactCopied") || T("contactCopy"); setTimeout(() => { copy.textContent = T("contactCopy"); }, 1600); };
      const fallback = () => {
        const r = document.createRange(); r.selectNodeContents($(".email"));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      };
      try { navigator.clipboard.writeText(c.email).then(done, fallback); } catch (e) { fallback(); }
    });

    $("#footer").innerHTML = `
      <span>© ${new Date().getFullYear()} ${esc(P.name)}${T("footerText") ? ` · ${esc(T("footerText"))}` : ""}</span>
      <span class="footer-links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</span>`;
  }

  function renderSite() {
    R.setTexts(P.texts);
    applyTexts();
    renderNav();
    renderHero();
    renderProjects();
    renderAbout();
    renderTimeline();
    renderContact();
  }

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

  function setFicheMenu(open) {
    const menu = $("#fiche-menu");
    const btn = $(".fiche-menu-btn");
    if (!menu || !btn) return;
    menu.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      const cur = menu.querySelector('[aria-current="true"]');
      if (cur) cur.scrollIntoView({ block: "nearest" });
    }
  }
  const ficheMenuOpen = () => { const m = $("#fiche-menu"); return m && !m.hidden; };

  function openProject(id, push = true, keepMedia = false) {
    const g = GAMES.find((x) => x.id === id);
    if (!g) return false;
    const sameProject = current && current.id === g.id;
    const scroll = $("#modal-inner").scrollTop;
    current = g;
    $("#modal-inner").innerHTML = R.ficheHTML(g, catLabel, GAMES);
    showMedia(keepMedia && sameProject ? mediaIndex : 0);
    if (!modal.open) modal.showModal();
    $("#modal-inner").scrollTop = keepMedia && sameProject ? scroll : 0;
    if (push && location.hash !== "#jeu-" + g.id) {
      try { history.pushState(null, "", "#jeu-" + g.id); } catch (e) { }
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
      if (e.target.closest(".fiche-menu-btn")) return setFicheMenu(!ficheMenuOpen());
      const go = e.target.closest("[data-goto]");
      if (go) return openProject(go.dataset.goto, true);
      if (ficheMenuOpen() && !e.target.closest(".fiche-menu")) setFicheMenu(false);
      if (e.target === modal || e.target.closest(".modal-close")) return closeProject();
      if (e.target.closest(".viewer-nav.prev")) return showMedia(mediaIndex - 1);
      if (e.target.closest(".viewer-nav.next")) return showMedia(mediaIndex + 1);
      const t = e.target.closest(".thumb");
      if (t) showMedia(Number(t.dataset.i));
    });
    modal.addEventListener("cancel", (e) => {
      if (ficheMenuOpen()) { e.preventDefault(); setFicheMenu(false); $(".fiche-menu-btn").focus(); }
    });
    modal.addEventListener("keydown", (e) => {
      if (e.target.closest("audio, video, .fiche-menu")) return;
      if (e.key === "ArrowLeft") showMedia(mediaIndex - 1);
      if (e.key === "ArrowRight") showMedia(mediaIndex + 1);
    });
    modal.addEventListener("close", () => {
      $("#modal-inner").innerHTML = "";
      current = null;
      if (location.hash.startsWith("#jeu-")) {
        try { history.replaceState(null, "", "#projets"); } catch (e) { }
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
      if (d.profile) P = d.profile;
      GAMES = R.normalizeAll(d.games);
      const reopen = current && current.id;
      renderSite();
      if (d.open) {
        if (!openProject(d.open, false, d.open === reopen)) closeProject();
      } else {
        closeProject();
        if (d.scrollTo) {
          const target = document.getElementById(d.scrollTo);
          if (target) target.scrollIntoView({ block: "start" });
        }
      }
    });
    window.parent.postMessage({ type: "pf-preview-ready" }, "*");
  }

  initNav();
  initProjects();
  renderSite();
  initModal();
  initPreviewBridge();
})();
