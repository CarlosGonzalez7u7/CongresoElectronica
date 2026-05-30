/**
 * admin-workshops.js  — Módulo de Talleres, Conferencias e Instructores
 * Depende de: admin.html (DOM) + /api/admin-workshops.php
 */

/* ═══════════════════════════════════════════════════
   ESTILOS DINÁMICOS
═══════════════════════════════════════════════════ */
(function injectStyles() {
  if (document.getElementById("ws-module-styles")) return;
  const s = document.createElement("style");
  s.id = "ws-module-styles";
  s.textContent = `
/* ── Grid de tarjetas ── */
.ws-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:18px; padding:4px 0 20px; }
.ws-card { background:var(--bg-card,#1e2438); border:1px solid var(--border-md,#2a3045); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; transition:box-shadow .2s,transform .15s; position:relative; }
.ws-card:hover { box-shadow:0 8px 32px rgba(0,0,0,.35); transform:translateY(-2px); }

/* Portada */
.ws-card-cover { width:100%; height:150px; object-fit:cover; background:rgba(255,255,255,.04); display:block; }
.ws-card-cover-placeholder { width:100%; height:150px; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,rgba(34,211,238,.07),rgba(59,130,246,.05)); font-size:36px; color:rgba(34,211,238,.25); }

/* Cuerpo */
.ws-card-body { padding:14px 16px; flex:1; display:flex; flex-direction:column; gap:8px; }
.ws-card-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:var(--text-h,#e2e8f0); line-height:1.3; margin:0; }
.ws-card-meta { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.ws-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:600; }
.ws-badge-draft     { background:rgba(100,116,139,.15); color:#94a3b8; border:1px solid rgba(100,116,139,.25); }
.ws-badge-published { background:rgba(16,185,129,.12);  color:#6ee7b7; border:1px solid rgba(16,185,129,.25); }
.ws-badge-full      { background:rgba(245,158,11,.12);  color:#fcd34d; border:1px solid rgba(245,158,11,.25); }
.ws-badge-cancelled { background:rgba(244,63,94,.12);   color:#fda4af; border:1px solid rgba(244,63,94,.25); }
.ws-badge-completed { background:rgba(99,102,241,.12);  color:#c4b5fd; border:1px solid rgba(99,102,241,.25); }
.ws-badge-instructor{ background:rgba(34,211,238,.1);   color:#67e8f9; border:1px solid rgba(34,211,238,.22); }
.ws-badge-speaker   { background:rgba(251,146,60,.1);   color:#fdba74; border:1px solid rgba(251,146,60,.25); }

.ws-card-info-row { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-mute,#64748b); }
.ws-card-info-row i { width:14px; text-align:center; color:var(--accent,#22d3ee); font-size:11px; }

/* Imágenes miniatura */
.ws-thumb-row { display:flex; gap:6px; padding:0 16px 10px; flex-wrap:wrap; }
.ws-thumb { width:52px; height:40px; object-fit:cover; border-radius:8px; border:1px solid rgba(148,163,184,.15); cursor:pointer; transition:transform .15s; }
.ws-thumb:hover { transform:scale(1.08); }
.ws-thumb-more { width:52px; height:40px; border-radius:8px; background:rgba(255,255,255,.05); border:1px dashed rgba(148,163,184,.2); display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--text-mute); cursor:pointer; }

/* Footer de la card */
.ws-card-footer { display:flex; gap:6px; padding:10px 14px 12px; border-top:1px solid rgba(148,163,184,.1); flex-wrap:wrap; }
.ws-btn { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .16s; background:rgba(255,255,255,.05); color:var(--text-body,#cbd5e1); border-color:rgba(148,163,184,.16); }
.ws-btn:hover { background:rgba(255,255,255,.1); color:#fff; }
.ws-btn-primary { background:rgba(34,211,238,.12); color:#67e8f9; border-color:rgba(34,211,238,.25); }
.ws-btn-primary:hover { background:rgba(34,211,238,.22); }
.ws-btn-danger  { background:rgba(244,63,94,.1); color:#fda4af; border-color:rgba(244,63,94,.22); }
.ws-btn-danger:hover  { background:rgba(244,63,94,.2); }
.ws-btn-amber  { background:rgba(245,158,11,.1); color:#fcd34d; border-color:rgba(245,158,11,.22); }
.ws-btn-amber:hover   { background:rgba(245,158,11,.2); }

/* Instrucción vacía */
.ws-empty { grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-mute); }
.ws-empty i { font-size:40px; margin-bottom:12px; display:block; opacity:.3; }

/* ── MODAL BASE ── */
.wm-overlay { position:fixed; inset:0; z-index:99999; display:none; align-items:center; justify-content:center; background:rgba(2,6,23,.78); backdrop-filter:blur(10px); padding:16px; }
.wm-overlay.open { display:flex; }
.wm-box { width:min(760px,100%); background:linear-gradient(180deg,rgba(15,23,42,.99),rgba(17,24,39,.97)); border:1px solid rgba(148,163,184,.16); border-radius:20px; box-shadow:0 28px 70px rgba(2,6,23,.6); display:flex; flex-direction:column; max-height:92vh; overflow:hidden; }
.wm-box-sm { width:min(500px,100%); }
.wm-box-lg { width:min(900px,100%); }
.wm-head { display:flex; align-items:center; justify-content:space-between; padding:16px 22px; border-bottom:1px solid rgba(148,163,184,.12); flex-shrink:0; gap:12px; }
.wm-head h3 { font-family:'Syne',sans-serif; font-size:17px; color:#fff; margin:0; display:flex; align-items:center; gap:8px; }
.wm-head p  { font-size:12px; color:rgba(226,232,240,.55); margin:2px 0 0; }
.wm-body { padding:20px 22px; overflow-y:auto; flex:1; min-height:0; }
.wm-foot { display:flex; justify-content:flex-end; gap:8px; padding:12px 22px 16px; border-top:1px solid rgba(148,163,184,.1); flex-shrink:0; flex-wrap:wrap; }
.wm-close { background:rgba(255,255,255,.07); border:1px solid rgba(148,163,184,.18); color:#e2e8f0; width:32px; height:32px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; flex-shrink:0; }
.wm-close:hover { background:rgba(255,255,255,.14); }

/* ── Secciones dentro de modal ── */
.wm-section { background:rgba(255,255,255,.03); border:1px solid rgba(148,163,184,.1); border-radius:12px; padding:14px 16px; margin-bottom:14px; }
.wm-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:rgba(34,211,238,.7); margin-bottom:12px; display:flex; align-items:center; gap:6px; }
.wm-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.wm-grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
.wm-field { display:flex; flex-direction:column; gap:5px; margin-bottom:10px; }
.wm-label { font-size:11.5px; font-weight:600; color:rgba(226,232,240,.6); text-transform:uppercase; letter-spacing:.05em; }
.wm-input { width:100%; padding:9px 12px; background:rgba(255,255,255,.06); border:1px solid rgba(148,163,184,.18); border-radius:9px; color:#e2e8f0; font-size:13.5px; font-family:inherit; box-sizing:border-box; transition:border-color .15s,box-shadow .15s; }
.wm-input:focus { outline:none; border-color:#22d3ee; box-shadow:0 0 0 3px rgba(34,211,238,.1); }
select.wm-input { cursor:pointer; }
textarea.wm-input { resize:vertical; }

/* Autocomplete instructor */
.wm-suggestions { position:absolute; top:100%; left:0; right:0; z-index:9; background:#1e2a3f; border:1px solid rgba(34,211,238,.25); border-radius:10px; margin-top:4px; box-shadow:0 8px 24px rgba(0,0,0,.4); max-height:200px; overflow-y:auto; }
.wm-suggestion-item { padding:10px 14px; cursor:pointer; font-size:13px; color:#e2e8f0; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(148,163,184,.08); }
.wm-suggestion-item:hover { background:rgba(34,211,238,.1); }
.wm-suggestion-item:last-child { border:none; }
.wm-suggestion-avatar { width:32px; height:32px; border-radius:8px; background:rgba(34,211,238,.15); display:flex; align-items:center; justify-content:center; font-size:12px; color:#22d3ee; font-weight:700; flex-shrink:0; }

/* Imágenes upload */
.wm-img-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:8px; }
.wm-img-slot { position:relative; border-radius:10px; overflow:hidden; background:rgba(255,255,255,.04); border:1px dashed rgba(148,163,184,.2); aspect-ratio:1; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:border-color .15s; }
.wm-img-slot:hover { border-color:rgba(34,211,238,.4); }
.wm-img-slot img { width:100%; height:100%; object-fit:cover; }
.wm-img-slot-placeholder { display:flex; flex-direction:column; align-items:center; gap:4px; color:rgba(148,163,184,.5); font-size:11px; }
.wm-img-slot-placeholder i { font-size:22px; }
.wm-img-slot-del { position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:6px; background:rgba(244,63,94,.8); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:11px; transition:background .15s; }
.wm-img-slot-del:hover { background:#f43f5e; }
.wm-img-cover-badge { position:absolute; bottom:4px; left:4px; background:rgba(245,158,11,.85); color:#1a1200; font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase; }
.wm-img-upload-progress { height:3px; background:rgba(34,211,238,.3); border-radius:2px; margin-top:6px; overflow:hidden; display:none; }
.wm-img-upload-progress-bar { height:100%; background:#22d3ee; width:0; transition:width .3s; }

/* Tags */
.wm-tags-wrap { display:flex; flex-wrap:wrap; gap:6px; min-height:32px; padding:6px; background:rgba(255,255,255,.04); border:1px solid rgba(148,163,184,.18); border-radius:9px; align-items:center; }
.wm-tag { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:999px; background:rgba(34,211,238,.12); border:1px solid rgba(34,211,238,.25); color:#67e8f9; font-size:12px; font-weight:600; }
.wm-tag button { background:none; border:none; color:#67e8f9; cursor:pointer; padding:0; font-size:11px; line-height:1; display:flex; }
.wm-tag-input { border:none; background:transparent; color:#e2e8f0; font-size:13px; min-width:80px; outline:none; padding:2px 4px; }

/* Tabs en modal */
.wm-tabs { display:flex; gap:2px; background:rgba(255,255,255,.04); border-radius:10px; padding:3px; margin-bottom:16px; }
.wm-tab { flex:1; padding:8px; text-align:center; font-size:12.5px; font-weight:600; color:rgba(226,232,240,.5); border-radius:8px; cursor:pointer; transition:all .15s; border:none; background:none; }
.wm-tab.active { background:rgba(34,211,238,.15); color:#67e8f9; }

/* Password toggle */
.wm-pw-wrap { position:relative; }
.wm-pw-toggle { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(148,163,184,.6); cursor:pointer; padding:4px; }

/* Alert inline */
.wm-alert { padding:10px 14px; border-radius:9px; font-size:12.5px; margin-bottom:12px; display:flex; align-items:flex-start; gap:8px; }
.wm-alert-info  { background:rgba(34,211,238,.08); border:1px solid rgba(34,211,238,.2); color:rgba(226,232,240,.8); }
.wm-alert-warn  { background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.2); color:rgba(253,186,116,.9); }

/* Responsive */
@media(max-width:640px){
  .wm-grid2,.wm-grid3 { grid-template-columns:1fr; }
  .wm-img-grid { grid-template-columns:repeat(2,1fr); }
  .wm-box { border-radius:18px 18px 0 0; max-height:96vh; margin:auto 0 0; }
  .ws-grid { grid-template-columns:1fr; }
}
  `;
  document.head.appendChild(s);
})();

/* ═══════════════════════════════════════════════════
   ESTADO GLOBAL
═══════════════════════════════════════════════════ */
const wsState = {
  workshops: [],
  conferences: [],
  instructors: [],
  loaded: false,
};

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
function wsApi(action, method = "GET", body = null, isFormData = false) {
  const url = `/app/api/admin-workshops.php${action.startsWith("?") ? action : ""}`;
  const opts = { method, headers: {} };
  if (body) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  return fetch(url, opts).then((r) => r.json());
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + "T12:00:00");
  return dt.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(t) {
  if (!t) return "";
  return t.substring(0, 5);
}
function statusBadge(s) {
  const map = {
    draft: ["Borrador", "draft"],
    published: ["Publicado", "published"],
    full: ["Lleno", "full"],
    cancelled: ["Cancelado", "cancelled"],
    completed: ["Completado", "completed"],
  };
  const [label, cls] = map[s] || ["—", "draft"];
  return `<span class="ws-badge ws-badge-${cls}">${label}</span>`;
}
function escHtml(s) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(s || "")));
  return d.innerHTML;
}
function toast(msg, type = "success") {
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:999999;padding:12px 20px;border-radius:12px;font-size:13.5px;font-weight:600;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.4);background:${type === "success" ? "linear-gradient(135deg,#059669,#10b981)" : type === "warn" ? "linear-gradient(135deg,#d97706,#f59e0b)" : "linear-gradient(135deg,#be123c,#f43f5e)"};display:flex;align-items:center;gap:8px;animation:wsToastIn .25s ease;max-width:360px;`;
  t.innerHTML = `<i class="fas fa-${type === "success" ? "check-circle" : type === "warn" ? "exclamation-triangle" : "times-circle"}"></i> ${escHtml(msg)}`;
  const style = document.createElement("style");
  style.textContent =
    "@keyframes wsToastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}";
  document.head.appendChild(style);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ═══════════════════════════════════════════════════
   CARGA DE DATOS
═══════════════════════════════════════════════════ */
async function wsLoadAll() {
  try {
    const [wRes, cRes, iRes] = await Promise.all([
      wsApi("?action=list"),
      wsApi("?action=list_conferences"),
      wsApi("?action=instructors"),
    ]);
    if (wRes.success) wsState.workshops = wRes.data;
    if (cRes.success) wsState.conferences = cRes.data;
    if (iRes.success) wsState.instructors = iRes.data;
    wsState.loaded = true;
    workshopModule.render();
    workshopModule.renderInstructors();
    conferencesModule.render();
  } catch (e) {
    console.error("wsLoadAll error:", e);
  }
}

/* ═══════════════════════════════════════════════════
   MÓDULO: TALLERES
═══════════════════════════════════════════════════ */
const workshopModule = (function () {
  let editingId = null;
  let uploadedImages = []; // {id, url, is_cover, caption}
  let pendingUploadWorkshopId = null;
  let activeView = "workshops";

  function switchView(view) {
    activeView = view === "instructors" ? "instructors" : "workshops";
    const workshopsPanel = document.getElementById("workshopsPanel");
    const instructorsPanel = document.getElementById("instructorsPanel");
    const workshopsBtn = document.getElementById("wsViewWorkshopsBtn");
    const instructorsBtn = document.getElementById("wsViewInstructorsBtn");

    if (workshopsPanel)
      workshopsPanel.style.display = activeView === "workshops" ? "" : "none";
    if (instructorsPanel)
      instructorsPanel.style.display =
        activeView === "instructors" ? "" : "none";
    if (workshopsBtn)
      workshopsBtn.classList.toggle("active", activeView === "workshops");
    if (instructorsBtn)
      instructorsBtn.classList.toggle("active", activeView === "instructors");
  }

  /* ── RENDER GRID ── */
  function render() {
    const grid = document.getElementById("workshopGrid");
    if (!grid) return;
    const items = wsState.workshops;
    const count = document.getElementById("workshopCount");
    if (count)
      count.textContent = `${items.length} taller${items.length === 1 ? "" : "es"}`;
    if (!items.length) {
      grid.innerHTML = `<div class="ws-empty"><i class="fas fa-chalkboard"></i><p>Sin talleres aún.<br>Crea el primero con el botón de arriba.</p></div>`;
      return;
    }
    grid.innerHTML = items.map(renderCard).join("");
    switchView(activeView);
  }

  function renderInstructors() {
    const grid = document.getElementById("instructorGrid");
    if (!grid) return;
    const items = wsState.instructors;
    const count = document.getElementById("instructorCount");
    if (count)
      count.textContent = `${items.length} profesor${items.length === 1 ? "" : "es"}`;

    if (!items.length) {
      grid.innerHTML = `<div class="ws-empty"><i class="fas fa-user-tie"></i><p>Sin profesores aún.<br>Crea el primero con el botón de arriba.</p></div>`;
      return;
    }

    grid.innerHTML = items.map(renderInstructorCard).join("");
    switchView(activeView);
  }

  function renderCard(w) {
    const coverSrc = w.cover_image_url || "";
    const cover = coverSrc
      ? `<img class="ws-card-cover" src="${escHtml(coverSrc)}" alt="Portada" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : "";
    const placeholder = `<div class="ws-card-cover-placeholder" style="${coverSrc ? "display:none" : ""}"><i class="fas fa-chalkboard-teacher"></i></div>`;

    const instructor = w.instructor_name
      ? `<div class="ws-card-info-row"><i class="fas fa-user-tie"></i><span>${escHtml(w.instructor_name)}</span> <span class="ws-badge ws-badge-instructor">Instructor</span></div>`
      : `<div class="ws-card-info-row"><i class="fas fa-user-tie"></i><span style="color:var(--rose,#f43f5e);font-size:12px;">Sin instructor asignado</span></div>`;

    const dateStr = w.schedule_date
      ? `${fmtDate(w.schedule_date)}${w.schedule_start ? " · " + fmtTime(w.schedule_start) : ""}`
      : "Sin fecha";
    const spots = `${w.enrolled_count ?? 0}/${w.max_capacity} inscritos`;

    return `
    <div class="ws-card" data-id="${w.id}">
      ${cover}${placeholder}
      <div class="ws-card-body">
        <p class="ws-card-title">${escHtml(w.name)}</p>
        <div class="ws-card-meta">
          ${statusBadge(w.status)}
          ${w.image_count ? `<span class="ws-badge ws-badge-draft"><i class="fas fa-images"></i> ${w.image_count} fotos</span>` : ""}
        </div>
        ${instructor}
        <div class="ws-card-info-row"><i class="fas fa-calendar"></i><span>${dateStr}</span></div>
        <div class="ws-card-info-row"><i class="fas fa-map-marker-alt"></i><span>${escHtml(w.location || "—")}</span></div>
        <div class="ws-card-info-row"><i class="fas fa-users"></i><span>${spots}</span></div>
      </div>
      <div class="ws-card-footer">
        <button class="ws-btn ws-btn-primary" onclick="workshopModule.openWorkshopForm(${w.id})"><i class="fas fa-edit"></i> Editar</button>
        <button class="ws-btn ws-btn-amber" onclick="workshopModule.openImagesModal(${w.id})"><i class="fas fa-images"></i> Imágenes</button>
        <button class="ws-btn" onclick="workshopModule.openEnrollments(${w.id})"><i class="fas fa-list-check"></i> Inscritos</button>
        <button class="ws-btn ws-btn-danger" onclick="workshopModule.deleteWorkshop(${w.id},'${escHtml(w.name)}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }

  function renderInstructorCard(inst) {
    const roleBadge =
      inst.role_type === "speaker"
        ? `<span class="ws-badge ws-badge-speaker">Ponente</span>`
        : `<span class="ws-badge ws-badge-instructor">Instructor</span>`;
    const specialty =
      inst.specialty || inst.bio || "Sin especialidad registrada";
    const email = inst.email || "Sin correo";
    const phone = inst.phone || "Sin teléfono";

    return `
    <div class="ws-card" data-id="${inst.id}">
      <div class="ws-card-body">
        <p class="ws-card-title">${escHtml(inst.full_name)}</p>
        <div class="ws-card-meta">${roleBadge}</div>
        <div class="ws-card-info-row"><i class="fas fa-bolt"></i><span>${escHtml(specialty)}</span></div>
        <div class="ws-card-info-row"><i class="fas fa-envelope"></i><span>${escHtml(email)}</span></div>
        <div class="ws-card-info-row"><i class="fas fa-phone"></i><span>${escHtml(phone)}</span></div>
        ${inst.username ? `<div class="ws-card-info-row"><i class="fas fa-user-lock"></i><span>${escHtml(inst.username)}</span></div>` : ""}
      </div>
      <div class="ws-card-footer">
        <button class="ws-btn ws-btn-primary" onclick="workshopModule.openInstructorForm(${inst.id})"><i class="fas fa-edit"></i> Editar</button>
        <button class="ws-btn ws-btn-danger" onclick="workshopModule.deleteInstructor(${inst.id}, ${JSON.stringify(inst.full_name).replace(/"/g, "&quot;")})"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }

  /* ── MODAL TALLER ── */
  function ensureModal() {
    if (document.getElementById("wm-workshop")) return;
    const el = document.createElement("div");
    el.className = "wm-overlay";
    el.id = "wm-workshop";
    el.innerHTML = `
    <div class="wm-box wm-box-lg">
      <div class="wm-head">
        <div>
          <h3 id="wm-ws-title"><i class="fas fa-chalkboard-teacher"></i> Nuevo Taller</h3>
          <p>Completa la información del taller y asigna un instructor</p>
        </div>
        <button class="wm-close" onclick="workshopModule.closeWorkshopModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="wm-body">
        <!-- Básico -->
        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-info-circle"></i> Información básica</div>
          <div class="wm-field"><label class="wm-label">Nombre del taller <span style="color:#f43f5e">*</span></label>
            <input id="ws-name" class="wm-input" type="text" placeholder="Ej. Electrónica con Arduino"></div>
          <div class="wm-field"><label class="wm-label">Descripción</label>
            <textarea id="ws-desc" class="wm-input" rows="3" placeholder="¿De qué trata el taller?"></textarea></div>
          <div class="wm-grid2">
            <div class="wm-field"><label class="wm-label">Estado</label>
              <select id="ws-status" class="wm-input">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="full">Lleno</option>
                <option value="cancelled">Cancelado</option>
                <option value="completed">Completado</option>
              </select></div>
            <div class="wm-field"><label class="wm-label">Capacidad máxima</label>
              <input id="ws-capacity" class="wm-input" type="number" min="1" value="30"></div>
          </div>
        </div>

        <!-- Instructor -->
        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-user-tie"></i> Instructor</div>
          <div class="wm-alert wm-alert-info"><i class="fas fa-info-circle"></i> Busca un instructor existente o crea uno nuevo. Cada instructor tiene acceso con usuario/contraseña a su interfaz.</div>
          <div style="position:relative">
            <div class="wm-field" style="margin-bottom:4px">
              <label class="wm-label">Buscar instructor <span style="color:#f43f5e">*</span></label>
              <input id="ws-instructor-search" class="wm-input" type="text" placeholder="Escribe el nombre…" autocomplete="off" oninput="workshopModule.filterInstructors(this.value)">
            </div>
            <div id="ws-instructor-suggestions" class="wm-suggestions" style="display:none"></div>
            <input type="hidden" id="ws-instructor-id">
          </div>
          <div id="ws-instructor-selected" style="display:none; margin-top:8px; padding:10px 14px; background:rgba(34,211,238,.07); border:1px solid rgba(34,211,238,.2); border-radius:10px; display:none; align-items:center; gap:10px;">
            <div id="ws-instructor-avatar" style="width:38px;height:38px;border-radius:10px;background:rgba(34,211,238,.15);display:flex;align-items:center;justify-content:center;color:#22d3ee;font-weight:700;font-size:14px;flex-shrink:0;"></div>
            <div style="flex:1;min-width:0">
              <div id="ws-instructor-name-label" style="font-size:13.5px;font-weight:600;color:#e2e8f0;"></div>
              <div id="ws-instructor-detail" style="font-size:12px;color:rgba(226,232,240,.55);"></div>
            </div>
            <button onclick="workshopModule.clearInstructor()" style="background:rgba(244,63,94,.15);border:1px solid rgba(244,63,94,.25);color:#fda4af;border-radius:7px;padding:4px 10px;cursor:pointer;font-size:12px;">
              <i class="fas fa-times"></i> Quitar
            </button>
          </div>
          <button onclick="workshopModule.openInstructorForm()" class="ws-btn ws-btn-primary" style="margin-top:10px;font-size:12px;"><i class="fas fa-plus"></i> Crear nuevo instructor</button>
        </div>

        <!-- Fecha y lugar -->
        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-calendar-alt"></i> Horario y lugar</div>
          <div class="wm-grid3">
            <div class="wm-field"><label class="wm-label">Fecha inicio</label><input id="ws-date" class="wm-input" type="date"></div>
            <div class="wm-field"><label class="wm-label">Hora inicio</label><input id="ws-start" class="wm-input" type="time"></div>
            <div class="wm-field"><label class="wm-label">Hora fin</label><input id="ws-end" class="wm-input" type="time"></div>
          </div>
          <div class="wm-grid2">
            <div class="wm-field"><label class="wm-label">Edificio</label><input id="ws-building" class="wm-input" type="text" placeholder="Ej. Edificio A"></div>
            <div class="wm-field"><label class="wm-label">Salón / Aula</label><input id="ws-room" class="wm-input" type="text" placeholder="Ej. Lab 1, Aula 204"></div>
          </div>
        </div>

        <!-- Temas y materiales -->
        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-tags"></i> Temas y materiales</div>
          <div class="wm-field">
            <label class="wm-label">Temas del taller</label>
            <div class="wm-tags-wrap" id="ws-topics-wrap">
              <input type="text" class="wm-tag-input" id="ws-topics-input" placeholder="Escribe un tema y presiona Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();workshopModule.addTag('topics');}">
            </div>
          </div>
          <div class="wm-field">
            <label class="wm-label">Materiales requeridos</label>
            <div class="wm-tags-wrap" id="ws-materials-wrap">
              <input type="text" class="wm-tag-input" id="ws-materials-input" placeholder="Escribe un material y presiona Enter" onkeydown="if(event.key==='Enter'){event.preventDefault();workshopModule.addTag('materials');}">
            </div>
          </div>
          <div class="wm-field">
            <label class="wm-label">Requisitos del participante</label>
            <textarea id="ws-requirements" class="wm-input" rows="2" placeholder="Ej. Conocimientos básicos de programación"></textarea>
          </div>
        </div>
      </div>
      <div class="wm-foot">
        <button class="ws-btn" onclick="workshopModule.closeWorkshopModal()">Cancelar</button>
        <button class="ws-btn ws-btn-primary" onclick="workshopModule.saveWorkshop()"><i class="fas fa-save"></i> Guardar taller</button>
      </div>
    </div>`;
    el.addEventListener("click", (e) => {
      if (e.target === el) closeWorkshopModal();
    });
    document.body.appendChild(el);
  }

  function openWorkshopForm(id = null) {
    ensureModal();
    editingId = id;
    document.getElementById("wm-ws-title").innerHTML =
      `<i class="fas fa-chalkboard-teacher"></i> ${id ? "Editar Taller" : "Nuevo Taller"}`;
    resetForm();
    if (id) {
      const w = wsState.workshops.find((x) => x.id == id);
      if (w) fillForm(w);
    }
    document.getElementById("wm-workshop").classList.add("open");
  }

  function resetForm() {
    ["ws-name", "ws-desc", "ws-building", "ws-room", "ws-requirements"].forEach(
      (f) => {
        const el = document.getElementById(f);
        if (el) el.value = "";
      },
    );
    document.getElementById("ws-status").value = "draft";
    document.getElementById("ws-capacity").value = "30";
    document.getElementById("ws-date").value = "";
    document.getElementById("ws-start").value = "";
    document.getElementById("ws-end").value = "";
    clearInstructor();
    ["topics", "materials"].forEach((k) => {
      const w = document.getElementById(`ws-${k}-wrap`);
      if (w) {
        w.querySelectorAll(".wm-tag").forEach((t) => t.remove());
      }
    });
    uploadedImages = [];
  }

  function fillForm(w) {
    document.getElementById("ws-name").value = w.name || "";
    document.getElementById("ws-desc").value = w.description || "";
    document.getElementById("ws-status").value = w.status || "draft";
    document.getElementById("ws-capacity").value = w.max_capacity || 30;
    document.getElementById("ws-date").value = w.schedule_date || "";
    document.getElementById("ws-start").value =
      w.schedule_start?.substring(0, 5) || "";
    document.getElementById("ws-end").value =
      w.schedule_end?.substring(0, 5) || "";
    document.getElementById("ws-building").value = w.building || "";
    document.getElementById("ws-room").value = w.room || "";
    document.getElementById("ws-requirements").value = w.requirements || "";

    if (w.instructor_id) {
      const inst = wsState.instructors.find((i) => i.id == w.instructor_id);
      if (inst) selectInstructor(inst);
    }
    (w.topics || []).forEach((t) => addTagValue("topics", t));
    (w.materials || []).forEach((m) => addTagValue("materials", m));
  }

  function closeWorkshopModal() {
    const el = document.getElementById("wm-workshop");
    if (el) el.classList.remove("open");
    editingId = null;
  }

  /* ── Instructor autocomplete ── */
  function filterInstructors(q) {
    const box = document.getElementById("ws-instructor-suggestions");
    if (!q.trim()) {
      box.style.display = "none";
      return;
    }
    const matches = wsState.instructors.filter(
      (i) =>
        i.full_name.toLowerCase().includes(q.toLowerCase()) ||
        (i.email || "").toLowerCase().includes(q.toLowerCase()),
    );
    if (!matches.length) {
      box.style.display = "none";
      return;
    }
    box.innerHTML = matches
      .map(
        (i) => `
      <div class="wm-suggestion-item" onclick="workshopModule.selectInstructor(${JSON.stringify(i).split('"').join("&quot;")})">
        <div class="wm-suggestion-avatar">${i.full_name.charAt(0).toUpperCase()}</div>
        <div><div style="font-weight:600">${escHtml(i.full_name)}</div>
        <div style="font-size:11.5px;color:rgba(226,232,240,.5)">${escHtml(i.specialty || i.email || "")}</div></div>
        <span class="ws-badge ws-badge-${i.role_type === "instructor" ? "instructor" : "speaker"}">${i.role_type === "instructor" ? "Instructor" : "Ponente"}</span>
      </div>`,
      )
      .join("");
    box.style.display = "block";
  }

  function selectInstructor(inst) {
    if (typeof inst === "string") inst = JSON.parse(inst);
    document.getElementById("ws-instructor-id").value = inst.id;
    document.getElementById("ws-instructor-search").value = "";
    document.getElementById("ws-instructor-suggestions").style.display = "none";
    document.getElementById("ws-instructor-avatar").textContent = inst.full_name
      .charAt(0)
      .toUpperCase();
    document.getElementById("ws-instructor-name-label").textContent =
      inst.full_name;
    document.getElementById("ws-instructor-detail").textContent = [
      inst.specialty,
      inst.email,
    ]
      .filter(Boolean)
      .join(" · ");
    const sel = document.getElementById("ws-instructor-selected");
    sel.style.display = "flex";
  }

  function clearInstructor() {
    document.getElementById("ws-instructor-id").value = "";
    document.getElementById("ws-instructor-search").value = "";
    document.getElementById("ws-instructor-selected").style.display = "none";
    document.getElementById("ws-instructor-suggestions").style.display = "none";
  }

  /* ── Tags ── */
  function addTag(type) {
    const input = document.getElementById(`ws-${type}-input`);
    addTagValue(type, input.value);
    input.value = "";
    input.focus();
  }
  function addTagValue(type, val) {
    val = val.trim();
    if (!val) return;
    const wrap = document.getElementById(`ws-${type}-wrap`);
    const tag = document.createElement("span");
    tag.className = "wm-tag";
    tag.innerHTML = `${escHtml(val)}<button type="button" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    wrap.insertBefore(tag, wrap.querySelector(".wm-tag-input"));
  }
  function getTagValues(type) {
    return Array.from(
      document.getElementById(`ws-${type}-wrap`).querySelectorAll(".wm-tag"),
    ).map((el) => el.textContent.trim().replace(/×$/, "").trim());
  }

  /* ── GUARDAR ── */
  async function saveWorkshop() {
    const name = document.getElementById("ws-name").value.trim();
    if (!name) {
      toast("El nombre del taller es requerido", "error");
      return;
    }

    const instructorId =
      document.getElementById("ws-instructor-id").value || "";
    if (!instructorId) {
      toast("Debes asignar un profesor al taller", "error");
      return;
    }

    const body = {
      action: "save_workshop",
      id: editingId || 0,
      name,
      description: document.getElementById("ws-desc").value.trim(),
      status: document.getElementById("ws-status").value,
      max_capacity:
        parseInt(document.getElementById("ws-capacity").value) || 30,
      instructor_id: instructorId,
      schedule_date: document.getElementById("ws-date").value,
      schedule_start: document.getElementById("ws-start").value,
      schedule_end: document.getElementById("ws-end").value,
      building: document.getElementById("ws-building").value.trim(),
      room: document.getElementById("ws-room").value.trim(),
      location: [
        document.getElementById("ws-building").value.trim(),
        document.getElementById("ws-room").value.trim(),
      ]
        .filter(Boolean)
        .join(", "),
      requirements: document.getElementById("ws-requirements").value.trim(),
      topics: getTagValues("topics"),
      materials: getTagValues("materials"),
    };

    const res = await wsApi("", "POST", body);
    if (res.success) {
      toast(res.message || "Guardado");
      closeWorkshopModal();
      await wsLoadAll();
    } else {
      toast(res.error || "Error al guardar", "error");
    }
  }

  async function deleteWorkshop(id, name) {
    if (!confirm(`¿Cancelar el taller "${name}"?`)) return;
    const res = await wsApi("", "POST", { action: "delete_workshop", id });
    if (res.success) {
      toast("Taller cancelado", "warn");
      await wsLoadAll();
    } else toast(res.error, "error");
  }

  /* ── MODAL IMÁGENES ── */
  function ensureImagesModal() {
    if (document.getElementById("wm-ws-images")) return;
    const el = document.createElement("div");
    el.className = "wm-overlay";
    el.id = "wm-ws-images";
    el.innerHTML = `
    <div class="wm-box">
      <div class="wm-head">
        <div><h3><i class="fas fa-images"></i> Imágenes del Taller</h3><p id="wm-img-subtitle">Máximo 4 imágenes — La primera marcada como portada</p></div>
        <button class="wm-close" onclick="workshopModule.closeImagesModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="wm-body">
        <div class="wm-alert wm-alert-info"><i class="fas fa-info-circle"></i> Haz clic en un slot para subir imagen. Máx 4 imágenes, 5 MB c/u. Formatos: JPG, PNG, WEBP.</div>
        <div class="wm-img-grid" id="wm-img-grid-ws">
          ${[0, 1, 2, 3].map((i) => `<div class="wm-img-slot" id="wm-img-slot-${i}" onclick="workshopModule.pickImage(${i})"><div class="wm-img-slot-placeholder"><i class="fas fa-plus"></i><span>Imagen ${i + 1}</span></div></div>`).join("")}
        </div>
        <input type="file" id="wm-img-input-ws" accept="image/*" style="display:none" onchange="workshopModule.uploadPickedImage(this)">
        <div class="wm-img-upload-progress" id="wm-img-progress"><div class="wm-img-upload-progress-bar" id="wm-img-progress-bar"></div></div>
      </div>
      <div class="wm-foot">
        <button class="ws-btn" onclick="workshopModule.closeImagesModal()">Cerrar</button>
      </div>
    </div>`;
    el.addEventListener("click", (e) => {
      if (e.target === el) closeImagesModal();
    });
    document.body.appendChild(el);
  }

  let imgModalWorkshopId = null;
  let pickingSlot = null;
  let currentImages = [];

  async function openImagesModal(workshopId) {
    ensureImagesModal();
    imgModalWorkshopId = workshopId;
    document.getElementById("wm-img-subtitle").textContent =
      `Taller ID ${workshopId} — Máx 4 imágenes`;
    document.getElementById("wm-ws-images").classList.add("open");
    await refreshImages();
  }

  function closeImagesModal() {
    const el = document.getElementById("wm-ws-images");
    if (el) el.classList.remove("open");
    imgModalWorkshopId = null;
  }

  async function refreshImages() {
    const res = await wsApi(
      `?action=workshop_images&workshop_id=${imgModalWorkshopId}`,
    );
    currentImages = res.success ? res.data : [];
    renderImageSlots();
    // Also refresh main grid cover
    await wsLoadAll();
  }

  function renderImageSlots() {
    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById(`wm-img-slot-${i}`);
      const img = currentImages[i];
      if (img) {
        slot.innerHTML = `
          <img src="${escHtml(img.url)}" style="width:100%;height:100%;object-fit:cover;">
          ${img.is_cover ? '<span class="wm-img-cover-badge">Portada</span>' : `<button class="wm-img-slot-del" onclick="event.stopPropagation();workshopModule.setAsCovertImage(${img.id})" title="Hacer portada" style="background:rgba(34,211,238,.8);"><i class="fas fa-star"></i></button>`}
          <button class="wm-img-slot-del" onclick="event.stopPropagation();workshopModule.deleteImage(${img.id})" title="Eliminar" style="top:28px;"><i class="fas fa-trash"></i></button>`;
        slot.onclick = null;
      } else {
        slot.innerHTML = `<div class="wm-img-slot-placeholder"><i class="fas fa-plus"></i><span>Imagen ${i + 1}</span></div>`;
        slot.onclick = () => pickImage(i);
      }
    }
  }

  function pickImage(slotIdx) {
    if (currentImages.length >= 4) {
      toast("Máximo 4 imágenes permitidas", "warn");
      return;
    }
    pickingSlot = slotIdx;
    document.getElementById("wm-img-input-ws").value = "";
    document.getElementById("wm-img-input-ws").click();
  }

  async function uploadPickedImage(input) {
    if (!input.files[0]) return;
    const prog = document.getElementById("wm-img-progress");
    const bar = document.getElementById("wm-img-progress-bar");
    prog.style.display = "block";
    bar.style.width = "30%";

    const fd = new FormData();
    fd.append("action", "upload_image");
    fd.append("workshop_id", imgModalWorkshopId);
    fd.append("image", input.files[0]);
    fd.append("image_type", "gallery");
    fd.append("is_cover", currentImages.length === 0 ? "1" : "0");

    bar.style.width = "60%";
    try {
      const res = await fetch("/app/api/admin-workshops.php", {
        method: "POST",
        body: fd,
      }).then((r) => r.json());
      bar.style.width = "100%";
      setTimeout(() => {
        prog.style.display = "none";
        bar.style.width = "0";
      }, 500);
      if (res.success) {
        toast("Imagen subida");
        await refreshImages();
      } else toast(res.error || "Error al subir", "error");
    } catch (e) {
      toast("Error de red", "error");
      prog.style.display = "none";
    }
  }

  async function setAsCovertImage(imageId) {
    const res = await wsApi("", "POST", {
      action: "set_cover_image",
      workshop_id: imgModalWorkshopId,
      image_id: imageId,
    });
    if (res.success) {
      toast("Portada actualizada");
      await refreshImages();
    } else toast(res.error, "error");
  }

  async function deleteImage(imageId) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const res = await wsApi("", "POST", {
      action: "delete_image",
      image_id: imageId,
    });
    if (res.success) {
      toast("Imagen eliminada", "warn");
      await refreshImages();
    } else toast(res.error, "error");
  }

  /* ── MODAL INSTRUCTOR ── */
  function ensureInstructorModal() {
    if (document.getElementById("wm-instructor")) return;
    const el = document.createElement("div");
    el.className = "wm-overlay";
    el.id = "wm-instructor";
    el.style.zIndex = "100001";
    el.innerHTML = `
    <div class="wm-box wm-box-sm">
      <div class="wm-head">
        <div><h3 id="wm-inst-title"><i class="fas fa-user-plus"></i> Nuevo Instructor</h3>
        <p>Crea un perfil de acceso con usuario y contraseña</p></div>
        <button class="wm-close" onclick="workshopModule.closeInstructorModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="wm-body">
        <div class="wm-alert wm-alert-info"><i class="fas fa-shield-alt"></i> El instructor podrá iniciar sesión con su usuario y contraseña en la interfaz de talleristas.</div>

        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-id-card"></i> Datos personales</div>
          <div class="wm-field"><label class="wm-label">Nombre completo *</label>
            <input id="inst-fullname" class="wm-input" type="text" placeholder="Ej. Ing. Osvaldo González"></div>
          <div class="wm-grid2">
            <div class="wm-field"><label class="wm-label">Email</label>
              <input id="inst-email" class="wm-input" type="email" placeholder="correo@ejemplo.com"></div>
            <div class="wm-field"><label class="wm-label">Teléfono</label>
              <input id="inst-phone" class="wm-input" type="tel" placeholder="4521234567"></div>
          </div>
          <div class="wm-field"><label class="wm-label">Especialidad / Área</label>
            <input id="inst-specialty" class="wm-input" type="text" placeholder="Ej. Electrónica, Robótica, IA"></div>
          <div class="wm-field"><label class="wm-label">Biografía / Descripción</label>
            <textarea id="inst-bio" class="wm-input" rows="3" placeholder="Breve descripción del instructor…"></textarea></div>
          <div class="wm-field"><label class="wm-label">Tipo de rol</label>
            <select id="inst-roletype" class="wm-input">
              <option value="instructor">Instructor (Taller)</option>
              <option value="speaker">Ponente (Conferencia)</option>
            </select></div>
        </div>

        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-lock"></i> Acceso al sistema</div>
          <div class="wm-grid2">
            <div class="wm-field"><label class="wm-label">Usuario *</label>
              <input id="inst-username" class="wm-input" type="text" placeholder="usuario_admin" autocomplete="new-password"></div>
            <div class="wm-field"><label class="wm-label">Contraseña *</label>
              <div class="wm-pw-wrap">
                <input id="inst-password" class="wm-input" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
                <button type="button" class="wm-pw-toggle" onclick="const i=document.getElementById('inst-password');i.type=i.type==='password'?'text':'password'"><i class="fas fa-eye"></i></button>
              </div></div>
          </div>
          <p style="font-size:11.5px;color:rgba(226,232,240,.45);margin:4px 0 0">Al editar, deja contraseña en blanco para no cambiarla.</p>
        </div>
      </div>
      <div class="wm-foot">
        <button class="ws-btn" onclick="workshopModule.closeInstructorModal()">Cancelar</button>
        <button class="ws-btn ws-btn-primary" onclick="workshopModule.saveInstructor()"><i class="fas fa-save"></i> Guardar instructor</button>
      </div>
    </div>`;
    el.addEventListener("click", (e) => {
      if (e.target === el) closeInstructorModal();
    });
    document.body.appendChild(el);
  }

  let editingInstructorId = null;

  function openInstructorForm(id = null) {
    ensureInstructorModal();
    editingInstructorId = id;
    document.getElementById("wm-inst-title").innerHTML =
      `<i class="fas fa-user-${id ? "edit" : "plus"}"></i> ${id ? "Editar Instructor" : "Nuevo Instructor"}`;
    [
      "inst-fullname",
      "inst-email",
      "inst-phone",
      "inst-specialty",
      "inst-bio",
      "inst-username",
      "inst-password",
    ].forEach((f) => {
      const el = document.getElementById(f);
      if (el) el.value = "";
    });
    if (id) {
      const inst = wsState.instructors.find((i) => i.id == id);
      if (inst) {
        document.getElementById("inst-fullname").value = inst.full_name || "";
        document.getElementById("inst-email").value = inst.email || "";
        document.getElementById("inst-phone").value = inst.phone || "";
        document.getElementById("inst-specialty").value = inst.specialty || "";
        document.getElementById("inst-bio").value = inst.bio || "";
        document.getElementById("inst-username").value = inst.username || "";
        document.getElementById("inst-roletype").value =
          inst.role_type || "instructor";
      }
    }
    document.getElementById("wm-instructor").classList.add("open");
  }

  function closeInstructorModal() {
    const el = document.getElementById("wm-instructor");
    if (el) el.classList.remove("open");
    editingInstructorId = null;
  }

  async function saveInstructor() {
    const fullName = document.getElementById("inst-fullname").value.trim();
    if (!fullName) {
      toast("El nombre es requerido", "error");
      return;
    }

    const body = {
      action: "save_instructor",
      id: editingInstructorId || 0,
      full_name: fullName,
      email: document.getElementById("inst-email").value.trim(),
      phone: document.getElementById("inst-phone").value.trim(),
      specialty: document.getElementById("inst-specialty").value.trim(),
      bio: document.getElementById("inst-bio").value.trim(),
      role_type: document.getElementById("inst-roletype").value,
      username: document.getElementById("inst-username").value.trim(),
      password: document.getElementById("inst-password").value,
    };

    const res = await wsApi("", "POST", body);
    if (res.success) {
      toast(res.message || "Instructor guardado");
      closeInstructorModal();
      const iRes = await wsApi("?action=instructors");
      if (iRes.success) wsState.instructors = iRes.data;
      renderInstructors();
      // Auto-seleccionar si venimos del form de taller
      if (res.id) {
        const inst = wsState.instructors.find((i) => i.id == res.id);
        if (
          inst &&
          document.getElementById("wm-workshop")?.classList.contains("open")
        ) {
          selectInstructor(inst);
        }
      }
    } else {
      toast(res.error || "Error", "error");
    }
  }

  async function deleteInstructor(id, name) {
    if (!confirm(`¿Eliminar al profesor "${name}"?`)) return;
    const res = await wsApi("", "POST", { action: "delete_instructor", id });
    if (res.success) {
      toast(res.message || "Profesor eliminado", "warn");
      const iRes = await wsApi("?action=instructors");
      if (iRes.success) wsState.instructors = iRes.data;
      renderInstructors();
      if (document.getElementById("wm-workshop")?.classList.contains("open")) {
        const sel = document.getElementById("ws-instructor-id");
        if (sel && String(sel.value) === String(id)) {
          clearInstructor();
        }
      }
    } else {
      toast(res.error || "Error", "error");
    }
  }

  /* ── MODAL INSCRITOS ── */
  async function openEnrollments(workshopId) {
    const res = await wsApi(`?action=enrollments&workshop_id=${workshopId}`);
    if (!res.success) {
      toast("Error al cargar inscritos", "error");
      return;
    }

    let modal = document.getElementById("wm-enrollments");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "wm-overlay";
      modal.id = "wm-enrollments";
      modal.innerHTML = `<div class="wm-box wm-box-lg">
        <div class="wm-head"><div><h3><i class="fas fa-list-check"></i> Inscritos</h3><p id="wm-enr-count"></p></div>
          <button class="wm-close" onclick="document.getElementById('wm-enrollments').classList.remove('open')"><i class="fas fa-times"></i></button></div>
        <div class="wm-body"><div id="wm-enr-list"></div></div>
        <div class="wm-foot"><button class="ws-btn" onclick="document.getElementById('wm-enrollments').classList.remove('open')">Cerrar</button></div>
      </div>`;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("open");
      });
      document.body.appendChild(modal);
    }

    const list = res.data;
    document.getElementById("wm-enr-count").textContent =
      `${list.length} inscritos`;
    document.getElementById("wm-enr-list").innerHTML = !list.length
      ? `<div class="ws-empty"><i class="fas fa-users"></i><p>Sin inscritos aún</p></div>`
      : `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="color:rgba(226,232,240,.5);font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;">
            <th style="padding:8px 10px;text-align:left">Nombre</th>
            <th style="padding:8px 10px;text-align:left">Email</th>
            <th style="padding:8px 10px;text-align:left">Escuela</th>
            <th style="padding:8px 10px;text-align:left">Estado</th>
          </tr></thead>
          <tbody>${list
            .map(
              (u) => `<tr style="border-top:1px solid rgba(148,163,184,.1)">
            <td style="padding:10px">${escHtml(u.full_name)}</td>
            <td style="padding:10px;color:rgba(226,232,240,.6)">${escHtml(u.email)}</td>
            <td style="padding:10px;color:rgba(226,232,240,.6)">${escHtml(u.school || "—")}</td>
            <td style="padding:10px">${statusBadge(u.status)}</td>
          </tr>`,
            )
            .join("")}</tbody>
        </table>`;
    modal.classList.add("open");
  }

  return {
    render,
    renderInstructors,
    switchView,
    openWorkshopForm,
    closeWorkshopModal,
    filterInstructors,
    selectInstructor,
    clearInstructor,
    addTag,
    saveWorkshop,
    deleteWorkshop,
    openImagesModal,
    closeImagesModal,
    pickImage,
    uploadPickedImage,
    setAsCovertImage,
    deleteImage,
    openInstructorForm,
    closeInstructorModal,
    saveInstructor,
    deleteInstructor,
    openEnrollments,
  };
})();

/* ═══════════════════════════════════════════════════
   MÓDULO: CONFERENCIAS
═══════════════════════════════════════════════════ */
const conferencesModule = (function () {
  let editingId = null;
  let confImages = [];

  /* ── RENDER GRID ── */
  function render() {
    const grid = document.getElementById("conferenceGrid");
    if (!grid) return;
    const statusFilter =
      document.getElementById("confStatusFilter")?.value || "";
    const searchQ = (
      document.getElementById("confSearchInput")?.value || ""
    ).toLowerCase();
    let items = wsState.conferences;
    if (statusFilter) items = items.filter((c) => c.status === statusFilter);
    if (searchQ)
      items = items.filter((c) =>
        (c.name + c.speaker_name).toLowerCase().includes(searchQ),
      );

    if (!items.length) {
      grid.innerHTML = `<div class="ws-empty"><i class="fas fa-microphone-lines"></i><p>Sin conferencias aún.<br>Crea la primera con el botón de arriba.</p></div>`;
      return;
    }
    grid.innerHTML = items.map(renderCard).join("");
  }

  function renderCard(c) {
    const cover = c.cover_image_url
      ? `<img class="ws-card-cover" src="${escHtml(c.cover_image_url)}" alt="Portada">`
      : `<div class="ws-card-cover-placeholder"><i class="fas fa-microphone"></i></div>`;

    return `
    <div class="ws-card">
      ${cover}
      <div class="ws-card-body">
        <p class="ws-card-title">${escHtml(c.name)}</p>
        <div class="ws-card-meta">${statusBadge(c.status)}</div>
        ${c.speaker_name ? `<div class="ws-card-info-row"><i class="fas fa-user-microphone"></i><span>${escHtml(c.speaker_name)}</span></div>` : ""}
        ${c.conference_date ? `<div class="ws-card-info-row"><i class="fas fa-calendar"></i><span>${fmtDate(c.conference_date)}${c.time_start ? " · " + fmtTime(c.time_start) : ""}</span></div>` : ""}
        ${c.location ? `<div class="ws-card-info-row"><i class="fas fa-map-marker-alt"></i><span>${escHtml(c.location)}</span></div>` : ""}
      </div>
      <div class="ws-card-footer">
        <button class="ws-btn ws-btn-primary" onclick="conferencesModule.openForm(${c.id})"><i class="fas fa-edit"></i> Editar</button>
        <button class="ws-btn ws-btn-amber" onclick="conferencesModule.openImagesModal(${c.id})"><i class="fas fa-images"></i> Imágenes</button>
        <button class="ws-btn ws-btn-danger" onclick="conferencesModule.deleteConference(${c.id},'${escHtml(c.name)}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }

  /* ── MODAL ── */
  function ensureModal() {
    if (document.getElementById("wm-conference")) return;
    const el = document.createElement("div");
    el.className = "wm-overlay";
    el.id = "wm-conference";
    el.innerHTML = `
    <div class="wm-box wm-box-lg">
      <div class="wm-head">
        <div><h3 id="wm-conf-title"><i class="fas fa-microphone"></i> Nueva Conferencia</h3><p>Nombre del expositor, horario y sala</p></div>
        <button class="wm-close" onclick="conferencesModule.closeForm()"><i class="fas fa-times"></i></button>
      </div>
      <div class="wm-body">
        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-info-circle"></i> Información básica</div>
          <div class="wm-field"><label class="wm-label">Título de la conferencia *</label>
            <input id="conf-name" class="wm-input" type="text" placeholder="Ej. Inteligencia Artificial en la Industria"></div>
          <div class="wm-field"><label class="wm-label">Descripción</label>
            <textarea id="conf-desc" class="wm-input" rows="3" placeholder="¿De qué trata la conferencia?"></textarea></div>
          <div class="wm-grid2">
            <div class="wm-field"><label class="wm-label">Estado</label>
              <select id="conf-status" class="wm-input">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="cancelled">Cancelado</option>
                <option value="completed">Completado</option>
              </select></div>
            <div class="wm-field"><label class="wm-label">Idioma</label>
              <input id="conf-lang" class="wm-input" type="text" value="Español"></div>
          </div>
        </div>

        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-user"></i> Expositor</div>
          <div class="wm-field"><label class="wm-label">Nombre del expositor</label>
            <input id="conf-speaker" class="wm-input" type="text" placeholder="Dr. Juan Pérez"></div>
        </div>

        <div class="wm-section">
          <div class="wm-section-title"><i class="fas fa-calendar-alt"></i> Horario y lugar</div>
          <div class="wm-grid3">
            <div class="wm-field"><label class="wm-label">Fecha</label><input id="conf-date" class="wm-input" type="date"></div>
            <div class="wm-field"><label class="wm-label">Hora inicio</label><input id="conf-start" class="wm-input" type="time"></div>
            <div class="wm-field"><label class="wm-label">Hora fin</label><input id="conf-end" class="wm-input" type="time"></div>
          </div>
          <div class="wm-grid2">
            <div class="wm-field"><label class="wm-label">Edificio</label><input id="conf-building" class="wm-input" type="text" placeholder="Ej. Auditorio Central"></div>
            <div class="wm-field"><label class="wm-label">Sala / Aula</label><input id="conf-room" class="wm-input" type="text" placeholder="Ej. Sala 1"></div>
          </div>
          <div class="wm-field"><label class="wm-label">Capacidad</label>
            <input id="conf-capacity" class="wm-input" type="number" min="1" placeholder="Dejar vacío = sin límite"></div>
        </div>
      </div>
      <div class="wm-foot">
        <button class="ws-btn" onclick="conferencesModule.closeForm()">Cancelar</button>
        <button class="ws-btn ws-btn-primary" onclick="conferencesModule.saveConference()"><i class="fas fa-save"></i> Guardar conferencia</button>
      </div>
    </div>`;
    el.addEventListener("click", (e) => {
      if (e.target === el) closeForm();
    });
    document.body.appendChild(el);
  }

  function openForm(id = null) {
    ensureModal();
    editingId = id;
    document.getElementById("wm-conf-title").innerHTML =
      `<i class="fas fa-microphone"></i> ${id ? "Editar Conferencia" : "Nueva Conferencia"}`;
    [
      "conf-name",
      "conf-desc",
      "conf-speaker",
      "conf-building",
      "conf-room",
      "conf-capacity",
    ].forEach((f) => {
      const el = document.getElementById(f);
      if (el) el.value = "";
    });
    document.getElementById("conf-status").value = "draft";
    document.getElementById("conf-lang").value = "Español";
    document.getElementById("conf-date").value = "";
    document.getElementById("conf-start").value = "";
    document.getElementById("conf-end").value = "";

    if (id) {
      const c = wsState.conferences.find((x) => x.id == id);
      if (c) {
        document.getElementById("conf-name").value = c.name || "";
        document.getElementById("conf-desc").value = c.description || "";
        document.getElementById("conf-status").value = c.status || "draft";
        document.getElementById("conf-lang").value = c.language || "Español";
        document.getElementById("conf-speaker").value = c.speaker_name || "";
        document.getElementById("conf-date").value = c.conference_date || "";
        document.getElementById("conf-start").value =
          c.time_start?.substring(0, 5) || "";
        document.getElementById("conf-end").value =
          c.time_end?.substring(0, 5) || "";
        document.getElementById("conf-building").value = c.building || "";
        document.getElementById("conf-room").value = c.room || "";
        document.getElementById("conf-capacity").value = c.capacity || "";
      }
    }
    document.getElementById("wm-conference").classList.add("open");
  }

  function closeForm() {
    const el = document.getElementById("wm-conference");
    if (el) el.classList.remove("open");
    editingId = null;
  }

  async function saveConference() {
    const name = document.getElementById("conf-name").value.trim();
    if (!name) {
      toast("El título es requerido", "error");
      return;
    }

    const building = document.getElementById("conf-building").value.trim();
    const room = document.getElementById("conf-room").value.trim();
    const body = {
      action: "save_conference",
      id: editingId || 0,
      name,
      description: document.getElementById("conf-desc").value.trim(),
      status: document.getElementById("conf-status").value,
      language: document.getElementById("conf-lang").value,
      speaker_name: document.getElementById("conf-speaker").value.trim(),
      conference_date: document.getElementById("conf-date").value,
      time_start: document.getElementById("conf-start").value,
      time_end: document.getElementById("conf-end").value,
      building,
      room,
      location: [building, room].filter(Boolean).join(", "),
      capacity: document.getElementById("conf-capacity").value || null,
      is_public: 1,
    };

    const res = await wsApi("", "POST", body);
    if (res.success) {
      toast(res.message || "Conferencia guardada");
      closeForm();
      await wsLoadAll();
    } else {
      toast(res.error || "Error", "error");
    }
  }

  async function deleteConference(id, name) {
    if (!confirm(`¿Eliminar la conferencia "${name}"?`)) return;
    const res = await wsApi("", "POST", { action: "delete_conference", id });
    if (res.success) {
      toast("Conferencia eliminada", "warn");
      await wsLoadAll();
    } else toast(res.error, "error");
  }

  /* ── IMÁGENES CONFERENCIA ── */
  let confImgModalId = null;

  function ensureConfImagesModal() {
    if (document.getElementById("wm-conf-images")) return;
    const el = document.createElement("div");
    el.className = "wm-overlay";
    el.id = "wm-conf-images";
    el.innerHTML = `
    <div class="wm-box">
      <div class="wm-head">
        <div><h3><i class="fas fa-images"></i> Imágenes de Conferencia</h3><p>Máximo 4 imágenes por conferencia</p></div>
        <button class="wm-close" onclick="conferencesModule.closeImagesModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="wm-body">
        <div class="wm-alert wm-alert-info"><i class="fas fa-info-circle"></i> Haz clic en un slot para subir imagen. Máx 4, 5 MB c/u.</div>
        <div class="wm-img-grid" id="wm-img-grid-conf">
          ${[0, 1, 2, 3].map((i) => `<div class="wm-img-slot" id="wm-conf-slot-${i}" onclick="conferencesModule.pickImage(${i})"><div class="wm-img-slot-placeholder"><i class="fas fa-plus"></i><span>Imagen ${i + 1}</span></div></div>`).join("")}
        </div>
        <input type="file" id="wm-conf-img-input" accept="image/*" style="display:none" onchange="conferencesModule.uploadPickedImage(this)">
        <div class="wm-img-upload-progress" id="wm-conf-img-progress"><div class="wm-img-upload-progress-bar" id="wm-conf-img-bar"></div></div>
      </div>
      <div class="wm-foot"><button class="ws-btn" onclick="conferencesModule.closeImagesModal()">Cerrar</button></div>
    </div>`;
    el.addEventListener("click", (e) => {
      if (e.target === el) closeImagesModal();
    });
    document.body.appendChild(el);
  }

  let pickingConfSlot = null;

  async function openImagesModal(confId) {
    ensureConfImagesModal();
    confImgModalId = confId;
    document.getElementById("wm-conf-images").classList.add("open");
    await refreshConfImages();
  }

  function closeImagesModal() {
    const el = document.getElementById("wm-conf-images");
    if (el) el.classList.remove("open");
  }

  async function refreshConfImages() {
    const res = await wsApi(
      `?action=conference_images&conference_id=${confImgModalId}`,
    );
    confImages = res.success ? res.data : [];
    renderConfImageSlots();
  }

  function renderConfImageSlots() {
    for (let i = 0; i < 4; i++) {
      const slot = document.getElementById(`wm-conf-slot-${i}`);
      if (!slot) continue;
      const img = confImages[i];
      if (img) {
        slot.innerHTML = `<img src="${escHtml(img.url)}" style="width:100%;height:100%;object-fit:cover;">
          ${img.is_cover ? '<span class="wm-img-cover-badge">Portada</span>' : ""}
          <button class="wm-img-slot-del" onclick="event.stopPropagation();conferencesModule.deleteConfImage(${img.id})"><i class="fas fa-trash"></i></button>`;
        slot.onclick = null;
      } else {
        slot.innerHTML = `<div class="wm-img-slot-placeholder"><i class="fas fa-plus"></i><span>Imagen ${i + 1}</span></div>`;
        slot.onclick = () => pickImage(i);
      }
    }
  }

  function pickImage(i) {
    if (confImages.length >= 4) {
      toast("Máximo 4 imágenes", "warn");
      return;
    }
    pickingConfSlot = i;
    document.getElementById("wm-conf-img-input").value = "";
    document.getElementById("wm-conf-img-input").click();
  }

  async function uploadPickedImage(input) {
    if (!input.files[0]) return;
    const prog = document.getElementById("wm-conf-img-progress");
    const bar = document.getElementById("wm-conf-img-bar");
    prog.style.display = "block";
    bar.style.width = "40%";

    const fd = new FormData();
    fd.append("action", "upload_conference_image");
    fd.append("conference_id", confImgModalId);
    fd.append("image", input.files[0]);

    try {
      const res = await fetch("/app/api/admin-workshops.php", {
        method: "POST",
        body: fd,
      }).then((r) => r.json());
      bar.style.width = "100%";
      setTimeout(() => {
        prog.style.display = "none";
        bar.style.width = "0";
      }, 400);
      if (res.success) {
        toast("Imagen subida");
        await refreshConfImages();
        await wsLoadAll();
      } else toast(res.error || "Error", "error");
    } catch (e) {
      toast("Error de red", "error");
      prog.style.display = "none";
    }
  }

  async function deleteConfImage(id) {
    if (!confirm("¿Eliminar imagen?")) return;
    const res = await wsApi("", "POST", {
      action: "delete_conference_image",
      image_id: id,
    });
    if (res.success) {
      toast("Imagen eliminada", "warn");
      await refreshConfImages();
    } else toast(res.error, "error");
  }

  return {
    render,
    openForm,
    closeForm,
    saveConference,
    deleteConference,
    openImagesModal,
    closeImagesModal,
    pickImage,
    uploadPickedImage,
    deleteConfImage,
  };
})();

/* ═══════════════════════════════════════════════════
   INIT — Se ejecuta cuando la sección es visible
═══════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  wsLoadAll();

  // Re-cargar cuando se active la sección
  const observer = new MutationObserver(() => {
    const wsSection = document.getElementById("section-workshops");
    const confSection = document.getElementById("section-conferences");
    if (
      wsSection?.classList.contains("active") ||
      confSection?.classList.contains("active")
    ) {
      if (!wsState.loaded) wsLoadAll();
    }
  });

  const mainContent = document.querySelector(
    ".main-content, #main-content, .admin-content",
  );
  if (mainContent)
    observer.observe(mainContent, {
      subtree: true,
      attributeFilter: ["class"],
    });

  // Cerrar sugerencias al hacer clic fuera
  document.addEventListener("click", (e) => {
    const sug = document.getElementById("ws-instructor-suggestions");
    if (
      sug &&
      !sug.contains(e.target) &&
      e.target.id !== "ws-instructor-search"
    ) {
      sug.style.display = "none";
    }
  });
});
