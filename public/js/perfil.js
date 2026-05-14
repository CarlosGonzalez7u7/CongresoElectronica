/**
 * perfil.js  v20260503
 * Panel de perfil del usuario: datos personales, inscripción al congreso y taller.
 */

const SESSION_KEY = "renovatec_user_session_v1";
let currentUser = null;
let _workshopData = null; // datos del taller activo del usuario
let _programData = null;
let _profileRequestData = null;
let _programLoadPromise = null;
const ROBOTICS_TOURNAMENT_LOCATION =
  "Instituto Tecnologico Superior de Uruapan";
const ROBOTICS_TOURNAMENT_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Instituto+Tecnologico+Superior+de+Uruapan";
const ROBOTICS_CROQUIS_PDF = "Horario y croquis .pdf";
const CAMPAMENTO_GUIDE_PDF = "Campamento .pdf";
const ROBOTICS_CROQUIS_SUMMARY = [
  "Revisa el croquis para ubicar pits, mesas de jueces y áreas de competencia.",
  "Consulta tus bloques de horario para llegar con anticipación a tu categoría.",
  "Verifica rutas de acceso y zonas permitidas para equipos y acompañantes.",
];
const CAMPAMENTO_GUIDE_SUMMARY = [
  "Confirma horario y lugar de check-in del campamento.",
  "Revisa lista de artículos recomendados y reglas de convivencia.",
  "Consulta distribución de actividades y horarios de alimentos.",
];

const REQUEST_STATE_MAP = {
  approved: {
    label: "Aceptado",
    css: "approved",
    icon: "check-circle",
    color: "#22c55e",
  },
  paid: {
    label: "Aceptado",
    css: "approved",
    icon: "check-circle",
    color: "#22c55e",
  },
  pending: {
    label: "En revisión",
    css: "pending",
    icon: "hourglass-half",
    color: "#f2a900",
  },
  rejected: {
    label: "Rechazado",
    css: "rejected",
    icon: "times-circle",
    color: "#ef4444",
  },
  resubmit_requested: {
    label: "Reenviar comprobante",
    css: "resubmit",
    icon: "arrow-rotate-left",
    color: "#38bdf8",
  },
};

const BANNER_MESSAGES = {
  "pending-no-receipt": {
    icon: "clock",
    color: "#f97316",
    title: "Pago pendiente",
    text: "Tu solicitud está guardada. Sube tu comprobante de pago para que el equipo RENOVATEC pueda revisarla.",
  },
  pending: {
    icon: "hourglass-half",
    color: "#f2a900",
    title: "En revisión",
    text: "Tu comprobante fue recibido. El equipo de RENOVATEC está revisándolo. Esto puede tardar hasta 24–48 horas.",
  },
  approved: {
    icon: "check-circle",
    color: "#22c55e",
    title: "¡Solicitud aprobada! 🎉",
    text: "Estás oficialmente inscrito en RENOVATEC 2026. Revisa la sección de talleres para elegir el tuyo.",
  },
  rejected: {
    icon: "times-circle",
    color: "#ef4444",
    title: "Solicitud rechazada",
    text: "Tu solicitud fue rechazada. Lee el mensaje del administrador abajo y vuelve a subir tu comprobante correcto.",
  },
  resubmit_requested: {
    icon: "arrow-rotate-left",
    color: "#38bdf8",
    title: "Se necesita un nuevo comprobante",
    text: "El administrador te pide que vuelvas a subir tu comprobante. Lee el mensaje abajo y corrígelo.",
  },
};

// ─── Bootstrap ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initSession();
  initTabs();
  initForms();
  initRequestSection();
});

// ─── Sesión ──────────────────────────────────────────────────────

function getProjectBasePath() {
  return "";
}

function getApiUrl(endpoint) {
  return `/app/api/${endpoint}`;
}

function initSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    window.location.href = "/acceso";
    return;
  }
  try {
    currentUser = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "/acceso";
    return;
  }
  paintUserHeader();
  fillPersonalForm();
}

function paintUserHeader() {
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const n =
    currentUser?.full_name ||
    currentUser?.profile?.full_name ||
    currentUser?.username ||
    "Participante";
  const e = currentUser?.email || currentUser?.profile?.email || "";
  if (nameEl) nameEl.textContent = n;
  if (emailEl) emailEl.textContent = e || "Sin correo";
}

function fillPersonalForm() {
  const p = currentUser?.profile || {};
  setValue("fullName", currentUser?.full_name || p?.full_name || "");
  setValue("email", currentUser?.email || p?.email || "");
  setValue("phone", p?.phone || "");
  setValue("school", p?.school || "");
  setValue(
    "matricula",
    p?.matricula || p?.control_number || currentUser?.username || "",
  );
  setValue("city", p?.city || "");
  setValue("country", p?.country || "");
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

// ─── Tabs ─────────────────────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");

  const activate = (target) => {
    if (!target) return;
    const sect = document.getElementById(`section-${target}`)
      ? target
      : "personal";
    tabs.forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".profile-section")
      .forEach((s) => s.classList.remove("active"));
    document
      .querySelector(`.nav-tab[data-section="${sect}"]`)
      ?.classList.add("active");
    document.getElementById(`section-${sect}`)?.classList.add("active");
    if (sect === "programa") {
      ensureProgramSectionLoaded();
    }
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("section", sect);
      history.replaceState({}, "", u.toString());
    } catch {}
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () =>
      activate(tab.getAttribute("data-section")),
    );
  });

  const init =
    new URLSearchParams(window.location.search).get("section") ||
    window.location.hash.replace("#", "").trim();
  if (init) activate(init);
}

// ─── Formularios ─────────────────────────────────────────────────

function initForms() {
  document.getElementById("personalForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const updated = {
      ...(currentUser?.profile || {}),
      full_name: document.getElementById("fullName")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
      school: document.getElementById("school")?.value.trim() || "",
      matricula: document.getElementById("matricula")?.value.trim() || "",
      control_number: document.getElementById("matricula")?.value.trim() || "",
      city: document.getElementById("city")?.value.trim() || "",
      country: document.getElementById("country")?.value || "",
    };
    currentUser = {
      ...currentUser,
      full_name: updated.full_name || currentUser.full_name,
      profile: updated,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    paintUserHeader();
    showToast("Perfil actualizado", "success");
  });

  document.getElementById("securityForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const cur = document.getElementById("currentPassword")?.value;
    const nw = document.getElementById("newPassword")?.value;
    const conf = document.getElementById("confirmPassword")?.value;
    if (!cur || !nw || !conf) {
      showToast("Completa todos los campos", "error");
      return;
    }
    if (nw.length < 8) {
      showToast("Mínimo 8 caracteres", "error");
      return;
    }
    if (nw !== conf) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    showToast(
      "Contraseña actualizada (integra el endpoint para persistir)",
      "success",
    );
  });
}

// ─── Sección inscripciones ────────────────────────────────────────

function initRequestSection() {
  Promise.all([fetchRequestForProfile(), fetchWorkshopForProfile()]).then(
    () => {
      if (isSectionActive("programa")) {
        ensureProgramSectionLoaded();
      }
    },
  );
}

function isSectionActive(section) {
  return !!document.querySelector(`.nav-tab[data-section="${section}"].active`);
}

// ─── Estado del panel ────────────────────────────────────────────

function showPanel(id) {
  [
    "profileRequestLoadingPanel",
    "profileNoRequestPanel",
    "profileRequestResult",
  ].forEach((pid) => {
    const el = document.getElementById(pid);
    if (el) el.style.display = pid === id ? "" : "none";
  });
}

// ─── Carga de solicitud al congreso ──────────────────────────────

async function fetchRequestForProfile() {
  const userId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
  if (!userId) {
    showPanel("profileNoRequestPanel");
    return;
  }

  showPanel("profileRequestLoadingPanel");

  try {
    const res = await fetch(
      `${getApiUrl("congress-request-status.php")}?userId=${encodeURIComponent(userId)}&_cb=${Date.now()}`,
      {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      },
    );
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Error al cargar");

    if (json.data) {
      showPanel("profileRequestResult");
      _profileRequestData = json.data;

      if (json.data.all_requests && json.data.all_requests.length > 0) {
        renderMultipleProfileRequests(json.data.all_requests);
      } else {
        renderProfileRequest(json.data);
        if (
          json.data.includes_robotics &&
          (json.data.team_folio || json.data.request_folio)
        ) {
          await fetchRoboticsPackageForProfile(json.data);
        }
      }
      if (document.getElementById("section-programa")) {
        if (isSectionActive("programa")) {
          ensureProgramSectionLoaded();
        }
      }
    } else {
      showPanel("profileNoRequestPanel");
      _profileRequestData = null;
      renderProgramSection(null);
    }
  } catch (err) {
    showPanel("profileNoRequestPanel");
    _setMsg(document.getElementById("profileLookupMessage"), err.message, true);
    _profileRequestData = null;
    renderProgramSection(null);
  }
}

// ─── Render Múltiples Solicitudes ─────────────────────────────────────────
function renderMultipleProfileRequests(requests) {
  const container = document.getElementById("profileRequestResult");
  if (!container) return;

  Array.from(container.children).forEach((child) => {
    if (child.id !== "dynamicRequestsContainer") {
      child.style.display = "none";
    }
  });

  let dynContainer = document.getElementById("dynamicRequestsContainer");
  if (!dynContainer) {
    dynContainer = document.createElement("div");
    dynContainer.id = "dynamicRequestsContainer";
    dynContainer.style.display = "flex";
    dynContainer.style.flexDirection = "column";
    dynContainer.style.gap = "2rem";
    container.appendChild(dynContainer);
  }
  dynContainer.innerHTML = "";

  requests.forEach((req, index) => {
    const status = String(req.status || "pending").toLowerCase();
    const hasReceipt = !!req.receipt_filename;
    const bannerKey =
      status === "pending" && !hasReceipt ? "pending-no-receipt" : status;
    const bannerInfo = BANNER_MESSAGES[bannerKey] || BANNER_MESSAGES["pending"];
    const statusMeta =
      status === "pending" && !hasReceipt
        ? {
            label: "Sin comprobante",
            css: "waiting",
            icon: "hourglass-half",
            color: "#f97316",
          }
        : REQUEST_STATE_MAP[status] || {
            label: "Pendiente",
            css: "pending",
            icon: "clock",
            color: "#f2a900",
          };

    const chips = [
      req.includes_congress
        ? '<span class="insc-chip insc-chip--congress"><i class="fas fa-id-card"></i> Congreso</span>'
        : "",
      req.includes_robotics
        ? '<span class="insc-chip insc-chip--robotics"><i class="fas fa-robot"></i> Robótica</span>'
        : "",
      req.includes_camp
        ? '<span class="insc-chip insc-chip--camp"><i class="fas fa-campground"></i> Campamento</span>'
        : "",
    ]
      .filter(Boolean)
      .join("");

    const feeRows = [
      req.includes_congress
        ? `<div class="insc-fee-row"><span>Congreso</span><span>${_fmtMXN(req.congress_fee)}</span></div>`
        : "",
      req.includes_robotics
        ? `<div class="insc-fee-row"><span>Robótica</span><span>${_fmtMXN(req.robotics_fee)}</span></div>`
        : "",
      req.includes_camp
        ? `<div class="insc-fee-row"><span>Campamento</span><span>${_fmtMXN(req.camp_fee)}</span></div>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    const receiptUrl = `${getApiUrl("get-receipt.php")}?filename=${encodeURIComponent(req.receipt_filename)}`;
    const receiptHtml = hasReceipt
      ? `<div style="margin-top:1.25rem; padding-top:1.25rem; border-top:1px solid rgba(255,255,255,0.1); display:flex; gap:12px; flex-wrap:wrap;">
           <a href="${receiptUrl}" target="_blank" style="flex:1; justify-content:center; text-decoration:none; padding:10px 16px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#eef4ff; transition:all 0.2s; display:inline-flex; align-items:center; gap:8px; font-size:0.9rem; font-weight:600;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
             <i class="fas fa-eye" style="color:#38bdf8;"></i> Ver comprobante
           </a>
           <a href="${receiptUrl}" download="${req.receipt_filename}" style="flex:1; justify-content:center; text-decoration:none; padding:10px 16px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#eef4ff; transition:all 0.2s; display:inline-flex; align-items:center; gap:8px; font-size:0.9rem; font-weight:600;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
             <i class="fas fa-download" style="color:#34d399;"></i> Descargar
           </a>
         </div>`
      : "";

    const adminNoteHtml =
      req.rejection_reason || req.admin_notes
        ? `<div class="insc-admin-note insc-admin-note--${status === "rejected" ? "error" : "info"}" style="margin-top:1rem;"><i class="fas fa-sticky-note"></i> <strong>Nota del Administrador:</strong> ${_esc(req.rejection_reason || req.admin_notes)}</div>`
        : "";

    const uploadHtml =
      status !== "approved" && status !== "paid"
        ? `<div style="margin-top:1.5rem; background:rgba(242,169,0,0.05); padding:1.25rem; border-radius:12px; border:1px solid rgba(242,169,0,0.2);">
             <p style="margin:0 0 12px 0; color:#eef4ff; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
               <i class="fas fa-cloud-arrow-up" style="color:#f2a900; font-size:1.1rem;"></i> 
               <strong>¿Necesitas subir o cambiar tu comprobante?</strong>
             </p>
             <a href="/tramite?resume=5" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; width:100%; text-decoration:none; padding:12px 20px; border-radius:10px; background:linear-gradient(135deg, #f2a900, #c98500); color:#0c1222; font-weight:700; font-size:0.95rem; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 15px rgba(242,169,0,0.3)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
               <i class="fas fa-upload"></i> Subir comprobante
             </a>
           </div>`
        : "";

    let robotsHtml = "";
    if (req.includes_robotics) {
      let robots = [];
      try {
        robots =
          typeof req.robots_snapshot === "string"
            ? JSON.parse(req.robots_snapshot)
            : req.robots_snapshot;
      } catch (e) {}
      if (!Array.isArray(robots)) robots = [];

      let members = [];
      try {
        members =
          typeof req.members_snapshot === "string"
            ? JSON.parse(req.members_snapshot)
            : req.members_snapshot;
      } catch (e) {}
      if (!Array.isArray(members)) members = [];

      const rList = robots.length
        ? robots
            .map(
              (r) =>
                `<li><i class="fas fa-microchip" style="color:#f2a900;font-size:.75rem"></i> ${_esc(r.name || r.robot_name)} <span style="color:rgba(255,255,255,0.5);font-size:0.8rem;">(${_esc(r.category)})</span></li>`,
            )
            .join("")
        : "<li>Sin robots</li>";
      const mList = members.length
        ? members
            .map(
              (m) =>
                `<li><i class="fas fa-user" style="color:#f2a900;font-size:.75rem"></i> ${_esc(typeof m === "string" ? m : m.name)}</li>`,
            )
            .join("")
        : "<li>Sin integrantes extra</li>";
      robotsHtml = `<div style="margin-top:1.5rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:12px; padding:1.5rem;"><h4 style="margin:0 0 1rem 0; color:#eef4ff; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;"><i class="fas fa-robot" style="color:#f2a900;"></i> Detalle del Torneo de Robótica</h4><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div><strong style="color:rgba(255,255,255,0.5); font-size:0.8rem; display:block; margin-bottom:5px;">ROBOTS REGISTRADOS</strong><ul style="list-style:none; padding:0; margin:0; font-size:0.9rem;">${rList}</ul></div><div><strong style="color:rgba(255,255,255,0.5); font-size:0.8rem; display:block; margin-bottom:5px;">INTEGRANTES DEL EQUIPO</strong><ul style="list-style:none; padding:0; margin:0; font-size:0.9rem;">${mList}</ul></div></div></div>`;
    }

    const qrData = encodeURIComponent(
      `FOLIO:${req.request_folio}|TOTAL:${req.total_fee}|CLABE:722969040860863730`,
    );
    const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&bgcolor=ffffff&color=0c1222`;
    const isExpanded = false; // Por defecto deben salir todas escondidas

    const html = `<div class="insc-card" style="position:relative; background:var(--bg-surface); border:1px solid var(--border-light); border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.2); margin-bottom:1.5rem;">
      <div class="insc-card-header" style="padding:1rem 1.5rem; background:rgba(255,255,255,0.03); cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05);" onclick="const b=this.nextElementSibling; b.style.display=b.style.display==='none'?'block':'none'; this.querySelector('.fa-chevron-down').style.transform=b.style.display==='none'?'rotate(0deg)':'rotate(180deg)';">
        <div>
          <h3 style="margin:0; color:#eef4ff; font-size:1.1rem;">Solicitud al RENOVATEC 2026 #${requests.length - index} ${index === 0 ? '<span style="font-size:0.8rem; color:#34d399; font-weight:normal; margin-left:8px;"><i class="fas fa-star"></i> Más reciente</span>' : ""}</h3>
          <span style="font-size:0.8rem; color:rgba(255,255,255,0.5);">Folio: ${req.request_folio || "—"}</span>
        </div>
        <div style="display:flex; align-items:center; gap:15px;">
          <span class="insc-status-pill insc-status-pill--${statusMeta.css}" style="font-size:0.75rem;">${statusMeta.label}</span>
          <i class="fas fa-chevron-down" style="color:rgba(255,255,255,0.5); transition:transform 0.3s; transform:rotate(${isExpanded ? "180deg" : "0deg"});"></i>
        </div>
      </div>

      <div class="insc-card-body" style="display:${isExpanded ? "block" : "none"};">
        <div style="background:linear-gradient(90deg, rgba(255,255,255,0.03), transparent); border-left:4px solid ${bannerInfo.color}; padding:1.5rem;">
          <div style="display:flex; gap:1rem; align-items:flex-start;">
            <i class="fas fa-${bannerInfo.icon}" style="color:${bannerInfo.color}; font-size:2rem; margin-top:0.2rem;"></i>
            <div><h3 style="margin:0 0 0.5rem 0; color:#eef4ff; font-size:1.2rem;">${bannerInfo.title}</h3><p style="margin:0; color:rgba(255,255,255,0.7); font-size:0.95rem; line-height:1.5;">${bannerInfo.text}</p></div>
          </div>
        </div>
        <div style="padding:1.5rem; display:flex; flex-wrap:wrap; gap:1.5rem;">
          <div style="flex:1; min-width:280px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
              <div><span style="color:rgba(255,255,255,0.5); font-size:0.85rem; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:0.5rem;">Creada el</span><div style="color:#eef4ff; font-size:0.95rem;">${_fmtDate(req.created_at)}</div></div>
            </div>
            <div style="margin-bottom:1.5rem;"><strong style="color:rgba(255,255,255,0.5); font-size:0.8rem; display:block; margin-bottom:8px;">PAQUETES INCLUIDOS</strong><div style="display:flex; gap:8px; flex-wrap:wrap;">${chips || '<span class="insc-chip">Sin paquetes</span>'}</div></div>
            <div style="background:rgba(0,0,0,0.2); border-radius:12px; padding:1.25rem;"><strong style="color:rgba(255,255,255,0.5); font-size:0.8rem; display:block; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">DESGLOSE DE COSTOS</strong>${feeRows}<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.2);"><span style="font-weight:700; color:#eef4ff; font-size:1.1rem;">Total</span><span style="font-weight:800; color:#f2a900; font-size:1.2rem;">${_fmtMXN(req.total_fee)}</span></div></div>
            ${robotsHtml}${adminNoteHtml}${receiptHtml}${uploadHtml}
          </div>
          <div style="width:160px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; background:rgba(255,255,255,0.02); padding:1rem; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
            <span style="color:rgba(255,255,255,0.5); font-size:0.8rem; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px; text-align:center;">QR de Folio</span>
            <img src="${qrImgSrc}" style="width:130px; height:130px; background:#fff; padding:4px; border-radius:8px;" alt="QR">
            <strong style="margin-top:10px; font-family:monospace; color:#eef4ff; font-size:0.9rem;">${req.request_folio}</strong>
          </div>
        </div>
      </div>
    </div>`;
    dynContainer.insertAdjacentHTML("beforeend", html);
  });
}
function ensureProgramSectionLoaded() {
  if (_programData) {
    renderProgramSection(_programData);
    return Promise.resolve(_programData);
  }
  if (_programLoadPromise) return _programLoadPromise;
  if (!_profileRequestData) return Promise.resolve(null);

  _programLoadPromise = fetchProgramForProfile(_profileRequestData).finally(
    () => {
      _programLoadPromise = null;
    },
  );
  return _programLoadPromise;
}

// ─── Render de la solicitud ───────────────────────────────────────

function renderProfileRequest(data) {
  const status = String(data.status || "pending").toLowerCase();
  const hasReceipt = !!data.receipt_filename;
  const bannerKey =
    status === "pending" && !hasReceipt ? "pending-no-receipt" : status;
  const bannerInfo = BANNER_MESSAGES[bannerKey] || BANNER_MESSAGES["pending"];
  const statusMeta =
    status === "pending" && !hasReceipt
      ? {
          label: "Sin comprobante",
          css: "waiting",
          icon: "hourglass-half",
          color: "#f97316",
        }
      : REQUEST_STATE_MAP[status] || {
          label: "Pendiente",
          css: "pending",
          icon: "clock",
          color: "#f2a900",
        };

  // Banner
  const banner = document.getElementById("profileStatusBanner");
  const bannerIcon = document.getElementById("profileBannerIcon");
  const bannerTitle = document.getElementById("profileBannerTitle");
  const bannerText = document.getElementById("profileBannerText");
  if (banner) {
    banner.style.borderLeftColor = bannerInfo.color;
    banner.style.setProperty("--banner-color", bannerInfo.color);
  }
  if (bannerIcon) {
    bannerIcon.className = `fas fa-${bannerInfo.icon}`;
    bannerIcon.style.color = bannerInfo.color;
  }
  if (bannerTitle) bannerTitle.textContent = bannerInfo.title;
  if (bannerText) bannerText.textContent = bannerInfo.text;

  // Pill
  const pill = document.getElementById("profileResultStatus");
  if (pill) {
    pill.textContent = statusMeta.label;
    pill.className = `insc-status-pill insc-status-pill--${statusMeta.css}`;
  }

  // Nota del admin (rechazo / reenvío)
  const adminNoteBox = document.getElementById("profileAdminNoteBox");
  const adminNoteText = document.getElementById("profileResultAdminNote");
  const adminContent = data.rejection_reason || data.admin_notes;
  if (adminNoteBox && adminNoteText) {
    adminNoteBox.style.display = adminContent ? "flex" : "none";
    adminNoteText.textContent = adminContent || "";
    adminNoteBox.className = `insc-admin-note insc-admin-note--${status === "rejected" ? "error" : "info"}`;
  }

  // Folio
  _setText("profileResultFolio", data.request_folio || "—");

  // Chips de paquetes
  const chipsEl = document.getElementById("profilePkgChips");
  if (chipsEl) {
    const chips = [
      data.includes_congress
        ? `<span class="insc-chip insc-chip--congress"><i class="fas fa-id-card"></i> Congreso</span>`
        : "",
      data.includes_robotics
        ? `<span class="insc-chip insc-chip--robotics"><i class="fas fa-robot"></i> Robótica</span>`
        : "",
      data.includes_camp
        ? `<span class="insc-chip insc-chip--camp"><i class="fas fa-campground"></i> Campamento</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    chipsEl.innerHTML = chips || '<span class="insc-chip">Sin paquetes</span>';
  }

  // Tabla de precios
  const feeRows = document.getElementById("profileFeeRows");
  if (feeRows) {
    feeRows.innerHTML = [
      data.includes_congress
        ? `<div class="insc-fee-row"><span>Congreso</span><span>${_fmtMXN(data.congress_fee)}</span></div>`
        : "",
      data.includes_robotics
        ? `<div class="insc-fee-row"><span>Robótica</span><span>${_fmtMXN(data.robotics_fee)}</span></div>`
        : "",
      data.includes_camp
        ? `<div class="insc-fee-row"><span>Campamento</span><span>${_fmtMXN(data.camp_fee)}</span></div>`
        : "",
    ]
      .filter(Boolean)
      .join("");
  }
  _setText("profileResultTotal", _fmtMXN(data.total_fee));
  _setText("profileResultCreated", _fmtDate(data.created_at));
  _setText("profileResultReviewed", _fmtDate(data.reviewed_at));
  const reviewedLabel = document.getElementById("profileResultReviewedLabel");
  if (reviewedLabel)
    reviewedLabel.style.display = data.reviewed_at ? "" : "none";

  // Acciones: comprobante
  const receiptBox = document.getElementById("profileResultReceiptActions");
  const viewLink = document.getElementById("profileViewReceiptLink");
  const dlLink = document.getElementById("profileDownloadReceiptLink");
  if (receiptBox && viewLink && dlLink) {
    if (hasReceipt) {
      const url = `${getApiUrl("get-receipt.php")}?filename=${encodeURIComponent(data.receipt_filename)}`;
      receiptBox.style.display = "";
      viewLink.href = url;
      dlLink.href = url;
      dlLink.setAttribute("download", data.receipt_filename);
    } else {
      receiptBox.style.display = "none";
    }
  }

  // Botón subir comprobante (redirige a tramite)
  const uploadBox = document.getElementById("profileUploadRedirectBox");
  if (uploadBox) {
    const canUpload = status !== "approved" && status !== "paid";
    uploadBox.style.display = canUpload ? "" : "none";
  }

  // Editar solicitud
  const editLink = document.getElementById("profileEditRequestLink");
  if (editLink) {
    const canEdit = status !== "approved" && status !== "paid";
    editLink.style.display = canEdit ? "" : "none";
  }

  renderProfilePackageDetails(data, null);
}

async function fetchRoboticsPackageForProfile(request) {
  if (!request?.includes_robotics) {
    renderProfilePackageDetails(request, null);
    return;
  }

  const lookupFolio = request.team_folio || request.request_folio;
  if (!lookupFolio) {
    renderProfilePackageDetails(request, null);
    return;
  }

  try {
    const teamRes = await fetch(
      `${getApiUrl("get-team.php")}?folio=${encodeURIComponent(lookupFolio)}`,
      {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      },
    ).then((r) => r.json());

    renderProfilePackageDetails(
      request,
      teamRes.success ? teamRes.data || null : null,
    );
  } catch (err) {
    console.error("[perfil] Error cargando datos de robótica:", err);
    renderProfilePackageDetails(request, null);
  }
}

function renderProfilePackageDetails(request, teamData) {
  const packageBlock = document.getElementById("profilePackageDetailsBlock");
  const congressCard = document.getElementById("profileCongressPackageCard");
  const roboticsCard = document.getElementById("profileRoboticsPackageCard");
  const campCard = document.getElementById("profileCampPackageCard");
  if (!packageBlock || !congressCard || !roboticsCard || !campCard) return;

  packageBlock.style.display = "grid";

  _setText("profileCongressFolio", request.request_folio || "—");
  _setText("profileCongressPrice", _fmtMXN(request.congress_fee));
  _setText("profileCongressStatus", _getRequestStatusLabel(request));
  _setText("profileCongressCreated", _fmtDate(request.created_at));
  _setText("profileCongressReviewed", _fmtDate(request.reviewed_at));
  congressCard.style.display = request.includes_congress ? "" : "none";

  const roboticsEnabled = !!request.includes_robotics;
  roboticsCard.style.display = roboticsEnabled ? "" : "none";
  if (roboticsEnabled) {
    const roboticsPrice = request.robotics_fee || request.robotics_amount || 0;
    const members = _normalizeMembers(
      Array.isArray(teamData?.members)
        ? teamData.members
        : Array.isArray(request.members_snapshot)
          ? request.members_snapshot
          : [],
    );
    const robots = _normalizeRobots(
      Array.isArray(teamData?.robots)
        ? teamData.robots
        : Array.isArray(request.robots_snapshot)
          ? request.robots_snapshot
          : [],
    );
    const captainName =
      teamData?.team?.captain_name ||
      teamData?.summary?.captain_name ||
      currentUser?.full_name ||
      "—";
    const tournamentInfo = getRoboticsTournamentInfo();

    _setText("profileRoboticsPrice", _fmtMXN(roboticsPrice));
    _setText(
      "profileRoboticsTeamFolio",
      request.team_folio ||
        teamData?.team?.folio ||
        request.request_folio ||
        "—",
    );
    _setText("profileRoboticsCaptain", captainName);
    _setText("profileRoboticsTournamentDate", tournamentInfo.dateLabel);
    _setText("profileRoboticsTournamentTime", tournamentInfo.timeLabel);
    _setText("profileRoboticsTournamentLocation", tournamentInfo.locationLabel);
    _renderList(
      "profileRoboticsMembersList",
      members,
      (member) => {
        const name = member?.name || "Integrante";
        return `<li><i class="fas fa-user" style="color:#f2a900;font-size:.75rem"></i> ${_esc(name)}</li>`;
      },
      "<li>Sin integrantes registrados</li>",
    );
    _renderList(
      "profileRoboticsRobotsList",
      robots,
      (robot) => {
        const name = robot?.name || "Robot";
        const category = robot?.category || "—";
        const file = _getRegulationDocForCategory(category);
        const docsBase = `/assets/docs/`;
        const docLink = file
          ? `<a href="${docsBase + encodeURIComponent(file)}" target="_blank" rel="noopener" class="prog-doc-link" style="margin-left:8px"><i class="fas fa-file-pdf"></i> Reglamento</a>`
          : "";
        return `<li><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%"><span><strong>${_esc(name)}</strong> <span style="color:rgba(237,242,255,.6);font-size:.82rem">${_esc(category)}</span></span>${docLink}</div></li>`;
      },
      "<li>Sin robots registrados</li>",
    );
  }

  const campEnabled = !!request.includes_camp;
  campCard.style.display = campEnabled ? "" : "none";
  if (campEnabled) {
    _setText("profileCampPrice", _fmtMXN(request.camp_fee));
    _setText(
      "profileCampNote",
      "Campamento incluido en tu paquete de inscripción.",
    );
  }
}

// ─── Carga del taller inscrito ────────────────────────────────────

async function fetchWorkshopForProfile() {
  const userId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
  const ws = document.getElementById("profileWorkshopBlock");
  if (!ws) return;

  _showWorkshopState("loading");

  try {
    // Paralelo: estado de enroll + lista de talleres
    const [resEnroll, resWs] = await Promise.all([
      fetch(
        getApiUrl(
          `workshop-enroll.php?userId=${encodeURIComponent(userId || 0)}`,
        ),
      ).then((r) => r.json()),
      fetch(getApiUrl("admin-workshops.php?action=list")).then((r) => r.json()),
    ]);

    _workshopData = {
      canEnroll: !!resEnroll.can_enroll,
      enrolledId: resEnroll.enrolled_workshop_id || null,
      cancellationsUsed: resEnroll.cancellations_used || 0,
      canUnenroll: resEnroll.can_unenroll !== false,
      workshops: resWs.success && Array.isArray(resWs.data) ? resWs.data : [],
    };

    if (!_workshopData.canEnroll) {
      _showWorkshopState("locked");
      return;
    }

    if (!_workshopData.enrolledId) {
      _showWorkshopState("empty");
      return;
    }

    const taller = _workshopData.workshops.find(
      (w) => w.id === _workshopData.enrolledId,
    );
    if (!taller) {
      _showWorkshopState("empty");
      return;
    }

    _renderWorkshopCard(taller);
    _showWorkshopState("card");
  } catch (err) {
    _showWorkshopState("empty");
    console.error("[perfil] Error cargando taller:", err);
  }
}

function _showWorkshopState(state) {
  const ids = {
    loading: "profileWorkshopLoading",
    locked: "profileWorkshopLocked",
    empty: "profileWorkshopEmpty",
    card: "profileWorkshopCard",
  };
  Object.entries(ids).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = k === state ? "" : "none";
  });
}

function _renderWorkshopCard(t) {
  _setText("profileWsName", t.name || "—");
  _setText(
    "profileWsInstructor",
    `Instructor: ${t.instructor_name || "Por definir"}`,
  );
  _setText("profileWsDate", `Fecha: ${t.schedule_date || "Por confirmar"}`);
  _setText(
    "profileWsTime",
    `Horario: ${t.schedule_start || "--:--"} – ${t.schedule_end || "--:--"}`,
  );
  _setText("profileWsLocation", `Lugar: ${t.location || "Por confirmar"}`);
  _setText(
    "profileWsCapacity",
    `Inscritos: ${t.enrolled_count || 0}/${t.max_capacity || 0}`,
  );

  // Nota de bajas
  const note = document.getElementById("profileWsCancelNote");
  const btn = document.getElementById("profileWsUnenrollBtn");
  const box = document.getElementById("profileWsUnenrollBox");
  const used = _workshopData?.cancellationsUsed || 0;
  const canU = _workshopData?.canUnenroll !== false;

  if (note) {
    if (used === 0) {
      note.textContent = "Puedes cambiar de taller hasta 2 veces.";
    } else if (used === 1) {
      note.textContent = "Te queda 1 cambio de taller.";
    } else {
      note.textContent =
        "Alcanzaste el límite de cambios. Ya no puedes darte de baja.";
    }
  }
  if (btn) btn.disabled = !canU;
  if (btn && !canU) btn.title = "Límite de bajas alcanzado";
  if (box) box.style.display = "";
}

// ─── Programa académico ─────────────────────────────────────────

async function fetchProgramForProfile(requestData = _profileRequestData) {
  const loading = document.getElementById("profileProgramLoading");
  const content = document.getElementById("profileProgramContent");
  const empty = document.getElementById("profileProgramEmpty");
  if (!loading || !content || !empty) return;

  loading.style.display = "";
  content.style.display = "none";
  empty.style.display = "none";

  const request = requestData || _profileRequestData;
  const approved =
    request &&
    (String(request.status || "").toLowerCase() === "approved" ||
      String(request.status || "").toLowerCase() === "paid");

  if (!request || !approved || !request.includes_congress) {
    renderProgramSection({ request });
    return;
  }

  try {
    const userId =
      currentUser?.id || currentUser?.user_id || currentUser?.userId;
    const [resWs, resConf, resEnroll] = await Promise.all([
      fetch(getApiUrl("admin-workshops.php?action=list")).then((r) => r.json()),
      fetch(getApiUrl("admin-workshops.php?action=list_conferences")).then(
        (r) => r.json(),
      ),
      userId
        ? fetch(
            getApiUrl(
              `workshop-enroll.php?userId=${encodeURIComponent(userId)}`,
            ),
          ).then((r) => r.json())
        : Promise.resolve({}),
    ]);

    const workshops =
      resWs.success && Array.isArray(resWs.data) ? resWs.data : [];
    const conferences =
      resConf.success && Array.isArray(resConf.data) ? resConf.data : [];
    const enrolledId = resEnroll?.enrolled_workshop_id || null;

    const workshop = enrolledId
      ? workshops.find((item) => Number(item.id) === Number(enrolledId)) || null
      : null;

    let workshopImages = [];
    let workshopEnrollments = [];
    if (workshop?.id) {
      const [imagesRes, enrollRes] = await Promise.all([
        fetch(
          getApiUrl(
            `admin-workshops.php?action=workshop_images&workshop_id=${encodeURIComponent(workshop.id)}`,
          ),
        ).then((r) => r.json()),
        fetch(
          getApiUrl(
            `admin-workshops.php?action=enrollments&workshop_id=${encodeURIComponent(workshop.id)}`,
          ),
        ).then((r) => r.json()),
      ]);
      workshopImages =
        imagesRes.success && Array.isArray(imagesRes.data)
          ? imagesRes.data
          : [];
      workshopEnrollments =
        enrollRes.success && Array.isArray(enrollRes.data)
          ? enrollRes.data
          : [];
    }

    let teamData = null;
    if (
      request.includes_robotics &&
      (request.team_folio || request.request_folio)
    ) {
      try {
        const lookupFolio = request.team_folio || request.request_folio;
        const teamRes = await fetch(
          `${getApiUrl("get-team.php")}?folio=${encodeURIComponent(lookupFolio)}`,
        ).then((r) => r.json());
        if (teamRes.success) teamData = teamRes.data || null;
      } catch {
        teamData = null;
      }
    }

    _programData = {
      request,
      workshops,
      conferences,
      workshop,
      workshopState: {
        can_enroll: !!resEnroll?.can_enroll,
        cancellations_used: Number(resEnroll?.cancellations_used || 0),
        can_unenroll: resEnroll?.can_unenroll !== false,
      },
      workshopImages,
      workshopEnrollments,
      teamData,
    };

    renderProgramSection(_programData);
  } catch (err) {
    console.error("[perfil] Error cargando programa académico:", err);
    renderProgramSection({ request, error: err.message });
  }
}

// ─── QR helper ───────────────────────────────────────────────────────────────
function _renderQR(containerId, value, sizeParam) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const size = Number(sizeParam || 160);
  const qrSize = Math.max(120, size);
  const qrValue = String(value || "").trim();
  if (!value) {
    container.innerHTML =
      '<div class="prog-qr-placeholder"><i class="fas fa-qrcode"></i></div>';
    return;
  }
  // Generar PNG con quiet-zone explícito para mejorar escaneo en móviles.
  // Evitamos canvas local para no deformar módulos al reescalar.
  const img = document.createElement("img");
  img.src =
    "https://api.qrserver.com/v1/create-qr-code/?format=png&ecc=M&qzone=4&size=512x512&data=" +
    encodeURIComponent(qrValue);
  img.alt = "QR";
  img.loading = "eager";
  img.decoding = "sync";
  img.style.cssText =
    "width:100%;height:100%;display:block;object-fit:contain;image-rendering:auto;";
  img.referrerPolicy = "no-referrer";
  container.appendChild(img);
}

// ─── Programa académico ────────────────────────────────────────────────────────

function renderProgramSection(data) {
  const loading = document.getElementById("profileProgramLoading");
  const content = document.getElementById("profileProgramContent");
  const empty = document.getElementById("profileProgramEmpty");
  if (!loading || !content || !empty) return;

  const request = data?.request || _profileRequestData;
  const status = String(request?.status || "").toLowerCase();
  const approved = status === "approved" || status === "paid";

  if (!request || !approved || !request.includes_congress) {
    loading.style.display = "none";
    content.style.display = "none";
    if (empty) {
      const isLocked = request && !approved;
      empty.innerHTML = `
        <i class="fas fa-${isLocked ? "lock" : "calendar-day"}"></i>
        <div>
          <strong>${isLocked ? "Programa aún bloqueado" : "Programa no disponible todavía"}</strong>
          <p>${
            isLocked
              ? "Necesitas tener tu inscripción <strong>aprobada y con comprobante verificado</strong> para ver esta sección."
              : "Cuando tu inscripción sea aprobada verás aquí tu taller, conferencias, torneo y campamento."
          }</p>
        </div>`;
      empty.style.display = "";
    }
    return;
  }

  loading.style.display = "none";
  empty.style.display = "none";
  content.style.display = "";

  // ── Folio y QR ────────────────────────────────────────────────────────────
  const folioEl = document.getElementById("profileProgramRequestFolio");
  if (folioEl) folioEl.textContent = request.request_folio || "—";

  const badgesEl = document.getElementById("profileProgramBadges");
  if (badgesEl) {
    const parts = [];
    if (request.includes_congress)
      parts.push(
        '<span class="prog-badge prog-badge--congress"><i class="fas fa-id-card"></i> Congreso</span>',
      );
    if (request.includes_robotics)
      parts.push(
        '<span class="prog-badge prog-badge--robotics"><i class="fas fa-robot"></i> Robótica</span>',
      );
    if (request.includes_camp)
      parts.push(
        '<span class="prog-badge prog-badge--camp"><i class="fas fa-campground"></i> Campamento</span>',
      );
    parts.push(
      '<span class="prog-badge prog-badge--approved"><i class="fas fa-check-circle"></i> Aprobado</span>',
    );
    badgesEl.innerHTML = parts.join("");
  }

  // QR principal
  const qrVal = request.request_folio || request.team_folio || "";
  _renderQR("profileProgramQrWrap", qrVal, 160);

  // ── Tarjetas de módulos ────────────────────────────────────────────────────
  const cardsEl = document.getElementById("profileProgramCards");
  if (!cardsEl) return;
  cardsEl.innerHTML = "";

  const workshop = data?.workshop || null;
  const conferences = data?.conferences || [];
  const teamData = data?.teamData || null;
  const workshopState = data?.workshopState || {};
  const workshopChangesLeft = Math.max(
    0,
    2 - Number(workshopState.cancellations_used || 0),
  );

  // Tarjeta: Taller
  const wsCard = _buildProgramCard({
    type: "workshop",
    icon: "fas fa-chalkboard-user",
    kindLabel: "Taller",
    statusLabel: workshop ? "Inscrito" : "Sin inscripción",
    title: workshop ? _esc(workshop.name || "Mi Taller") : "Mi Taller",
    sub: workshop
      ? `${_esc(workshop.instructor_name || "Instructor por confirmar")} · ${_formatDateRange(workshop.schedule_date, workshop.schedule_date_end)}`
      : "Elige tu taller en la sección de Inscripciones.",
    tags: workshop
      ? [
          {
            icon: "fa-clock",
            text:
              _formatProgramTime(workshop.schedule_start) +
              " – " +
              _formatProgramTime(workshop.schedule_end),
          },
          {
            icon: "fa-map-marker-alt",
            text: workshop.location || "Por confirmar",
          },
          {
            icon: "fa-users",
            text:
              (workshop.enrolled_count || 0) +
              "/" +
              (workshop.max_capacity || 0) +
              " inscritos",
          },
          {
            icon: "fa-right-from-bracket",
            text: `${workshopChangesLeft} cambio${workshopChangesLeft !== 1 ? "s" : ""} disponible${workshopChangesLeft !== 1 ? "s" : ""}`,
          },
        ]
      : [],
    locked: !workshop,
    lockedMsg: "Sin taller asignado",
    onClick: () =>
      _openModalWorkshop(
        workshop,
        data?.workshopImages || [],
        data?.workshopEnrollments || [],
      ),
  });
  cardsEl.appendChild(wsCard);

  // Tarjeta: Conferencias
  const confItems = Array.isArray(conferences)
    ? conferences.filter((c) => c.status === "published" || c.status === "full")
    : [];
  const confCard = _buildProgramCard({
    type: "conf",
    icon: "fas fa-microphone-lines",
    kindLabel: "Conferencia",
    statusLabel: confItems.length ? "Acceso incluido" : "Pendiente de publicar",
    title: "Conferencias",
    sub: confItems.length
      ? `${confItems.length} conferencia${confItems.length !== 1 ? "s" : ""} disponible${confItems.length !== 1 ? "s" : ""}`
      : "Las conferencias se publicarán pronto.",
    tags: confItems
      .slice(0, 3)
      .map((c) => ({ icon: "fa-circle-dot", text: c.name || "Conferencia" })),
    locked: !confItems.length,
    lockedMsg: "Sin conferencias aún",
    onClick: () => _openModalConferences(confItems),
  });
  cardsEl.appendChild(confCard);

  // Tarjeta: Robótica (Múltiples si el usuario tiene varias solicitudes de robótica)
  const allReqs = request.all_requests || [request];
  const roboticsReqs = allReqs.filter((r) => r.includes_robotics);

  roboticsReqs.forEach((r, idx) => {
    // Si es la solicitud principal, usamos teamData. Si no, usamos los snapshots.
    const isMain = r.id === request.id;
    const membersList =
      isMain && teamData?.members ? teamData.members : r.members_snapshot;
    const robotsList =
      isMain && teamData?.robots ? teamData.robots : r.robots_snapshot;

    const roboticsMembers = _normalizeMembers(membersList);
    const roboticsRobots = _normalizeRobots(robotsList);

    // El folio puede estar en el team (si es main) o en la propia solicitud.
    const rFolio = isMain
      ? r.team_folio || teamData?.team?.folio || r.request_folio
      : r.request_folio;

    // El estatus de la tarjeta individual
    const isApproved = r.status === "approved" || r.status === "paid";

    const robCard = _buildProgramCard({
      type: "robotics",
      icon: "fas fa-robot",
      kindLabel: "Torneo",
      statusLabel: isApproved ? "Equipo registrado" : "Pago pendiente",
      title:
        roboticsReqs.length > 1
          ? `Torneo de Robótica #${idx + 1}`
          : "Torneo de Robótica",
      sub:
        isMain && teamData?.team?.school_name
          ? _esc(teamData.team.school_name)
          : `Folio y datos del equipo ${rFolio}.`,
      tags: [
        {
          icon: "fa-id-badge",
          text: rFolio || "Sin folio",
        },
        {
          icon: "fa-users",
          text:
            ((isMain && teamData?.summary?.total_members) ??
              roboticsMembers.length ??
              "—") + " integrantes",
        },
        {
          icon: "fa-microchip",
          text:
            ((isMain && teamData?.summary?.total_robots) ??
              roboticsRobots.length ??
              "—") + " robots",
        },
      ],
      locked: false,
      onClick: () => _openModalRobotics(r, isMain ? teamData : null),
    });
    cardsEl.appendChild(robCard);
  });

  // Tarjeta: Campamento (solo si aplica)
  if (request.includes_camp) {
    const campCard = _buildProgramCard({
      type: "camp",
      icon: "fas fa-campground",
      kindLabel: "Campamento",
      statusLabel: "Incluido",
      title: "Campamento",
      sub: "Incluido en tu paquete de inscripción al congreso.",
      tags: [
        { icon: "fa-money-bill", text: _fmtMXN(request.camp_fee || 0) },
        { icon: "fa-id-card", text: request.request_folio || "—" },
      ],
      locked: false,
      onClick: () => _openModalCamp(request),
    });
    cardsEl.appendChild(campCard);
  }
}

function _buildProgramCard({
  type,
  icon,
  kindLabel,
  statusLabel,
  title,
  sub,
  tags,
  locked,
  lockedMsg,
  onClick,
}) {
  const card = document.createElement("div");
  card.className = `prog-card prog-card--${type}${locked ? " prog-card--locked" : ""}`;
  if (!locked && onClick) card.addEventListener("click", onClick);

  const colorMap = {
    workshop: "#38bdf8",
    conf: "#a78bfa",
    robotics: "#f2a900",
    camp: "#22c55e",
  };
  const ctaColor = colorMap[type] || "#38bdf8";

  const tagsHtml = tags
    .map(
      (t) =>
        `<span><i class="fas ${t.icon}"></i> ${_esc(String(t.text))}</span>`,
    )
    .join("");

  card.innerHTML = `
    <div class="prog-card-inner">
      <div class="prog-card-topline">
        <span class="prog-card-kind">${_esc(kindLabel || "Convocatoria")}</span>
        ${statusLabel ? `<span class="prog-card-state">${_esc(statusLabel)}</span>` : ""}
      </div>
      <div class="prog-card-icon"><i class="${icon}"></i></div>
      <p class="prog-card-title">${title}</p>
      <p class="prog-card-sub">${sub}</p>
      ${tagsHtml ? `<div class="prog-card-meta">${tagsHtml}</div>` : ""}
    </div>
    <div class="prog-card-footer">
      <span><i class="fas fa-circle-check"></i> ${locked ? lockedMsg || "No disponible" : "Disponible"}</span>
      ${!locked ? `<span class="prog-card-cta">Ver detalle <i class="fas fa-arrow-right"></i></span>` : ""}
    </div>`;
  return card;
}

// ── Modales ────────────────────────────────────────────────────────────────────

function openProgramModal(contentHtml) {
  const modal = document.getElementById("progModal");
  const content = document.getElementById("progModalContent");
  if (!modal || !content) return;
  content.innerHTML = contentHtml;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

window.closeProgramModal = function () {
  const modal = document.getElementById("progModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
};

// Cerrar con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.closeProgramModal();
});

function _modalHeader(iconClass, kicker, title) {
  return `
    <div class="prog-modal-header">
      <div class="prog-modal-icon prog-modal-icon--${iconClass}"><i class="${title.icon || "fas fa-circle"}"></i></div>
      <div class="prog-modal-title-block">
        <p class="prog-modal-kicker">${kicker}</p>
        <h2 class="prog-modal-title">${title.text}</h2>
      </div>
    </div>`;
}

// ── Modal Taller ────────────────────────────────────────────────────────────
function _openModalWorkshop(workshop, images, enrollments) {
  const usedChanges = Number(_workshopData?.cancellationsUsed || 0);
  const remainingChanges = Math.max(0, 2 - usedChanges);
  const canUnenroll =
    _workshopData?.canUnenroll !== false && remainingChanges > 0;

  if (!workshop) {
    openProgramModal(`
      <div class="prog-modal-header">
        <div class="prog-modal-icon prog-modal-icon--ws"><i class="fas fa-chalkboard-user"></i></div>
        <div class="prog-modal-title-block">
          <p class="prog-modal-kicker">Taller</p>
          <h2 class="prog-modal-title">Sin taller asignado</h2>
        </div>
      </div>
      <div class="prog-modal-body">
        <div class="prog-note prog-note--info">
          <i class="fas fa-info-circle"></i> Aún no tienes un taller elegido.
          Ve a la sección de <strong>Mis Inscripciones</strong> para seleccionar uno.
        </div>
        <div class="prog-note">
          <i class="fas fa-right-left"></i>
          Tienes <strong>${remainingChanges}</strong> cambio${remainingChanges !== 1 ? "s" : ""} de taller disponible${remainingChanges !== 1 ? "s" : ""}.
        </div>
        <a href="usuario.html#talleresContainer" class="insc-btn insc-btn--gold" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;background:linear-gradient(135deg,#f2a900,#c98500);color:#1a0d00;font-weight:700;text-decoration:none">
          <i class="fas fa-arrow-right"></i> Ver talleres disponibles
        </a>
      </div>`);
    return;
  }

  const cover = workshop.cover_image_url
    ? workshop.cover_image_url.startsWith("/uploads/")
      ? "/app" + workshop.cover_image_url
      : workshop.cover_image_url
    : "assets/images/electro.png";

  const galleryHtml =
    Array.isArray(images) && images.length
      ? `<div class="prog-gallery">${images
          .map((img) => {
            const src = img.url?.startsWith("/uploads/")
              ? "/app" + img.url
              : img.url || "";
            return src
              ? `<img src="${src}" alt="foto" onerror="this.remove()">`
              : "";
          })
          .filter(Boolean)
          .join("")}</div>`
      : "";

  const daysHtml =
    Array.isArray(workshop.days) && workshop.days.length
      ? workshop.days
          .sort((a, b) => Number(a.day_number) - Number(b.day_number))
          .map(
            (day) => `
        <div class="prog-day-row">
          <strong>Día ${_esc(String(day.day_number || 1))}: ${_esc(day.title || "")}</strong>
          <span>${_formatDateLong(day.date)} · ${_formatProgramTime(day.time_start)} – ${_formatProgramTime(day.time_end)}</span>
          ${day.description ? `<span style="margin-top:4px;color:rgba(210,225,255,0.50)">${_esc(day.description)}</span>` : ""}
        </div>`,
          )
          .join("")
      : "";

  const topics = Array.isArray(workshop.topics) ? workshop.topics : [];
  const materials = Array.isArray(workshop.materials) ? workshop.materials : [];

  const enrolledHtml =
    Array.isArray(enrollments) && enrollments.length
      ? enrollments
          .map(
            (r, i) =>
              `<li><i class="fas fa-user"></i> ${_esc(r.full_name || "Participante")}</li>`,
          )
          .join("")
      : '<li style="color:rgba(210,225,255,0.45)">Sin participantes aún.</li>';

  openProgramModal(`
    <div class="prog-modal-header">
      <div class="prog-modal-icon prog-modal-icon--ws"><i class="fas fa-chalkboard-user"></i></div>
      <div class="prog-modal-title-block">
        <p class="prog-modal-kicker">Mi Taller</p>
        <h2 class="prog-modal-title">${_esc(workshop.name || "Taller")}</h2>
      </div>
    </div>
    <div class="prog-modal-body">
      <img class="prog-cover" src="${cover}" alt="${_esc(workshop.name || "")}" onerror="this.src='assets/images/electro.png'">

      ${workshop.description ? `<div class="prog-note prog-note--info">${_esc(workshop.description)}</div>` : ""}

      <div class="prog-modal-section">
        <div class="prog-modal-section-head"><i class="fas fa-clock"></i> Horario y lugar</div>
        <div class="prog-modal-section-body">
          <div class="prog-info-grid">
            <div class="prog-info-cell"><span>Instructor</span><strong>${_esc(workshop.instructor_name || "Por confirmar")}</strong></div>
            <div class="prog-info-cell"><span>Fechas</span><strong>${_formatDateRange(workshop.schedule_date, workshop.schedule_date_end)}</strong></div>
            <div class="prog-info-cell"><span>Horario</span><strong>${_formatProgramTime(workshop.schedule_start)} – ${_formatProgramTime(workshop.schedule_end)}</strong></div>
            <div class="prog-info-cell"><span>Lugar</span><strong>${_esc(workshop.location || "Por confirmar")}</strong></div>
          </div>
          ${daysHtml ? `<div style="margin-top:12px">${daysHtml}</div>` : ""}
        </div>
      </div>

      ${
        topics.length
          ? `
        <div class="prog-modal-section">
          <div class="prog-modal-section-head"><i class="fas fa-list-ul"></i> Temas</div>
          <div class="prog-modal-section-body">
            <div class="prog-tags">${topics.map((t) => `<span class="prog-tag">${_esc(t)}</span>`).join("")}</div>
          </div>
        </div>`
          : ""
      }

      ${
        materials.length
          ? `
        <div class="prog-modal-section">
          <div class="prog-modal-section-head"><i class="fas fa-toolbox"></i> Materiales</div>
          <div class="prog-modal-section-body">
            <ul class="prog-list">${materials.map((m) => `<li><i class="fas fa-check"></i>${_esc(m)}</li>`).join("")}</ul>
          </div>
        </div>`
          : ""
      }

      ${
        galleryHtml
          ? `
        <div class="prog-modal-section">
          <div class="prog-modal-section-head"><i class="fas fa-images"></i> Galería</div>
          <div class="prog-modal-section-body">${galleryHtml}</div>
        </div>`
          : ""
      }

      ${workshop.requirements ? `<div class="prog-note"><i class="fas fa-info-circle"></i> <strong>Requisitos:</strong> ${_esc(workshop.requirements)}</div>` : ""}

      <div class="prog-modal-section">
        <div class="prog-modal-section-head"><i class="fas fa-user-group"></i> Alumnos inscritos (${Array.isArray(enrollments) ? enrollments.length : 0})</div>
        <div class="prog-modal-section-body"><ul class="prog-list">${enrolledHtml}</ul></div>
      </div>

      <div class="prog-note prog-note--info">
        <i class="fas fa-right-left"></i>
        Cambios de taller usados: <strong>${usedChanges}/2</strong>.
        ${canUnenroll ? `Puedes darte de baja ${remainingChanges} vez${remainingChanges !== 1 ? "es" : ""} más desde Mis Inscripciones.` : "Ya alcanzaste tu límite de cambios."}
      </div>
    </div>`);
}

// ── Modal Conferencias ────────────────────────────────────────────────────────
function _openModalConferences(items) {
  const listHtml = items.length
    ? items
        .sort((a, b) => _programDateTimeValue(a) - _programDateTimeValue(b))
        .map(
          (c, i) => `
        <div class="prog-conf-item">
          <div class="prog-conf-num">${String(i + 1).padStart(2, "0")}</div>
          <div>
            <p class="prog-conf-name">${_esc(c.name || "Conferencia")}</p>
            <p class="prog-conf-desc">${_esc(c.description || "Sin descripción.")}</p>
            <div class="prog-tags">
              <span class="prog-tag"><i class="fas fa-user"></i> ${_esc(c.speaker_name || "Por definir")}</span>
              <span class="prog-tag"><i class="fas fa-calendar-alt"></i> ${_formatDateLong(c.conference_date)}</span>
              <span class="prog-tag"><i class="fas fa-clock"></i> ${_formatProgramTime(c.time_start)} – ${_formatProgramTime(c.time_end)}</span>
              <span class="prog-tag"><i class="fas fa-map-marker-alt"></i> ${_esc(c.location || "Por definir")}</span>
            </div>
          </div>
        </div>`,
        )
        .join("")
    : '<p style="color:rgba(210,225,255,0.50);padding:8px 0">Sin conferencias publicadas aún.</p>';

  openProgramModal(`
    <div class="prog-modal-header">
      <div class="prog-modal-icon prog-modal-icon--conf"><i class="fas fa-microphone-lines"></i></div>
      <div class="prog-modal-title-block">
        <p class="prog-modal-kicker">Programa académico</p>
        <h2 class="prog-modal-title">Conferencias (${items.length})</h2>
      </div>
    </div>
    <div class="prog-modal-body">
      ${items.length ? `<div class="prog-note prog-note--info">Ordenadas por fecha y hora. Los detalles pueden actualizarse.</div>` : ""}
      <div class="prog-modal-section">
        <div class="prog-modal-section-head"><i class="fas fa-list"></i> Listado completo</div>
        <div class="prog-modal-section-body">${listHtml}</div>
      </div>
    </div>`);
}

// ── Modal Robótica ────────────────────────────────────────────────────────────
function _openModalRobotics(request, teamData) {
  const team = teamData?.team || null;
  const members = _normalizeMembers(
    Array.isArray(teamData?.members)
      ? teamData.members
      : Array.isArray(request?.members_snapshot)
        ? request.members_snapshot
        : [],
  );
  const robots = _normalizeRobots(
    Array.isArray(teamData?.robots)
      ? teamData.robots
      : Array.isArray(request?.robots_snapshot)
        ? request.robots_snapshot
        : [],
  );
  const summary = teamData?.summary || null;
  const qrVal =
    request.team_folio || team?.folio || request.request_folio || "";
  const requestStatus = String(request?.status || "").toLowerCase();
  const paymentLabel =
    requestStatus === "approved" || requestStatus === "paid"
      ? "Verificado"
      : team?.payment_status || "Pendiente";

  const membersHtml = members.length
    ? members
        .map(
          (m) =>
            `<li><i class="fas fa-user"></i> ${_esc(m.name || "Miembro")}${m.is_captain ? '<strong style="color:#f2a900;margin-left:6px">Capitán</strong>' : ""}</li>`,
        )
        .join("")
    : '<li style="color:rgba(210,225,255,0.45)">Sin miembros registrados.</li>';

  const robotsHtml = robots.length
    ? robots
        .map(
          (r) =>
            `<li><i class="fas fa-microchip"></i> <strong>${_esc(r.name || "Robot")}</strong><span style="color:rgba(210,225,255,0.50);margin-left:8px">${_esc(r.category || "—")}</span></li>`,
        )
        .join("")
    : '<li style="color:rgba(210,225,255,0.45)">Sin robots registrados.</li>';

  const regulationLinks = _buildRobotRegulationsHtml(robots);
  const roboticsDocUrl = _getPublicDocUrl(ROBOTICS_CROQUIS_PDF);

  openProgramModal(`
    <div class="prog-modal-header">
      <div class="prog-modal-icon prog-modal-icon--rob"><i class="fas fa-robot"></i></div>
      <div class="prog-modal-title-block">
        <p class="prog-modal-kicker">Torneo de Robótica</p>
        <h2 class="prog-modal-title">${_esc(team?.school_name || "Mi Equipo")}</h2>
      </div>
    </div>
    <div class="prog-modal-body">

      <div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center">
        <div>
          <div id="modalRobQrWrap" class="prog-rob-qr-wrap">
            <div class="prog-qr-placeholder"><i class="fas fa-qrcode"></i></div>
          </div>
          <p style="text-align:center;font-size:0.72rem;color:#38bdf8;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-top:6px">QR del equipo</p>
        </div>
        <div class="prog-info-grid">
          <div class="prog-info-cell"><span>Folio</span><strong>${_esc(request.team_folio || team?.folio || request.request_folio || "N/D")}</strong></div>
          <div class="prog-info-cell"><span>Capitán</span><strong>${_esc(team?.captain_name || currentUser?.full_name || "—")}</strong></div>
          <div class="prog-info-cell"><span>Pago</span><strong>${_esc(paymentLabel)}</strong></div>
          <div class="prog-info-cell"><span>Etapa</span><strong>${_esc(team?.registration_stage || "—")}</strong></div>
        </div>
      </div>

      ${
        summary
          ? `
        <div class="prog-modal-section">
          <div class="prog-modal-section-head"><i class="fas fa-chart-bar"></i> Resumen</div>
          <div class="prog-modal-section-body">
            <div class="prog-info-grid">
              <div class="prog-info-cell"><span>Integrantes</span><strong>${summary.total_members || 0}</strong></div>
              <div class="prog-info-cell"><span>Robots</span><strong>${summary.total_robots || 0}</strong></div>
              <div class="prog-info-cell"><span>Precio/robot</span><strong>${_fmtMXN(summary.price_per_robot || 0)}</strong></div>
              <div class="prog-info-cell"><span>Total</span><strong style="color:#f2a900">${_fmtMXN(summary.total_cost || 0)}</strong></div>
            </div>
          </div>
        </div>`
          : ""
      }

      <div class="prog-team-grid">
        <div class="prog-modal-section">
          <div class="prog-modal-section-head"><i class="fas fa-users"></i> Integrantes</div>
          <div class="prog-modal-section-body"><ul class="prog-list">${membersHtml}</ul></div>
        </div>
        <div class="prog-modal-section">
          <div class="prog-modal-section-head"><i class="fas fa-microchip"></i> Robots</div>
          <div class="prog-modal-section-body"><ul class="prog-list">${robotsHtml}</ul></div>
        </div>
      </div>

      <div class="prog-modal-section">
        <div class="prog-modal-section-head"><i class="fas fa-file-pdf"></i> Reglamentos por categoría</div>
        <div class="prog-modal-section-body">${regulationLinks}</div>
      </div>

      <div class="prog-modal-section">
        <div class="prog-modal-section-head"><i class="fas fa-map"></i> Croquis y horarios del torneo</div>
        <div class="prog-modal-section-body">
          <div class="prog-tags" style="margin-bottom:10px">
            <a href="${roboticsDocUrl}" target="_blank" rel="noopener" class="prog-doc-link"><i class="fas fa-file-pdf"></i> Ver PDF</a>
            <a href="${roboticsDocUrl}" download class="prog-doc-link"><i class="fas fa-download"></i> Descargar PDF</a>
          </div>
          <iframe
            src="${roboticsDocUrl}#view=FitH"
            title="Croquis y horarios robótica"
            style="width:100%;height:360px;border:1px solid rgba(56,189,248,.24);border-radius:10px;background:#fff"
          ></iframe>
          <ul class="prog-list" style="margin-top:12px">${_buildSummaryListHtml(ROBOTICS_CROQUIS_SUMMARY)}</ul>
        </div>
      </div>

      <div class="prog-note">
        <i class="fas fa-map-marker-alt"></i> <strong>Sede:</strong> ${ROBOTICS_TOURNAMENT_LOCATION}
        <a href="${ROBOTICS_TOURNAMENT_MAPS_URL}" target="_blank" style="color:#38bdf8;margin-left:8px">Ver en Maps <i class="fas fa-external-link-alt"></i></a>
      </div>
    </div>`);

  // Render QR robótica después del modal (espera DOM)
  setTimeout(() => _renderQR("modalRobQrWrap", qrVal, 140), 50);
}

// ── Modal Campamento ─────────────────────────────────────────────────────────
function _openModalCamp(request) {
  const campDocUrl = _getPublicDocUrl(CAMPAMENTO_GUIDE_PDF);
  openProgramModal(`
    <div class="prog-modal-header">
      <div class="prog-modal-icon prog-modal-icon--camp"><i class="fas fa-campground"></i></div>
      <div class="prog-modal-title-block">
        <p class="prog-modal-kicker">Incluido en tu paquete</p>
        <h2 class="prog-modal-title">Campamento RENOVATEC 2026</h2>
      </div>
    </div>
    <div class="prog-modal-body">
      <div class="prog-note prog-note--success">
        <i class="fas fa-check-circle"></i>
        El campamento está incluido en tu inscripción aprobada. No necesitas hacer ningún trámite adicional.
      </div>
      <div class="prog-modal-section">
        <div class="prog-modal-section-head"><i class="fas fa-info-circle"></i> Detalles</div>
        <div class="prog-modal-section-body">
          <div class="prog-info-grid">
            <div class="prog-info-cell"><span>Folio</span><strong>${_esc(request.request_folio || "—")}</strong></div>
            <div class="prog-info-cell"><span>Costo incluido</span><strong style="color:#22c55e">${_fmtMXN(request.camp_fee || 0)}</strong></div>
          </div>
          <div class="prog-tags" style="margin-top:12px">
            <a href="${campDocUrl}" target="_blank" rel="noopener" class="prog-doc-link"><i class="fas fa-file-pdf"></i> Ver guía PDF</a>
            <a href="${campDocUrl}" download class="prog-doc-link"><i class="fas fa-download"></i> Descargar PDF</a>
          </div>
          <iframe
            src="${campDocUrl}#view=FitH"
            title="Guía campamento"
            style="margin-top:12px;width:100%;height:360px;border:1px solid rgba(34,197,94,.25);border-radius:10px;background:#fff"
          ></iframe>
          <ul class="prog-list" style="margin-top:12px">${_buildSummaryListHtml(CAMPAMENTO_GUIDE_SUMMARY)}</ul>
        </div>
      </div>
    </div>`);
}

// Helpers reutilizados
function _buildProgramPackages(request) {
  const parts = [];
  if (request.includes_congress) parts.push("Congreso");
  if (request.includes_robotics) parts.push("Robótica");
  if (request.includes_camp) parts.push("Campamento");
  return parts.length ? parts.join(" + ") : "Sin paquetes";
}

function _getProgramStatusLabel(status) {
  if (status === "approved" || status === "paid") return "Aprobado";
  if (status === "pending") return "En revisión";
  if (status === "rejected") return "Rechazado";
  if (status === "resubmit_requested") return "Reenviar comprobante";
  return "Sin estado";
}

function _formatProgramTime(value) {
  if (!value) return "--:--";
  const parts = String(value).split(":");
  const hours = Number(parts[0] || 0);
  const minutes = String(parts[1] || "00").padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalized = hours % 12 || 12;
  return `${String(normalized).padStart(2, "0")}:${minutes} ${suffix}`;
}

function _formatDateLong(value) {
  if (!value) return "Por definir";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function _formatDateRange(start, end) {
  const first = _formatDateLong(start);
  const second = _formatDateLong(end);
  if (!end || start === end) return first;
  return `${first} al ${second}`;
}

function _programDateTimeValue(item) {
  const date = item?.conference_date || item?.date || "2099-12-31";
  const time = item?.time_start || "23:59";
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime())
    ? Number.MAX_SAFE_INTEGER
    : parsed.getTime();
}

function _getRequestStatusLabel(request) {
  const status = String(request?.status || "pending").toLowerCase();
  if (status === "approved" || status === "paid") return "Aprobado";
  if (status === "pending")
    return request?.receipt_filename ? "En revisión" : "Sin comprobante";
  if (status === "rejected") return "Rechazado";
  if (status === "resubmit_requested") return "Reenviar comprobante";
  return "Pendiente";
}

function getRoboticsTournamentInfo() {
  const now = new Date();
  const eventYear =
    now <= new Date(now.getFullYear(), 9, 23, 17, 0, 0)
      ? now.getFullYear()
      : now.getFullYear() + 1;
  const date = new Date(eventYear, 9, 23, 9, 0, 0);
  const dateLabel = date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return {
    dateLabel,
    timeLabel: _formatProgramTime("09:00"),
    locationLabel: ROBOTICS_TOURNAMENT_LOCATION,
    mapsUrl: ROBOTICS_TOURNAMENT_MAPS_URL,
  };
}

// ─── Darse de baja del taller ─────────────────────────────────────

window.handleUnenrollTaller = async function () {
  const userId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
  if (!userId) return;

  const used = _workshopData?.cancellationsUsed || 0;
  const remaining = Math.max(0, 1 - used);

  const msg =
    used === 0
      ? `¿Seguro que quieres darte de baja?\n\nPodrás inscribirte a otro taller. Te quedará 1 cambio más después de este.`
      : `Esta es tu ÚLTIMA oportunidad de cambiar de taller.\n\nDespués de darte de baja no podrás hacerlo de nuevo.\n\n¿Continuar?`;

  if (!confirm(msg)) return;

  const btn = document.getElementById("profileWsUnenrollBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando…';
  }

  try {
    const res = await fetch(getApiUrl("workshop-enroll.php"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unenroll", userId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(json.message || "Baja procesada correctamente", "success");
    // Recargar estado
    await fetchWorkshopForProfile();
  } catch (err) {
    showToast(err.message || "No se pudo procesar la baja", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-right-from-bracket"></i> Darme de baja';
    }
  }
};

// ─── Utilidades ───────────────────────────────────────────────────

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _setMsg(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.className = `insc-msg${isError ? " insc-msg--error" : ""}`;
  el.style.display = msg ? "" : "none";
}

function _fmtMXN(amount) {
  return `$${Number(amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function _fmtDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  return isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function _esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function _renderList(id, items, itemFn, emptyHtml) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.length ? items.map(itemFn).join("") : emptyHtml;
}

function _normalizeMembers(items) {
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  if (!Array.isArray(items)) return [];
  return items
    .map((member) => {
      if (typeof member === "string") {
        const name = member.trim();
        return name ? { name, is_captain: false } : null;
      }
      if (!member || typeof member !== "object") return null;
      const name =
        member.member_name ||
        member.full_name ||
        member.name ||
        member.memberName ||
        "";
      if (!String(name).trim()) return null;
      return {
        name: String(name).trim(),
        is_captain:
          member.is_captain === true ||
          Number(member.is_captain) === 1 ||
          member.role === "captain",
      };
    })
    .filter(Boolean);
}

function _normalizeRobots(items) {
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (e) {
      items = [];
    }
  }
  if (!Array.isArray(items)) return [];
  return items
    .map((robot) => {
      if (typeof robot === "string") {
        const raw = robot.trim();
        if (!raw) return null;
        const withCategory = raw.match(/^(.*?)\s*\((.*?)\)\s*$/);
        if (withCategory) {
          return {
            name: withCategory[1].trim() || "Robot",
            category: withCategory[2].trim() || "—",
          };
        }
        return { name: raw, category: "—" };
      }
      if (!robot || typeof robot !== "object") return null;
      const name =
        robot.robot_name || robot.name || robot.robotName || robot.nombre || "";
      const category =
        robot.category ||
        robot.cat ||
        robot.categoria ||
        robot.robot_category ||
        "—";
      if (!String(name).trim() && !String(category).trim()) return null;
      return {
        name: String(name || "Robot").trim(),
        category: String(category || "—").trim(),
      };
    })
    .filter(Boolean);
}

function _getRegulationDocForCategory(categoryRaw) {
  const c = String(categoryRaw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!c) return null;
  if (c.includes("minisumo")) return "reglamento-minisumo-rc.pdf";
  if (c.includes("sumo") && (c.includes("mini") || c.includes("rc")))
    return "reglamento-minisumo-rc.pdf";
  if (c.includes("seguidor") || c.includes("linea"))
    return "reglamento-seguidor-linea.pdf";
  if (c.includes("guerra") || c.includes("1lb"))
    return "reglamento-guerra-1lb.pdf";
  if (c.includes("soccer") || c.includes("futbol"))
    return "reglamento-soccer-rc.pdf";
  if (c.includes("insecto") || c.includes("beetle"))
    return "reglamento-insecto.pdf";
  if (c.includes("carro") || c.includes("coche") || c.includes("rc"))
    return "reglamento-carros-rc.pdf";
  return null;
}

function _buildRobotRegulationsHtml(robots) {
  if (!Array.isArray(robots) || !robots.length) {
    return '<p style="color:rgba(210,225,255,0.55);margin:0">Aún no hay categorías de robots para sugerir reglamento.</p>';
  }

  const rows = [];
  robots.forEach((robot) => {
    const file = _getRegulationDocForCategory(robot.category);
    rows.push({
      name: robot.name || "Robot",
      category: robot.category || "—",
      file,
    });
  });

  return `<ul class="prog-list">${rows
    .map((row) => {
      const base = `/assets/docs/`;
      const link = row.file
        ? `<a href="${base + encodeURIComponent(row.file)}" target="_blank" rel="noopener" class="prog-doc-link"><i class="fas fa-file-pdf"></i> Ver reglamento</a>`
        : '<span style="color:rgba(210,225,255,0.45)">Sin reglamento mapeado para esta categoría</span>';
      return `<li><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;width:100%"><div><strong>${_esc(row.name)}</strong><span style="display:block;color:rgba(210,225,255,0.55);font-size:.82rem">${_esc(row.category)}</span></div>${link}</div></li>`;
    })
    .join("")}</ul>`;
}

function _getPublicDocUrl(fileName) {
  return `/assets/docs/${encodeURIComponent(String(fileName || ""))}`;
}

function _buildSummaryListHtml(points) {
  if (!Array.isArray(points) || !points.length) {
    return '<li style="color:rgba(210,225,255,0.55)">Consulta el PDF para ver todos los detalles.</li>';
  }
  return points
    .map(
      (point) =>
        `<li><i class="fas fa-circle-check"></i> ${_esc(String(point || ""))}</li>`,
    )
    .join("");
}

// ─── Utilidades UI (preservadas) ─────────────────────────────────

function cambiarAvatar(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Selecciona una imagen válida", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const av = document.getElementById("avatarDisplay");
    if (av) av.innerHTML = `<img src="${e.target.result}" alt="Avatar" />`;
    showToast("Foto de perfil actualizada", "success");
  };
  reader.readAsDataURL(file);
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";
  const btn = input
    .closest(".password-input")
    ?.querySelector(".toggle-password");
  if (!btn) return;
  btn.querySelector(".eye-open")?.classList.toggle("hidden", willShow);
  btn.querySelector(".eye-closed")?.classList.toggle("hidden", !willShow);
}

function cerrarSesion() {
  fetch("/app/api/auth-logout.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .catch((err) => console.error("Error al cerrar sesión en servidor:", err))
    .finally(() => {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem("renovatec_package_draft_v1");
      window.location.href = "/acceso";
    });
}

function showToast(message, type = "success") {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
