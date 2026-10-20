/* Fonctions d'affichage des projets, partagées par le site (main.js)
   et la page d'administration (admin.js). */
window.PFRender = (function () {
  "use strict";

  const LINK_LABELS = {
    itch: "itch.io", github: "GitHub", steam: "Steam", play: "Jouer en ligne",
    playstore: "Google Play", appstore: "App Store", download: "Télécharger", video: "Vidéo"
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Chemins remplacés par des aperçus locaux (fichiers pas encore publiés).
  let srcMap = {};
  const src = (s) => srcMap[s] || s;
  const setSrcMap = (m) => { srcMap = m || {}; };

  /* ---------- Données ---------- */
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

  /* ---------- Médias ---------- */
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
  // Image introuvable : on affiche la vignette générée à la place.
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
  // Lance l'aperçu vidéo au survol des cartes.
  function bindHover(root) {
    root.querySelectorAll("[data-open]").forEach((el) => {
      const v = el.querySelector("video.hover-prev");
      if (!v) return;
      el.addEventListener("mouseenter", () => { v.play().catch(() => {}); });
      el.addEventListener("mouseleave", () => { v.pause(); v.currentTime = 0; });
    });
  }

  /* ---------- Cartes ---------- */
  function badgesHTML(g) {
    const b = [];
    if (g.featured) b.push(`<span class="badge badge-star">★ À la une</span>`);
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
          <span class="more">Voir la fiche <span class="arrow">→</span></span>
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
          <span class="btn btn-accent btn-sm" style="justify-self:start">Voir la fiche →</span>
        </div>
      </a>`;
  }

  /* ---------- Fiche projet ---------- */
  function stageHTML(g, m) {
    if (!m) return placeholder(g);
    if (m.type === "yt") return `<iframe src="https://www.youtube-nocookie.com/embed/${m.id}" title="${esc(g.title)} — vidéo" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    if (m.type === "video") return `<video src="${esc(src(m.src))}" controls playsinline preload="metadata"></video>`;
    if (m.type === "audio") return `${g.cover ? imgTag(g.cover, g) : placeholder(g)}<audio src="${esc(src(m.src))}" controls preload="metadata"></audio>`;
    return imgTag(m.src, g);
  }

  function ficheHTML(g, catLabel) {
    const items = mediaItems(g);
    const facts = [
      ["Année", g.year], ["Type", catLabel(g.category)], ["Jam", g.jam], ["Durée", g.duration],
      ["Équipe", g.team], ["Rôle", g.role], ["Moteur", g.engine]
    ].filter(([, v]) => v);
    const paragraphs = String(g.description || "").split(/\n\s*\n/).filter((p) => p.trim());
    const thumbIcon = { yt: "▶", video: "▶", audio: "♪" };

    return `
      <button class="modal-close" type="button" aria-label="Fermer la fiche">✕</button>
      <div class="viewer">
        <div class="viewer-stage">
          <div class="stage-media" id="stage-media"></div>
          ${items.length > 1 ? `<button class="viewer-nav prev" type="button" aria-label="Média précédent">←</button>
          <button class="viewer-nav next" type="button" aria-label="Média suivant">→</button>` : ""}
        </div>
        ${items.length > 1 ? `<div class="thumbs">${items.map((m, j) => `
          <button class="thumb" type="button" data-i="${j}" aria-label="Média ${j + 1}">
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
          ${g.highlights.length ? `<h3>Ma contribution</h3><ul class="highlights">${g.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
        </div>
        <aside class="modal-aside">
          ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${g.tech.length ? `<div class="skill-group"><p class="eyebrow">Technos</p>${tagsHTML(g.tech)}</div>` : ""}
          ${g.links.length ? `<div class="modal-links">${g.links.map((l, j) => `<a class="btn ${j === 0 ? "btn-accent" : ""}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <span>↗</span></a>`).join("")}</div>` : ""}
        </aside>
      </div>`;
  }

  return {
    LINK_LABELS, esc, slugify, src, setSrcMap,
    normalizeLinks, normalizeGame, normalizeAll,
    ytId, mediaType, mediaItems, placeholder, fail, coverHTML,
    tagsHTML, cardHTML, spotlightHTML, stageHTML, ficheHTML, bindHover
  };
})();
