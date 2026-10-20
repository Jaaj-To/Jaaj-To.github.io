(function () {
  "use strict";

  const R = window.PFRender;
  const { esc, slugify } = R;
  const P0 = window.PROFILE || {};
  const CFG = { owner: "", repo: "", branch: "main", ...(P0.admin || {}) };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const AUTH_KEY = "pf-admin-auth";
  const DRAFT_KEY = "pf-admin-draft";
  const MAX_MB = 25;
  const KEY_ORDER = ["id", "title", "tagline", "description", "category", "jam", "featured", "hidden", "year", "duration", "team", "role", "engine", "tech", "highlights", "cover", "hoverPreview", "gallery", "links", "color"];
  const TYPE_LABEL = { img: "Image", video: "Vidéo", audio: "Son", yt: "YouTube" };
  const ENGINES = ["Unity", "Godot", "Unreal Engine", "GameMaker", "Construct", "Bevy", "Love2D", "Pico-8", "RPG Maker"];
  const COLORS = ["#c28a2c", "#2f7a8c", "#3d4f6b", "#b4495a", "#5d7a5a", "#7b4bb3", "#a8553a", "#2d6a4f"];

  const SITE_PAGES = [
    { key: "profile", label: "Profil", section: "accueil" },
    { key: "about", label: "À propos & compétences", section: "apropos" },
    { key: "journey", label: "Parcours", section: "parcours" },
    { key: "contact", label: "Contact", section: "contact" },
    { key: "categories", label: "Catégories", section: "projets" },
    { key: "texts", label: "Textes du site", section: "accueil" }
  ];

  const TEXT_GROUPS = [
    ["Menu", [
      ["navHome", "Accueil"], ["navProjects", "Projets"], ["navAbout", "À propos"], ["navJourney", "Parcours"],
      ["navContact", "Contact"], ["navCta", "Bouton en haut à droite"], ["navAdmin", "Lien Admin"]
    ]],
    ["Accueil", [
      ["heroProjects", "Bouton principal"], ["heroCv", "Bouton CV"], ["heroAbout", "Bouton secondaire sans CV"]
    ]],
    ["Projets", [
      ["projectsEyebrow", "Petit titre après le nombre"], ["projectsTitle", "Titre de la section"],
      ["filterType", "Libellé du filtre par type"], ["filterAll", "Filtre : tous les types"],
      ["filterTech", "Libellé du filtre par techno"], ["filterAllTech", "Filtre : toutes les technos"],
      ["badgeFeatured", "Badge à la une"], ["cardMore", "Lien des cartes"],
      ["emptyFilters", "Message sans résultat"], ["resetFilters", "Bouton de réinitialisation"]
    ]],
    ["Fiche projet", [
      ["ficheMenu", "Menu de tous les projets"], ["ficheContribution", "Titre de la contribution"], ["ficheTech", "Titre des technos"],
      ["factYear", "Année"], ["factType", "Type"], ["factJam", "Jam"], ["factDuration", "Durée"],
      ["factTeam", "Équipe"], ["factRole", "Rôle"], ["factEngine", "Moteur"]
    ]],
    ["À propos", [
      ["aboutEyebrow", "Petit titre"], ["aboutTitle", "Titre"], ["skillsTitle", "Titre des compétences"]
    ]],
    ["Parcours", [
      ["journeyEyebrow", "Petit titre"], ["journeyTitle", "Titre"], ["journeyEdu", "Étiquette formation"], ["journeyWork", "Étiquette expérience"]
    ]],
    ["Contact", [
      ["contactEyebrow", "Petit titre"], ["contactTitle", "Titre"], ["contactCopy", "Bouton copier"],
      ["contactCopied", "Bouton après copie"], ["contactCv", "Bouton CV"]
    ]],
    ["Pied de page", [
      ["footerText", "Texte après le nom"]
    ]]
  ];

  const LIST_TEMPLATES = {
    skills: () => ({ group: "", items: [] }),
    timeline: () => ({ type: "edu", date: "", title: "", place: "", text: "" }),
    "contact.links": () => ({ label: "", url: "" }),
    categories: () => ({ id: uniqueCatId(), label: "Nouvelle catégorie" })
  };

  const S = {
    mode: null,
    auth: null,
    games: [],
    profile: null,
    adminBlock: { ...(P0.admin || {}) },
    view: "game",
    selected: null,
    published: "[]",
    publishedProfile: "{}",
    pending: {},
    blobUrls: {},
    filesVersion: 0,
    sentFilesVersion: -1,
    frameReady: false,
    previewMode: "fiche",
    previewOpen: window.innerWidth >= 1280,
    busy: false
  };

  const uid = () => Math.random().toString(36).slice(2, 10);
  const current = () => (S.view === "game" ? S.games.find((g) => g._uid === S.selected) || null : null);
  const gameId = (g) => g.id || slugify(g.title || "Sans titre");
  const cats = () => (S.profile && S.profile.categories) || [];
  const catLabel = (id) => (cats().find((c) => c.id === id) || {}).label || id || "";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function uniqueCatId() {
    let i = cats().length + 1;
    while (cats().some((c) => c.id === `cat-${i}`)) i++;
    return `cat-${i}`;
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function safeName(name) {
    const dot = name.lastIndexOf(".");
    const base = slugify(dot > 0 ? name.slice(0, dot) : name) || "fichier";
    const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    return ext ? `${base}.${ext}` : base;
  }
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    const bin = atob(String(b64).replace(/\s/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  function fileToB64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function storageRemove(key) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) { }
  }
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[/^\d+$/.test(k) ? Number(k) : k]), obj);
  }
  function setPath(obj, path, value) {
    const parts = path.split(".");
    let o = obj;
    parts.slice(0, -1).forEach((k, i) => {
      const key = /^\d+$/.test(k) ? Number(k) : k;
      if (o[key] == null) o[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      o = o[key];
    });
    const last = parts[parts.length - 1];
    o[/^\d+$/.test(last) ? Number(last) : last] = value;
  }

  function toEditable(g) {
    const e = { ...g };
    e.links = R.normalizeLinks(g.links).map((l) => ({ label: l.label, url: l.url }));
    e.gallery = [g.video, ...(g.gallery || [])].filter(Boolean);
    delete e.video;
    e.tech = [...(g.tech || [])];
    e.highlights = [...(g.highlights || [])];
    e._uid = uid();
    return e;
  }

  function toSaved(g) {
    const out = {};
    const keys = [...KEY_ORDER, ...Object.keys(g).filter((k) => !KEY_ORDER.includes(k))];
    keys.forEach((k) => {
      if (k.startsWith("_") || !(k in g)) return;
      let v = g[k];
      if (v === undefined || v === null || v === false) return;
      if (typeof v === "string") { v = v.trim(); if (!v) return; }
      if (Array.isArray(v)) {
        v = k === "links"
          ? v.filter((l) => l && String(l.url || "").trim()).map((l) => ({ label: String(l.label || "").trim() || "Lien", url: String(l.url).trim() }))
          : v.map((x) => String(x).trim()).filter(Boolean);
        if (!v.length) return;
      }
      out[k] = v;
    });
    return out;
  }

  function toEditableProfile(p) {
    const src = clone(p || {});
    delete src.admin;
    delete src.defaultStyle;
    const c = src.contact || {};
    return {
      ...src,
      name: src.name || "",
      logo: src.logo || "",
      role: src.role || "",
      status: src.status || "",
      location: src.location || "",
      intro: src.intro || "",
      avatar: src.avatar || "",
      about: [...(src.about || [])],
      skills: (src.skills || []).map((s) => ({ group: s.group || "", items: [...(s.items || [])] })),
      timeline: (src.timeline || []).map((t) => ({ type: t.type === "work" ? "work" : "edu", date: t.date || "", title: t.title || "", place: t.place || "", text: t.text || "" })),
      contact: { pitch: c.pitch || "", email: c.email || "", cv: c.cv || "", links: (c.links || []).map((l) => ({ label: l.label || "", url: l.url || "" })) },
      categories: (src.categories || []).map((x) => ({ id: x.id, label: x.label || "" })),
      texts: { ...R.DEFAULT_TEXTS, ...(src.texts || {}) }
    };
  }

  function profileSaved() {
    const p = S.profile;
    const t = (v) => String(v ?? "").trim();
    const texts = {};
    Object.keys(R.DEFAULT_TEXTS).forEach((k) => { texts[k] = t(p.texts[k]); });
    Object.keys(p.texts).forEach((k) => { if (!(k in texts)) texts[k] = t(p.texts[k]); });
    const out = {
      name: t(p.name),
      logo: t(p.logo),
      role: t(p.role),
      status: t(p.status),
      location: t(p.location),
      intro: t(p.intro),
      avatar: t(p.avatar),
      about: p.about.map(t).filter(Boolean),
      skills: p.skills.map((s) => ({ group: t(s.group), items: s.items.map(t).filter(Boolean) })).filter((s) => s.group || s.items.length),
      timeline: p.timeline.map((x) => ({ type: x.type, date: t(x.date), title: t(x.title), place: t(x.place), text: t(x.text) })).filter((x) => x.date || x.title || x.place || x.text),
      contact: {
        pitch: t(p.contact.pitch),
        email: t(p.contact.email),
        cv: t(p.contact.cv),
        links: p.contact.links.filter((l) => t(l.url)).map((l) => ({ label: t(l.label) || "Lien", url: t(l.url) }))
      },
      categories: p.categories.filter((c) => c.id).map((c) => ({ id: c.id, label: t(c.label) || c.id })),
      texts
    };
    const known = new Set(["name", "logo", "role", "status", "location", "intro", "avatar", "about", "skills", "timeline", "contact", "categories", "texts", "admin", "defaultStyle"]);
    Object.keys(p).forEach((k) => { if (!known.has(k)) out[k] = p[k]; });
    out.admin = S.adminBlock;
    return out;
  }

  const savedList = () => S.games.map(toSaved);
  const snapshot = () => JSON.stringify(savedList());
  const profileSnapshot = () => JSON.stringify(profileSaved());
  const gamesDirty = () => snapshot() !== S.published;
  const profileDirty = () => !!S.profile && profileSnapshot() !== S.publishedProfile;
  const isDirty = () => gamesDirty() || profileDirty();

  function usedPendingPaths() {
    const used = new Set();
    S.games.forEach((g) => [g.cover, g.hoverPreview, ...(g.gallery || [])].forEach((p) => p && used.add(String(p).trim())));
    if (S.profile) [S.profile.avatar, S.profile.contact.cv].forEach((p) => p && used.add(String(p).trim()));
    return Object.keys(S.pending).filter((p) => used.has(p));
  }

  const gamesFileContent = () => `window.GAMES = ${JSON.stringify(savedList(), null, 2)};\n`;
  const profileFileContent = () => `window.PROFILE = ${JSON.stringify(profileSaved(), null, 2)};\n`;

  function parseDataFile(code, key) {
    const w = {};
    new Function("window", code)(w);
    if (!w[key]) throw new Error(`window.${key} introuvable.`);
    return w[key];
  }

  const saveDraft = debounce(() => {
    try {
      if (isDirty()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ games: savedList(), profile: profileSaved(), savedAt: Date.now() }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch (e) { }
  }, 400);
  const clearDraft = () => storageRemove(DRAFT_KEY);

  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");

  async function gh(path, opts = {}) {
    const a = S.auth;
    const base = opts.root ? "https://api.github.com" : `https://api.github.com/repos/${encodeURIComponent(CFG.owner)}/${encodeURIComponent(CFG.repo)}`;
    const res = await fetch(`${base}${path}`, {
      method: opts.method || "GET",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${a.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {})
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (res.status === 404 && opts.allow404) return null;
    if (!res.ok) {
      let msg = "";
      try { msg = (await res.json()).message || ""; } catch (e) { }
      const err = new Error(msg || res.statusText);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  const getFile = (p) => gh(`/contents/${encPath(p)}?ref=${encodeURIComponent(CFG.branch)}`, { allow404: true });
  const putFile = (p, content, message, sha) => gh(`/contents/${encPath(p)}`, {
    method: "PUT",
    body: { message, content, branch: CFG.branch, ...(sha ? { sha } : {}) }
  });

  function ghMessage(err) {
    if (err instanceof TypeError) return "Impossible de joindre GitHub. Vérifie ta connexion internet.";
    switch (err.status) {
      case 401: return "GitHub refuse ce token : il est invalide ou a expiré.";
      case 403: return "GitHub refuse l'accès. Vérifie que le token a la permission « Contents : Read and write » sur ce dépôt.";
      case 404: return "Dépôt ou branche introuvable.";
      case 409: return "Le dépôt a changé pendant l'envoi. Clique à nouveau sur Publier.";
      case 422: return `GitHub a refusé le fichier : ${err.message}`;
      default: return err.message || "Erreur inconnue.";
    }
  }

  function toast(msg, kind = "") {
    const t = $("#toast");
    t.textContent = msg;
    t.className = `toast ${kind}`;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, kind === "error" ? 9000 : 5000);
  }

  function setBanner(html, kind = "") {
    const b = $("#banner");
    if (!html) { b.hidden = true; b.innerHTML = ""; return; }
    b.className = `banner ${kind}`;
    b.innerHTML = html;
    b.hidden = false;
  }

  function showLogin(error) {
    $("#app").hidden = true;
    $("#login").hidden = false;
    document.title = "Connexion | Admin du portfolio";
    $("#gh-user").value = CFG.owner;
    $("#gh-token").value = "";
    const e = $("#login-error");
    e.textContent = error || "";
    e.hidden = !error;
    $("#gh-token").focus();
  }

  function showApp() {
    $("#login").hidden = true;
    $("#app").hidden = false;
    document.title = "Admin du portfolio";
    const pill = $("#mode-pill");
    pill.textContent = `${S.auth.login} · ${CFG.owner}/${CFG.repo}`;
    pill.className = "mode-pill online";
    applyPreviewOpen();
  }

  function renderSaveState(text) {
    const el = $("#save-state");
    if (text) { el.textContent = text; el.className = "save-state busy"; return; }
    const dirty = isDirty();
    const files = usedPendingPaths().length;
    if (dirty || files) {
      const parts = [];
      if (dirty) parts.push("modifications non publiées");
      if (files) parts.push(`${files} fichier${files > 1 ? "s" : ""} à envoyer`);
      el.textContent = parts.join(" · ").replace(/^./, (c) => c.toUpperCase());
      el.className = "save-state dirty";
    } else {
      el.textContent = "Tout est publié";
      el.className = "save-state";
    }
    $("#publish-btn").disabled = S.busy;
  }

  async function authenticate(token) {
    if (!CFG.owner || !CFG.repo) throw new Error("Accès refusé.");
    S.auth = { token, login: "" };
    let user;
    try {
      user = await gh("/user", { root: true });
    } catch (err) {
      if (err.status === 401 || err.status === 403) throw new Error("Accès refusé.");
      throw err;
    }
    if (!user || String(user.login).toLowerCase() !== CFG.owner.toLowerCase()) throw new Error("Accès refusé.");
    const repo = await gh("");
    if (!repo.permissions || repo.permissions.push !== true) throw new Error("Accès refusé.");
    S.auth.login = user.login;
  }

  async function onLogin(e) {
    e.preventDefault();
    const token = $("#gh-token").value.trim();
    const btn = $("#login-btn");
    btn.disabled = true;
    btn.textContent = "Connexion…";
    $("#login-error").hidden = true;
    try {
      await authenticate(token);
      try {
        const store = $("#remember").checked ? localStorage : sessionStorage;
        storageRemove(AUTH_KEY);
        store.setItem(AUTH_KEY, JSON.stringify({ token }));
      } catch (err) { }
      await startGithub();
    } catch (err) {
      S.auth = null;
      const box = $("#login-error");
      box.textContent = err.status || err instanceof TypeError ? ghMessage(err) : err.message;
      box.hidden = false;
      $("#gh-token").value = "";
    } finally {
      btn.disabled = false;
      btn.textContent = "Se connecter";
    }
  }

  async function startGithub() {
    S.mode = "github";
    showApp();
    setBanner("Chargement depuis GitHub…");
    let games = window.GAMES || [];
    let profile = P0;
    try {
      const [gf, pf] = await Promise.all([getFile("data/games.js"), getFile("data/profile.js")]);
      if (gf && gf.content) games = parseDataFile(b64ToUtf8(gf.content), "GAMES");
      if (pf && pf.content) profile = parseDataFile(b64ToUtf8(pf.content), "PROFILE");
      setBanner("");
    } catch (err) {
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        storageRemove(AUTH_KEY);
        S.auth = null;
        S.mode = null;
        showLogin("Accès refusé.");
        return;
      }
      setBanner(`Impossible de lire les données sur GitHub (${esc(err.status ? ghMessage(err) : err.message)}). Les données affichées viennent de la version en ligne du site.`, "error");
    }
    loadData(games, profile);
  }

  function loadData(games, profile) {
    if (profile.admin) S.adminBlock = { ...profile.admin };
    S.games = games.map(toEditable);
    S.profile = toEditableProfile(profile);
    S.published = snapshot();
    S.publishedProfile = profileSnapshot();
    const draft = storageGet(DRAFT_KEY);
    if (draft && Array.isArray(draft.games)) {
      const draftProfile = draft.profile ? toEditableProfile(draft.profile) : null;
      const differs = JSON.stringify(draft.games) !== S.published || (draftProfile && JSON.stringify(draft.profile) !== S.publishedProfile);
      if (differs) {
        S.games = draft.games.map(toEditable);
        if (draftProfile) S.profile = draftProfile;
        const when = new Date(draft.savedAt || Date.now()).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
        setBanner(`Brouillon non publié du ${esc(when)} restauré. <button class="link-btn" type="button" data-act="discard-draft">Revenir à la version publiée</button>`, "info");
      }
    }
    S.view = "game";
    S.selected = S.games[0] ? S.games[0]._uid : null;
    if (!S.selected) S.view = "profile";
    renderAll();
  }

  function logout() {
    storageRemove(AUTH_KEY);
    if (isDirty()) toast("Tes modifications non publiées sont gardées en brouillon dans ce navigateur.");
    S.mode = null;
    S.auth = null;
    setBanner("");
    showLogin();
  }

  function smallThumb(g) {
    const initial = `<span class="pl-initial" style="--ph:${esc(g.color || "#4a4540")}">${esc((g.title || "?").charAt(0))}</span>`;
    if (g.cover && R.mediaType(g.cover) === "img") return `<img src="${esc(R.src(g.cover))}" alt="" onerror="this.remove()">${initial}`;
    return initial;
  }

  function renderList() {
    $("#site-list").innerHTML = SITE_PAGES.map((p) => `
      <li class="pl-item${S.view === p.key ? " selected" : ""}">
        <button class="pl-main site-item" type="button" data-act="site" data-page="${p.key}" aria-current="${S.view === p.key}">
          <span class="pl-text"><strong>${esc(p.label)}</strong></span>
        </button>
      </li>`).join("");

    $("#list-count").textContent = `${S.games.length} projet${S.games.length > 1 ? "s" : ""}`;
    $("#project-list").innerHTML = S.games.map((g, i) => {
      const sel = S.view === "game" && g._uid === S.selected;
      return `
      <li class="pl-item${sel ? " selected" : ""}${g.hidden ? " is-hidden" : ""}">
        <button class="pl-main" type="button" data-act="select" data-uid="${g._uid}" aria-current="${sel}">
          <span class="pl-thumb">${smallThumb(g)}</span>
          <span class="pl-text">
            <strong>${esc(g.title || "Sans titre")}</strong>
            <small>${esc([catLabel(g.category), g.year].filter(Boolean).join(" · ")) || "&nbsp;"}</small>
          </span>
          ${g.hidden ? `<span class="pl-flag">Masqué</span>` : g.featured ? `<span class="pl-flag star" title="À la une">★</span>` : ""}
        </button>
        <span class="pl-order">
          <button class="icon-btn" type="button" data-act="up" data-uid="${g._uid}" aria-label="Monter ${esc(g.title)}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-btn" type="button" data-act="down" data-uid="${g._uid}" aria-label="Descendre ${esc(g.title)}" ${i === S.games.length - 1 ? "disabled" : ""}>↓</button>
        </span>
      </li>`;
    }).join("");

    const techs = new Set();
    S.games.forEach((g) => (g.tech || []).forEach((t) => techs.add(t)));
    if (S.profile) S.profile.skills.forEach((s) => s.items.forEach((t) => techs.add(t.replace(/\s*\(.*\)$/, ""))));
    $("#tech-list").innerHTML = [...techs].filter(Boolean).sort().map((t) => `<option value="${esc(t)}"></option>`).join("");
  }

  function field(label, f, value, attrs = "", cls = "") {
    return `<label class="field ${cls}"><span>${label}</span><input data-f="${f}" value="${esc(value ?? "")}" ${attrs}></label>`;
  }
  function pfield(label, path, attrs = "", cls = "") {
    return `<label class="field ${cls}"><span>${label}</span><input data-p="${path}" value="${esc(getPath(S.profile, path) ?? "")}" ${attrs}></label>`;
  }
  function parea(label, path, rows = 4, kind = "", value = null) {
    const v = value != null ? value : getPath(S.profile, path) ?? "";
    return `<label class="field"><span>${label}</span><textarea data-p="${path}" ${kind ? `data-kind="${kind}"` : ""} rows="${rows}">${esc(v)}</textarea></label>`;
  }

  function mediaThumb(path) {
    const type = R.mediaType(path);
    if (/\.pdf(\?|#|$)/i.test(path)) return `<span class="mt-icon">PDF</span>`;
    if (type === "yt") return `<img src="https://img.youtube.com/vi/${R.ytId(path)}/mqdefault.jpg" alt=""><span class="mt-badge">▶</span>`;
    if (type === "audio") return `<span class="mt-icon">♪</span>`;
    if (type === "video") return `<video src="${esc(R.src(path))}" muted preload="metadata"></video><span class="mt-badge">▶</span>`;
    return `<img src="${esc(R.src(path))}" alt="" onerror="this.parentNode.classList.add('missing');this.remove()">`;
  }

  const pendingHint = (path) => (S.pending[path] ? `<span class="pending">Nouveau fichier, envoyé à la publication.</span>` : "");

  function mediaBlock(value, inputAttr, label, hint, accept, uploadTarget, clearAttr) {
    return `
      <div class="media-field">
        <div class="mf-thumb">${value ? mediaThumb(value) : `<span class="mt-empty">Aucun</span>`}</div>
        <div class="mf-body">
          <label class="field"><span>${label}</span><input ${inputAttr} value="${esc(value)}" placeholder="assets/… ou https://…" spellcheck="false"></label>
          <div class="mf-actions">
            <label class="btn btn-sm file-btn">Importer un fichier<input type="file" accept="${accept}" data-upload="${uploadTarget}"></label>
            ${value ? `<button class="btn btn-sm btn-ghost" type="button" ${clearAttr}>Retirer</button>` : ""}
          </div>
          <p class="hint">${pendingHint(value) || hint}</p>
        </div>
      </div>`;
  }

  const mediaField = (f, label, hint, accept) =>
    mediaBlock(current()[f] || "", `data-f="${f}"`, label, hint, accept, f, `data-act="clear-media" data-f="${f}"`);
  const profileMedia = (path, label, hint, accept) =>
    mediaBlock(getPath(S.profile, path) || "", `data-p="${path}"`, label, hint, accept, `p:${path}`, `data-act="clear-p" data-p="${path}"`);

  function rowActions(list, i, len) {
    return `
      <div class="row-actions">
        <button class="icon-btn" type="button" data-act="list-up" data-list="${list}" data-i="${i}" aria-label="Monter" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-btn" type="button" data-act="list-down" data-list="${list}" data-i="${i}" aria-label="Descendre" ${i === len - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-btn danger" type="button" data-act="list-remove" data-list="${list}" data-i="${i}" aria-label="Supprimer">✕</button>
      </div>`;
  }

  const PANELS = {
    info(g) {
      const list = cats().some((c) => c.id === g.category) || !g.category ? cats() : [...cats(), { id: g.category, label: g.category }];
      return `
        <h2>Infos</h2>
        <div class="field-grid">
          ${field("Titre", "title", g.title, 'required maxlength="80"', "span-2")}
          ${field("Accroche", "tagline", g.tagline, 'maxlength="140"', "span-2")}
          <label class="field"><span>Catégorie</span>
            <select data-f="category">
              <option value="">Aucune</option>
              ${list.map((c) => `<option value="${esc(c.id)}" ${c.id === g.category ? "selected" : ""}>${esc(c.label)}</option>`).join("")}
            </select>
          </label>
          ${field("Game jam", "jam", g.jam)}
          ${field("Année", "year", g.year, 'inputmode="numeric"')}
          ${field("Durée", "duration", g.duration)}
          ${field("Équipe", "team", g.team)}
          ${field("Mon rôle", "role", g.role)}
          ${field("Moteur", "engine", g.engine, 'list="engine-list"')}
          <label class="field"><span>Couleur de la vignette</span>
            <span class="color-row"><input type="color" data-f="color" value="${esc(/^#[0-9a-f]{6}$/i.test(g.color || "") ? g.color : "#4a4540")}"></span>
          </label>
        </div>
        <datalist id="engine-list">${ENGINES.map((e) => `<option value="${esc(e)}"></option>`).join("")}</datalist>
        <div class="toggles">
          <label class="check"><input type="checkbox" data-f="featured" ${g.featured ? "checked" : ""}> Mettre à la une</label>
          <label class="check"><input type="checkbox" data-f="hidden" ${g.hidden ? "checked" : ""}> Masquer du site</label>
        </div>`;
    },
    desc(g) {
      return `
        <h2>Description</h2>
        <label class="field"><span>Texte de la fiche</span>
          <textarea data-f="description" rows="7">${esc(g.description || "")}</textarea>
        </label>
        <label class="field"><span>Ma contribution, un point par ligne</span>
          <textarea data-f="highlights" data-kind="lines" rows="4">${esc((g.highlights || []).join("\n"))}</textarea>
        </label>`;
    },
    tech(g) {
      return `
        <h2>Technos</h2>
        <div class="chips-input" id="chips-input">
          ${(g.tech || []).map((t, i) => `<span class="chip-tag">${esc(t)}<button type="button" data-act="tech-remove" data-i="${i}" aria-label="Retirer ${esc(t)}">✕</button></span>`).join("")}
          <input id="tech-input" list="tech-list" placeholder="Ajouter…" aria-label="Ajouter une techno" spellcheck="false">
        </div>`;
    },
    media() {
      return `
        <h2>Vignette &amp; aperçu</h2>
        ${mediaField("cover", "Image de couverture", "Format 16:9 conseillé.", "image/*")}
        ${mediaField("hoverPreview", "Aperçu au survol", "Courte vidéo .mp4 ou GIF.", "video/mp4,video/webm,image/gif")}`;
    },
    gallery(g) {
      const list = g.gallery || [];
      return `
        <h2>Galerie</h2>
        ${list.length ? `<ul class="gal-list">${list.map((p, i) => `
            <li class="gal-item">
              <div class="gal-thumb">${mediaThumb(p)}</div>
              <div class="gal-body">
                <span class="gal-type">${TYPE_LABEL[R.mediaType(p)]}${S.pending[p] ? ` · <span class="pending">à envoyer</span>` : ""}</span>
                <input data-gal="${i}" value="${esc(p)}" spellcheck="false" aria-label="Média ${i + 1}">
              </div>
              <div class="gal-actions">
                <button class="icon-btn" type="button" data-act="gal-up" data-i="${i}" aria-label="Monter" ${i === 0 ? "disabled" : ""}>↑</button>
                <button class="icon-btn" type="button" data-act="gal-down" data-i="${i}" aria-label="Descendre" ${i === list.length - 1 ? "disabled" : ""}>↓</button>
                <button class="icon-btn danger" type="button" data-act="gal-remove" data-i="${i}" aria-label="Retirer">✕</button>
              </div>
            </li>`).join("")}</ul>` : `<p class="empty-note">Aucun média.</p>`}
        <div class="drop" id="drop">
          <p>Glisse tes fichiers ici, ou</p>
          <label class="btn btn-sm file-btn">Choisir des fichiers<input type="file" multiple accept="image/*,video/mp4,video/webm,audio/*" data-upload="gallery"></label>
        </div>
        <div class="url-add">
          <input id="gal-url" placeholder="Lien YouTube ou URL" spellcheck="false" aria-label="Ajouter un média par lien">
          <button class="btn btn-sm" type="button" data-act="gal-add-url">Ajouter</button>
        </div>`;
    },
    links(g) {
      const list = g.links || [];
      return `
        <h2>Liens</h2>
        ${list.map((l, i) => `
          <div class="link-row">
            <input data-link="${i}" data-k="label" value="${esc(l.label)}" list="link-labels" placeholder="Libellé" aria-label="Libellé du lien ${i + 1}">
            <input data-link="${i}" data-k="url" value="${esc(l.url)}" type="url" placeholder="https://…" aria-label="Adresse du lien ${i + 1}" spellcheck="false">
            <button class="icon-btn danger" type="button" data-act="link-remove" data-i="${i}" aria-label="Retirer ce lien">✕</button>
          </div>`).join("")}
        <button class="btn btn-sm" type="button" data-act="link-add">+ Ajouter un lien</button>`;
    }
  };
  const PANEL_ORDER = ["info", "desc", "tech", "media", "gallery", "links"];
  const panelHTML = (name, g) => `<section class="panel" id="panel-${name}">${PANELS[name](g)}</section>`;

  const SITE = {
    profile() {
      return `
        <section class="panel">
          <h2>Identité</h2>
          <div class="field-grid">
            ${pfield("Nom", "name")}
            ${pfield("Texte du logo", "logo")}
            ${pfield("Rôle", "role", "", "span-2")}
            ${pfield("Statut", "status")}
            ${pfield("Ville", "location")}
          </div>
          ${parea("Présentation", "intro", 3)}
        </section>
        <section class="panel">
          <h2>Photo</h2>
          ${profileMedia("avatar", "Photo de profil", "Image carrée conseillée.", "image/*")}
        </section>`;
    },
    about() {
      const p = S.profile;
      return `
        <section class="panel">
          <h2>À propos</h2>
          ${parea("Texte, une ligne vide entre deux paragraphes", "about", 8, "paras", p.about.join("\n\n"))}
        </section>
        <section class="panel">
          <h2>Compétences</h2>
          ${p.skills.map((s, i) => `
            <div class="row-card">
              <div class="field-grid">
                ${pfield("Groupe", `skills.${i}.group`)}
                <label class="field"><span>Éléments, séparés par des virgules</span><input data-p="skills.${i}.items" data-kind="csv" value="${esc(s.items.join(", "))}"></label>
              </div>
              ${rowActions("skills", i, p.skills.length)}
            </div>`).join("")}
          <button class="btn btn-sm" type="button" data-act="list-add" data-list="skills">+ Ajouter un groupe</button>
        </section>`;
    },
    journey() {
      const p = S.profile;
      return `
        <section class="panel">
          <h2>Parcours</h2>
          ${p.timeline.map((t, i) => `
            <div class="row-card">
              <div class="field-grid">
                <label class="field"><span>Type</span>
                  <select data-p="timeline.${i}.type">
                    <option value="edu" ${t.type === "edu" ? "selected" : ""}>${esc(p.texts.journeyEdu || "Formation")}</option>
                    <option value="work" ${t.type === "work" ? "selected" : ""}>${esc(p.texts.journeyWork || "Expérience")}</option>
                  </select>
                </label>
                ${pfield("Date", `timeline.${i}.date`)}
                ${pfield("Intitulé", `timeline.${i}.title`)}
                ${pfield("Lieu", `timeline.${i}.place`)}
              </div>
              ${parea("Description", `timeline.${i}.text`, 2)}
              ${rowActions("timeline", i, p.timeline.length)}
            </div>`).join("")}
          <button class="btn btn-sm" type="button" data-act="list-add" data-list="timeline">+ Ajouter une étape</button>
        </section>`;
    },
    contact() {
      const p = S.profile;
      return `
        <section class="panel">
          <h2>Contact</h2>
          ${parea("Phrase d'accroche", "contact.pitch", 2)}
          ${pfield("Email", "contact.email", 'type="email" spellcheck="false"')}
        </section>
        <section class="panel">
          <h2>CV</h2>
          ${profileMedia("contact.cv", "Fichier du CV", "PDF.", "application/pdf")}
        </section>
        <section class="panel">
          <h2>Liens</h2>
          ${p.contact.links.map((l, i) => `
            <div class="row-card row-inline">
              <div class="field-grid">
                ${pfield("Libellé", `contact.links.${i}.label`, 'list="link-labels"')}
                ${pfield("Adresse", `contact.links.${i}.url`, 'type="url" spellcheck="false"')}
              </div>
              ${rowActions("contact.links", i, p.contact.links.length)}
            </div>`).join("")}
          <button class="btn btn-sm" type="button" data-act="list-add" data-list="contact.links">+ Ajouter un lien</button>
        </section>`;
    },
    categories() {
      const p = S.profile;
      return `
        <section class="panel">
          <h2>Catégories</h2>
          ${p.categories.map((c, i) => {
            const n = S.games.filter((g) => g.category === c.id).length;
            return `
            <div class="row-card row-inline">
              <div class="field-grid">
                ${pfield("Nom affiché", `categories.${i}.label`)}
                <div class="field"><span>Projets</span><p class="cat-count">${n}</p></div>
              </div>
              ${rowActions("categories", i, p.categories.length)}
            </div>`;
          }).join("")}
          <button class="btn btn-sm" type="button" data-act="list-add" data-list="categories">+ Ajouter une catégorie</button>
        </section>`;
    },
    texts() {
      return TEXT_GROUPS.map(([title, items]) => `
        <section class="panel">
          <h2>${esc(title)}</h2>
          <div class="field-grid">
            ${items.map(([k, label]) => `<label class="field"><span>${esc(label)}</span><input data-p="texts.${k}" value="${esc(S.profile.texts[k] ?? "")}" placeholder="${esc(R.DEFAULT_TEXTS[k] || "")}"></label>`).join("")}
          </div>
        </section>`).join("");
    }
  };

  function renderPanel(name) {
    const g = current();
    const el = $(`#panel-${name}`);
    if (g && el) el.outerHTML = panelHTML(name, g);
  }

  function renderEditor(keepScroll) {
    const ed = $("#editor");
    const top = ed.scrollTop;
    if (S.view !== "game") {
      const page = SITE_PAGES.find((p) => p.key === S.view);
      ed.innerHTML = `
        <div class="ed-head">
          <div class="ed-title">
            <p class="eyebrow">Site</p>
            <h1>${esc(page.label)}</h1>
          </div>
        </div>
        <div class="site-forms">${SITE[S.view]()}</div>`;
      if (keepScroll) ed.scrollTop = top;
      return;
    }
    const g = current();
    if (!g) {
      ed.innerHTML = `
        <div class="editor-empty">
          <h1>Aucun projet</h1>
          <button class="btn btn-accent" type="button" data-act="add">+ Nouveau projet</button>
        </div>`;
      return;
    }
    const idx = S.games.indexOf(g);
    ed.innerHTML = `
      <div class="ed-head">
        <div class="ed-title">
          <p class="eyebrow">Projet ${idx + 1} sur ${S.games.length}</p>
          <h1 id="ed-title">${esc(g.title || "Sans titre")}</h1>
          <p class="muted small"><code id="ed-slug">#jeu-${esc(gameId(g))}</code></p>
        </div>
        <div class="ed-actions">
          <button class="btn btn-sm" type="button" data-act="preview-fiche">Voir la fiche</button>
          <button class="btn btn-sm btn-ghost" type="button" data-act="duplicate">Dupliquer</button>
          <button class="btn btn-sm btn-danger" type="button" data-act="delete">Supprimer</button>
        </div>
      </div>
      <div class="confirm" id="confirm-delete" hidden>
        <p></p>
        <div class="confirm-actions">
          <button class="btn btn-sm btn-danger-solid" type="button" data-act="delete-yes">Oui, supprimer</button>
          <button class="btn btn-sm btn-ghost" type="button" data-act="delete-no">Annuler</button>
        </div>
      </div>
      <div class="ed-grid">
        <div class="ed-forms">${PANEL_ORDER.map((n) => panelHTML(n, g)).join("")}</div>
        <aside class="ed-side">
          <p class="eyebrow">Carte sur le site</p>
          <div class="card-preview" id="card-preview"></div>
        </aside>
      </div>`;
    if (keepScroll) ed.scrollTop = top;
    renderCardPreview();
  }

  function renderCardPreview() {
    const g = current();
    const box = $("#card-preview");
    if (!g || !box) return;
    const saved = toSaved(g);
    if (!saved.title) saved.title = "Sans titre";
    R.setTexts(S.profile.texts);
    box.innerHTML = R.cardHTML(R.normalizeGame(saved), catLabel);
    R.bindHover(box);
  }

  function renderAll() {
    R.setSrcMap(S.blobUrls);
    R.setTexts(S.profile.texts);
    renderList();
    renderEditor();
    renderSaveState();
    sendPreview(true);
  }

  function select(uidv) {
    S.view = "game";
    S.selected = uidv;
    renderList();
    renderEditor();
    $("#editor").scrollTop = 0;
    sendPreview(true);
  }

  function selectSite(key) {
    S.view = key;
    renderList();
    renderEditor();
    $("#editor").scrollTop = 0;
    sendPreview(true);
  }

  function changed() {
    const g = current();
    if (g) {
      const t = $("#ed-title"); if (t) t.textContent = g.title || "Sans titre";
      const s = $("#ed-slug"); if (s) s.textContent = `#jeu-${gameId(g)}`;
    }
    renderList();
    renderCardPreview();
    renderSaveState();
    saveDraft();
    schedulePreview();
  }

  function addFiles(files, target) {
    const isProfile = target.startsWith("p:");
    const g = isProfile ? null : current();
    if (!isProfile && !g) return;
    const dir = isProfile ? "assets/profile" : `assets/games/${slugify(gameId(g)) || "projet"}`;
    const allowPdf = target === "p:contact.cv";
    const added = [];
    files.forEach((file) => {
      const ok = allowPdf ? file.type === "application/pdf" : /^(image|video|audio)\//.test(file.type);
      if (!ok) {
        toast(allowPdf ? `« ${file.name} » n'est pas un PDF.` : `« ${file.name} » n'est ni une image, ni une vidéo, ni un son.`, "error");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast(`« ${file.name} » dépasse ${MAX_MB} Mo.`, "error");
        return;
      }
      const path = `${dir}/${safeName(file.name)}`;
      S.pending[path] = file;
      S.blobUrls[path] = URL.createObjectURL(file);
      added.push(path);
    });
    if (!added.length) return;
    R.setSrcMap(S.blobUrls);
    S.filesVersion++;
    if (isProfile) {
      setPath(S.profile, target.slice(2), added[0]);
      renderEditor(true);
      changed();
      return;
    }
    if (target === "gallery") added.forEach((p) => { if (!g.gallery.includes(p)) g.gallery.push(p); });
    else g[target] = added[0];
    renderPanel("media");
    renderPanel("gallery");
    changed();
  }

  function addMediaUrl() {
    const input = $("#gal-url");
    const v = input.value.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v) && !/^assets\//.test(v)) {
      toast("Colle un lien qui commence par https:// ou un chemin qui commence par assets/.", "error");
      input.focus();
      return;
    }
    current().gallery.push(v);
    renderPanel("gallery");
    changed();
    $("#gal-url").focus();
  }

  function newGame() {
    const g = toEditable({
      title: "Nouveau projet",
      category: cats()[0] ? cats()[0].id : "",
      year: new Date().getFullYear(),
      color: COLORS[S.games.length % COLORS.length]
    });
    S.games.unshift(g);
    select(g._uid);
    changed();
    const t = $('[data-f="title"]');
    if (t) { t.focus(); t.select(); }
  }

  function move(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return false;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return true;
  }

  function listAction(act, listPath, i) {
    const arr = getPath(S.profile, listPath);
    if (!Array.isArray(arr)) return;
    if (act === "list-add") {
      arr.push(LIST_TEMPLATES[listPath]());
    } else if (act === "list-remove") {
      if (listPath === "categories") {
        const used = S.games.filter((g) => g.category === arr[i].id).length;
        if (used) { toast(`Cette catégorie est utilisée par ${used} projet${used > 1 ? "s" : ""}. Change d'abord leur catégorie.`, "error"); return; }
      }
      arr.splice(i, 1);
    } else if (!move(arr, i, act === "list-up" ? -1 : 1)) {
      return;
    }
    renderEditor(true);
    changed();
    if (act === "list-add") {
      const rows = $$(".row-card");
      const last = rows[rows.length - 1];
      const input = last && last.querySelector("input, select");
      if (input) { input.focus(); last.scrollIntoView({ block: "nearest" }); }
    }
  }

  function onClick(e) {
    const btn = e.target.closest("[data-act]");
    const card = e.target.closest("#card-preview [data-open]");
    if (card) { e.preventDefault(); setPreviewMode("fiche", true); return; }
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    const g = current();
    const i = Number(btn.dataset.i);

    switch (act) {
      case "site": selectSite(btn.dataset.page); break;
      case "select": select(btn.dataset.uid); break;
      case "up":
      case "down": {
        const k = S.games.findIndex((x) => x._uid === btn.dataset.uid);
        if (move(S.games, k, act === "up" ? -1 : 1)) {
          changed();
          const eb = $(".ed-title .eyebrow");
          if (eb && g) eb.textContent = `Projet ${S.games.indexOf(g) + 1} sur ${S.games.length}`;
          const again = $(`[data-act="${act}"][data-uid="${btn.dataset.uid}"]`);
          if (again && !again.disabled) again.focus();
        }
        break;
      }
      case "add": newGame(); break;
      case "duplicate": {
        const copy = toEditable({ ...toSaved(g), title: `${g.title || "Sans titre"} (copie)`, id: undefined, featured: false });
        S.games.splice(S.games.indexOf(g) + 1, 0, copy);
        select(copy._uid);
        changed();
        toast("Projet dupliqué.");
        break;
      }
      case "delete":
        $("#confirm-delete p").textContent = `Supprimer « ${g.title || "Sans titre"} » ?`;
        $("#confirm-delete").hidden = false;
        $('[data-act="delete-yes"]').focus();
        break;
      case "delete-no": $("#confirm-delete").hidden = true; break;
      case "delete-yes": {
        const k = S.games.indexOf(g);
        S.games.splice(k, 1);
        const next = S.games[Math.min(k, S.games.length - 1)];
        if (next) select(next._uid); else selectSite("profile");
        changed();
        toast(`« ${g.title || "Sans titre"} » supprimé.`);
        break;
      }
      case "preview-fiche": setPreviewMode("fiche", true); break;
      case "clear-media": g[btn.dataset.f] = ""; renderPanel("media"); changed(); break;
      case "clear-p": setPath(S.profile, btn.dataset.p, ""); renderEditor(true); changed(); break;
      case "gal-up":
      case "gal-down":
        if (move(g.gallery, i, act === "gal-up" ? -1 : 1)) { renderPanel("gallery"); changed(); }
        break;
      case "gal-remove": g.gallery.splice(i, 1); renderPanel("gallery"); changed(); break;
      case "gal-add-url": addMediaUrl(); break;
      case "tech-remove": g.tech.splice(i, 1); renderPanel("tech"); changed(); $("#tech-input").focus(); break;
      case "link-add":
        g.links.push({ label: g.links.length ? "" : "itch.io", url: "" });
        renderPanel("links"); changed();
        $$('#panel-links [data-k="url"]').pop().focus();
        break;
      case "link-remove": g.links.splice(i, 1); renderPanel("links"); changed(); break;
      case "list-add":
      case "list-remove":
      case "list-up":
      case "list-down":
        listAction(act, btn.dataset.list, i);
        break;
      case "discard-draft":
        clearDraft();
        S.games = JSON.parse(S.published).map(toEditable);
        S.profile = toEditableProfile(JSON.parse(S.publishedProfile));
        S.view = S.games[0] ? "game" : "profile";
        S.selected = S.games[0] ? S.games[0]._uid : null;
        setBanner("");
        renderAll();
        toast("Brouillon abandonné.");
        break;
    }
  }

  function onInput(e) {
    const el = e.target;
    if (el.dataset.p) {
      let v = el.value;
      if (el.dataset.kind === "paras") v = v.split(/\n\s*\n/);
      else if (el.dataset.kind === "csv") v = v.split(",").map((x) => x.trim()).filter(Boolean);
      setPath(S.profile, el.dataset.p, v);
      if (el.dataset.p.startsWith("texts.")) R.setTexts(S.profile.texts);
      changed();
      return;
    }
    const g = current();
    if (!g) return;
    if (el.dataset.f) {
      const f = el.dataset.f;
      if (el.type === "checkbox") g[f] = el.checked;
      else if (el.dataset.kind === "lines") g[f] = el.value.split("\n");
      else if (f === "year") g[f] = /^\d{1,4}$/.test(el.value.trim()) ? Number(el.value.trim()) : el.value;
      else g[f] = el.value;
      changed();
    } else if (el.dataset.gal != null) {
      g.gallery[Number(el.dataset.gal)] = el.value;
      changed();
    } else if (el.dataset.link != null) {
      g.links[Number(el.dataset.link)][el.dataset.k] = el.value;
      changed();
    }
  }

  function onChange(e) {
    const el = e.target;
    if (el.dataset.upload) {
      addFiles([...el.files], el.dataset.upload);
      el.value = "";
      return;
    }
    if (el.dataset.p === "avatar" || el.dataset.p === "contact.cv") renderEditor(true);
    if (el.dataset.f === "cover" || el.dataset.f === "hoverPreview") renderPanel("media");
    if (el.dataset.gal != null) {
      const g = current();
      g.gallery = g.gallery.map((p) => String(p).trim()).filter(Boolean);
      renderPanel("gallery");
      changed();
    }
  }

  function addTech(input) {
    const g = current();
    const vals = input.value.split(",").map((v) => v.trim()).filter(Boolean);
    let added = false;
    vals.forEach((v) => {
      if (!g.tech.some((t) => t.toLowerCase() === v.toLowerCase())) { g.tech.push(v); added = true; }
    });
    input.value = "";
    if (added) { renderPanel("tech"); changed(); $("#tech-input").focus(); }
  }

  function onKeydown(e) {
    const el = e.target;
    if (el.id === "tech-input") {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTech(el); }
      else if (e.key === "Backspace" && !el.value && current().tech.length) {
        current().tech.pop(); renderPanel("tech"); changed(); $("#tech-input").focus();
      }
    } else if (el.id === "gal-url" && e.key === "Enter") {
      e.preventDefault(); addMediaUrl();
    }
  }

  function validate() {
    const untitled = S.games.find((g) => !String(g.title || "").trim());
    if (untitled) {
      select(untitled._uid);
      toast("Chaque projet doit avoir un titre.", "error");
      $('[data-f="title"]').focus();
      return false;
    }
    const seen = {};
    for (const g of S.games) {
      const id = gameId(g);
      if (seen[id]) {
        select(g._uid);
        toast(`Deux projets ont le même lien #jeu-${id}. Change l'un des titres.`, "error");
        return false;
      }
      seen[id] = true;
    }
    return true;
  }

  async function publish() {
    if (S.mode !== "github" || !S.auth || S.busy || !validate()) return;
    const files = usedPendingPaths();
    const gd = gamesDirty();
    const pd = profileDirty();
    if (!gd && !pd && !files.length) { toast("Rien à publier : tout est déjà en ligne."); return; }
    S.busy = true;
    const btn = $("#publish-btn");
    btn.disabled = true;
    btn.textContent = "Publication…";
    try {
      for (let i = 0; i < files.length; i++) {
        const p = files[i];
        renderSaveState(`Envoi des fichiers ${i + 1}/${files.length}…`);
        const existing = await getFile(p);
        const content = await fileToB64(S.pending[p]);
        await putFile(p, content, `Admin : ajoute ${p}`, existing && !Array.isArray(existing) ? existing.sha : undefined);
        delete S.pending[p];
      }
      if (gd) {
        renderSaveState("Publication des projets…");
        const cur = await getFile("data/games.js");
        await putFile("data/games.js", utf8ToB64(gamesFileContent()), "Admin : met à jour les projets", cur && cur.sha);
        S.published = snapshot();
      }
      if (pd) {
        renderSaveState("Publication du profil…");
        const cur = await getFile("data/profile.js");
        await putFile("data/profile.js", utf8ToB64(profileFileContent()), "Admin : met à jour le profil et les textes", cur && cur.sha);
        S.publishedProfile = profileSnapshot();
      }
      clearDraft();
      setBanner("");
      toast("Publié. Ton site sera à jour d'ici une à deux minutes.", "ok");
    } catch (err) {
      toast(ghMessage(err), "error");
    } finally {
      S.busy = false;
      btn.textContent = "Publier";
      renderSaveState();
      renderEditor(true);
    }
  }

  function download(name, content) {
    const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function exportFile() {
    if (!validate()) return;
    download("games.js", gamesFileContent());
    download("profile.js", profileFileContent());
    toast("games.js et profile.js téléchargés.", "ok");
  }

  const frame = $("#preview-frame");

  function sendPreview(scroll) {
    if (!S.frameReady || !frame.contentWindow || !S.profile) return;
    const cur = current();
    const fiche = S.previewMode === "fiche" && cur;
    const games = S.games.map((g) => {
      const s = toSaved(g);
      if (!s.title) s.title = "Sans titre";
      if (fiche && g === cur) delete s.hidden;
      return s;
    });
    const page = SITE_PAGES.find((p) => p.key === S.view);
    const scrollTo = scroll ? (page ? page.section : "projets") : null;
    const msg = { type: "pf-preview", games, profile: profileSaved(), open: fiche ? gameId(cur) : null, scrollTo };
    if (S.sentFilesVersion !== S.filesVersion) {
      msg.files = { ...S.pending };
      S.sentFilesVersion = S.filesVersion;
    }
    try { frame.contentWindow.postMessage(msg, "*"); } catch (e) { }
  }
  const schedulePreview = debounce(() => sendPreview(false), 250);

  function setPreviewMode(mode, open) {
    S.previewMode = mode;
    $$("[data-pmode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pmode === mode)));
    if (open && !S.previewOpen) { S.previewOpen = true; applyPreviewOpen(); }
    sendPreview(true);
  }

  function applyPreviewOpen() {
    $("#workspace").classList.toggle("preview-open", S.previewOpen);
    $("#preview-toggle").setAttribute("aria-pressed", String(S.previewOpen));
  }

  function initPreview() {
    window.addEventListener("message", (e) => {
      if (e.source === frame.contentWindow && e.data && e.data.type === "pf-preview-ready") {
        S.frameReady = true;
        S.sentFilesVersion = -1;
        if (S.mode) sendPreview(true);
      }
    });
    $$("[data-pmode]").forEach((b) => b.addEventListener("click", () => setPreviewMode(b.dataset.pmode, false)));
    $("#preview-toggle").addEventListener("click", () => { S.previewOpen = !S.previewOpen; applyPreviewOpen(); });
    $("#preview-close").addEventListener("click", () => { S.previewOpen = false; applyPreviewOpen(); });
  }

  function init() {
    $("#login-form").addEventListener("submit", onLogin);
    $("#logout-btn").addEventListener("click", logout);
    $("#publish-btn").addEventListener("click", publish);
    $("#export-btn").addEventListener("click", exportFile);
    $("#add-btn").addEventListener("click", newGame);

    document.addEventListener("click", onClick);
    const ed = $("#editor");
    ed.addEventListener("input", onInput);
    ed.addEventListener("change", onChange);
    ed.addEventListener("keydown", onKeydown);
    ed.addEventListener("focusout", (e) => { if (e.target.id === "tech-input" && e.target.value.trim()) addTech(e.target); });

    ed.addEventListener("dragover", (e) => {
      const drop = e.target.closest("#drop");
      if (!drop) return;
      e.preventDefault();
      drop.classList.add("over");
    });
    ed.addEventListener("dragleave", (e) => { const d = e.target.closest("#drop"); if (d) d.classList.remove("over"); });
    ed.addEventListener("drop", (e) => {
      const drop = e.target.closest("#drop");
      if (!drop) return;
      e.preventDefault();
      drop.classList.remove("over");
      addFiles([...e.dataTransfer.files], "gallery");
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && S.mode) {
        e.preventDefault();
        publish();
      }
    });
    window.addEventListener("beforeunload", (e) => {
      if (S.mode && (isDirty() || usedPendingPaths().length)) { e.preventDefault(); e.returnValue = ""; }
    });

    initPreview();

    const saved = storageGet(AUTH_KEY);
    if (saved && saved.token) {
      authenticate(saved.token).then(startGithub, () => {
        storageRemove(AUTH_KEY);
        S.auth = null;
        showLogin();
      });
    } else {
      showLogin();
    }
  }

  init();
})();
