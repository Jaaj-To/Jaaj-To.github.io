window.PFRender = (function () {
  "use strict";

  const LINK_LABELS = {
    itch: "itch.io", github: "GitHub", steam: "Steam", play: "Jouer en ligne",
    playstore: "Google Play", appstore: "App Store", download: "Télécharger", video: "Vidéo"
  };

  const DEFAULT_TEXTS = {
    navHome: "Accueil",
    navProjects: "Projets",
    navAbout: "À propos",
    navJourney: "Parcours",
    navContact: "Contact",
    navCta: "Me contacter",
    navAdmin: "Admin",
    heroProjects: "Voir mes projets",
    heroCv: "Mon CV ↗",
    heroAbout: "À propos",
    projectsEyebrow: "projets",
    projectsTitle: "Mes jeux",
    filterType: "Type",
    filterTech: "Techno",
    filterAll: "Tous",
    filterAllTech: "Toutes",
    emptyFilters: "Aucun projet ne correspond à ces filtres.",
    resetFilters: "Réinitialiser les filtres",
    badgeFeatured: "À la une",
    cardMore: "Voir la fiche",
    ficheMenu: "Tous les projets",
    ficheContribution: "Ma contribution",
    ficheTech: "Technos",
    factYear: "Année",
    factType: "Type",
    factJam: "Jam",
    factDuration: "Durée",
    factTeam: "Équipe",
    factRole: "Rôle",
    factEngine: "Moteur",
    aboutEyebrow: "À propos",
    aboutTitle: "Qui suis-je ?",
    skillsTitle: "Compétences",
    journeyEyebrow: "Parcours",
    journeyTitle: "Formation & expérience",
    journeyEdu: "Formation",
    journeyWork: "Expérience",
    contactEyebrow: "Contact",
    contactTitle: "On travaille ensemble ?",
    contactCopy: "Copier",
    contactCopied: "Copié",
    contactCv: "Télécharger mon CV",
    footerText: ""
  };

  let texts = { ...DEFAULT_TEXTS };
  const setTexts = (t) => { texts = { ...DEFAULT_TEXTS, ...(t || {}) }; };
  const T = (k) => (texts[k] ?? "");

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let srcMap = {};
  const src = (s) => srcMap[s] || s;
  const setSrcMap = (m) => { srcMap = m || {}; };

  function normalizeLinks(links) {
    if (!links) return [];
    if (Array.isArray(links)) return links.filter((l) => l && l.url);
    return Object.entries(links).filter(([, url]) => url).map(([k, url]) => ({ label: LINK_LABELS[k] || k, url }));
  }
  function normalizeGame(g) {
    return {
      ...g,
      id: g.id || slugify(g.title),
      tech: g.tech || [],
      highlights: g.highlights || [],
      links: normalizeLinks(g.links),
      gallery: [g.video, ...(g.gallery || [])].filter(Boolean)
    };
  }
  const normalizeAll = (list) => (list || []).filter((g) => g && g.title && !g.hidden).map(normalizeGame);

  const ytId = (url) => (String(url).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/) || [])[1];
  function mediaType(url) {
    if (ytId(url)) return "yt";
    if (/\.(mp3|wav|ogg|m4a|flac)(\?|#|$)/i.test(url)) return "audio";
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) return "video";
    return "img";
  }
  function mediaItems(g) {
    const items = g.gallery.length ? g.gallery : (g.cover ? [g.cover] : []);
    return items.map((s) => {
      const type = mediaType(s);
      const id = type === "yt" ? ytId(s) : null;
      const thumb = type === "yt" ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : type === "img" ? s : (g.cover || "");
      return { type, src: s, id, thumb };
    });
  }

  function placeholder(g) {
    return `<div class="ph" style="--ph:${esc(g.color || "#4a4540")}"><span>${esc(g.title)}</span></div>`;
  }
  function fail(img) {
    img.outerHTML = placeholder({ title: img.dataset.title, color: img.dataset.color });
  }
  function imgTag(path, g, extra = "") {
    return `<img src="${esc(src(path))}" alt="${esc(g.title)}" data-title="${esc(g.title)}" data-color="${esc(g.color || "")}" onerror="PFRender.fail(this)" ${extra}>`;
  }
  const coverHTML = (g) => (g.cover ? imgTag(g.cover, g, 'loading="lazy"') : placeholder(g));

  function hoverHTML(g) {
    if (!g.hoverPreview) return "";
    const t = mediaType(g.hoverPreview);
    if (t === "video") return `<video class="hover-prev" src="${esc(src(g.hoverPreview))}" muted loop playsinline preload="none" aria-hidden="true"></video>`;
    if (t === "img") return `<img class="hover-prev" src="${esc(src(g.hoverPreview))}" alt="" aria-hidden="true">`;
    return "";
  }

  function bindHover(root) {
    root.querySelectorAll("[data-open]").forEach((el) => {
      const v = el.querySelector("video.hover-prev");
      if (!v) return;
      el.addEventListener("mouseenter", () => { v.play().catch(() => {}); });
      el.addEventListener("mouseleave", () => { v.pause(); v.currentTime = 0; });
    });
  }

  function badgesHTML(g) {
    const b = [];
    if (g.featured && T("badgeFeatured")) b.push(`<span class="badge badge-star">★ ${esc(T("badgeFeatured"))}</span>`);
    if (g.jam) b.push(`<span class="badge badge-jam">⚑ ${esc(g.jam)}</span>`);
    return b.length ? `<div class="badges">${b.join("")}</div>` : "";
  }
  const metaLine = (g) => [g.year, g.engine, g.duration].filter(Boolean).map(esc).join(" · ");
  function tagsHTML(list, max = Infinity) {
    const shown = list.slice(0, max).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const rest = list.length - max;
    return `<div class="tags">${shown}${rest > 0 ? `<span class="tag tag-more">+${rest}</span>` : ""}</div>`;
  }

  function cardHTML(g, catLabel, i = 0) {
    return `
      <a class="card" href="#jeu-${esc(g.id)}" data-open="${esc(g.id)}" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="media">${badgesHTML(g)}${coverHTML(g)}${hoverHTML(g)}</div>
        <div class="card-body">
          <p class="meta">${[esc(catLabel(g.category)), metaLine(g)].filter(Boolean).join(" · ")}</p>
          <h3>${esc(g.title)}</h3>
          ${g.tagline ? `<p class="tagline">${esc(g.tagline)}</p>` : ""}
          ${tagsHTML(g.tech, 4)}
          <span class="more">${esc(T("cardMore"))} <span class="arrow">→</span></span>
        </div>
      </a>`;
  }

  function spotlightHTML(g, catLabel) {
    return `
      <a class="spotlight" href="#jeu-${esc(g.id)}" data-open="${esc(g.id)}">
        <div class="media">${badgesHTML(g)}${coverHTML(g)}${hoverHTML(g)}</div>
        <div class="spotlight-body">
          <p class="eyebrow">${esc([catLabel(g.category), g.year].filter(Boolean).join(" · "))}</p>
          <h3>${esc(g.title)}</h3>
          ${g.tagline ? `<p class="tagline">${esc(g.tagline)}</p>` : ""}
          ${g.highlights.length ? `<ul>${g.highlights.slice(0, 3).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
          ${tagsHTML(g.tech)}
          <span class="btn btn-accent btn-sm" style="justify-self:start">${esc(T("cardMore"))} →</span>
        </div>
      </a>`;
  }

  function stageHTML(g, m) {
    if (!m) return placeholder(g);
    if (m.type === "yt") return `<iframe src="https://www.youtube-nocookie.com/embed/${m.id}" title="${esc(g.title)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    if (m.type === "video") return `<video src="${esc(src(m.src))}" controls playsinline preload="metadata"></video>`;
    if (m.type === "audio") return `${g.cover ? imgTag(g.cover, g) : placeholder(g)}<audio src="${esc(src(m.src))}" controls preload="metadata"></audio>`;
    return imgTag(m.src, g);
  }

  function menuThumb(g) {
    if (g.cover && mediaType(g.cover) === "img") {
      return `<img src="${esc(src(g.cover))}" alt="" loading="lazy" onerror="this.remove()"><span class="fm-initial" style="--ph:${esc(g.color || "#4a4540")}">${esc(g.title.charAt(0))}</span>`;
    }
    return `<span class="fm-initial" style="--ph:${esc(g.color || "#4a4540")}">${esc(g.title.charAt(0))}</span>`;
  }

  function ficheMenuHTML(g, all) {
    return `
      <div class="fiche-menu-wrap">
        <button class="fiche-menu-btn" type="button" aria-expanded="false" aria-controls="fiche-menu" aria-label="${esc(T("ficheMenu"))}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
        </button>
        <nav class="fiche-menu" id="fiche-menu" hidden aria-label="${esc(T("ficheMenu"))}">
          <p class="fm-title">${esc(T("ficheMenu"))}</p>
          <ul>
            ${all.map((x) => `
              <li>
                <button class="fm-item" type="button" data-goto="${esc(x.id)}" ${x.id === g.id ? 'aria-current="true"' : ""}>
                  <span class="fm-thumb">${menuThumb(x)}</span>
                  <span class="fm-text">
                    <strong>${esc(x.title)}</strong>
                    ${x.tagline ? `<small>${esc(x.tagline)}</small>` : ""}
                    ${x.tech.length ? tagsHTML(x.tech, 3) : ""}
                  </span>
                </button>
              </li>`).join("")}
          </ul>
        </nav>
      </div>`;
  }

  function ficheHTML(g, catLabel, all = []) {
    const items = mediaItems(g);
    const facts = [
      ["factYear", g.year], ["factType", catLabel(g.category)], ["factJam", g.jam], ["factDuration", g.duration],
      ["factTeam", g.team], ["factRole", g.role], ["factEngine", g.engine]
    ].filter(([, v]) => v);
    const paragraphs = String(g.description || "").split(/\n\s*\n/).filter((p) => p.trim());
    const thumbIcon = { yt: "▶", video: "▶", audio: "♪" };

    return `
      <div class="modal-bar">
        ${all.length > 1 ? ficheMenuHTML(g, all) : "<span></span>"}
        <button class="modal-close" type="button" aria-label="Fermer">✕</button>
      </div>
      <div class="viewer">
        <div class="viewer-stage">
          <div class="stage-media" id="stage-media"></div>
          ${items.length > 1 ? `<button class="viewer-nav prev" type="button" aria-label="←">←</button>
          <button class="viewer-nav next" type="button" aria-label="→">→</button>` : ""}
        </div>
        ${items.length > 1 ? `<div class="thumbs">${items.map((m, j) => `
          <button class="thumb" type="button" data-i="${j}" aria-label="${j + 1}">
            ${m.thumb ? `<img src="${esc(src(m.thumb))}" alt="" loading="lazy" onerror="this.remove()">` : ""}
            ${thumbIcon[m.type] ? `<span class="play">${thumbIcon[m.type]}</span>` : ""}
          </button>`).join("")}</div>` : ""}
      </div>
      <div class="modal-body">
        <div class="modal-main">
          <p class="eyebrow">${esc([catLabel(g.category), g.jam].filter(Boolean).join(" · "))}</p>
          <h2 id="modal-title">${esc(g.title)}</h2>
          ${g.tagline ? `<p class="tagline">${esc(g.tagline)}</p>` : ""}
          ${paragraphs.length ? `<div class="prose">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
          ${g.highlights.length ? `${T("ficheContribution") ? `<h3>${esc(T("ficheContribution"))}</h3>` : ""}<ul class="highlights">${g.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
        </div>
        <aside class="modal-aside">
          ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(T(k))}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${g.tech.length ? `<div class="skill-group">${T("ficheTech") ? `<p class="eyebrow">${esc(T("ficheTech"))}</p>` : ""}${tagsHTML(g.tech)}</div>` : ""}
          ${g.links.length ? `<div class="modal-links">${g.links.map((l, j) => `<a class="btn ${j === 0 ? "btn-accent" : ""}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <span>↗</span></a>`).join("")}</div>` : ""}
        </aside>
      </div>`;
  }

  return {
    LINK_LABELS, DEFAULT_TEXTS, setTexts, T, esc, slugify, src, setSrcMap,
    normalizeLinks, normalizeGame, normalizeAll,
    ytId, mediaType, mediaItems, placeholder, fail, coverHTML,
    tagsHTML, cardHTML, spotlightHTML, stageHTML, ficheHTML, bindHover
  };
})();
