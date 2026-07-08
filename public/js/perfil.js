/**
 * perfil.js  v20260503
 * Panel de perfil del usuario: datos personales, inscripción al congreso y taller.
 */

const SESSION_KEY = "renovatec_user_session_v1";
let currentUser = null;
let _programData = null;
let _profileRequestData = null;
let _programLoadPromise = null;

// ─── Smart fields state ──────────────────────────────────────────
let _sfSchoolsDB = [];
let _sfSchoolOk = false; // true cuando viene del catálogo o fue propuesto
let _sfPhoneCountry = { code: "MX", name: "México", flag: "🇲🇽", dial: "+52" };
const _SF_PHONE_COUNTRIES = [
  { code: "MX", name: "México", flag: "🇲🇽", dial: "+52" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "+1" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", dial: "+1" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", dial: "+502" },
  { code: "BZ", name: "Belice", flag: "🇧🇿", dial: "+501" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", dial: "+503" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", dial: "+504" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", dial: "+505" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", dial: "+506" },
  { code: "PA", name: "Panamá", flag: "🇵🇦", dial: "+507" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", dial: "+53" },
  { code: "DO", name: "Rep. Dominicana", flag: "🇩🇴", dial: "+1" },
  { code: "PR", name: "Puerto Rico", flag: "🇵🇷", dial: "+1" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dial: "+57" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", dial: "+58" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", dial: "+593" },
  { code: "PE", name: "Perú", flag: "🇵🇪", dial: "+51" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", dial: "+591" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", dial: "+598" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", dial: "+595" },
  { code: "BR", name: "Brasil", flag: "🇧🇷", dial: "+55" },
  { code: "ES", name: "España", flag: "🇪🇸", dial: "+34" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" },
  { code: "FR", name: "Francia", flag: "🇫🇷", dial: "+33" },
  { code: "DE", name: "Alemania", flag: "🇩🇪", dial: "+49" },
  { code: "IT", name: "Italia", flag: "🇮🇹", dial: "+39" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dial: "+44" },
  { code: "RU", name: "Rusia", flag: "🇷🇺", dial: "+7" },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91" },
  { code: "CN", name: "China", flag: "🇨🇳", dial: "+86" },
  { code: "JP", name: "Japón", flag: "🇯🇵", dial: "+81" },
  { code: "KR", name: "Corea del Sur", flag: "🇰🇷", dial: "+82" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61" },
];
const _SF_CITIES = [
  "Uruapan",
  "Morelia",
  "Guadalajara",
  "Ciudad de México",
  "Monterrey",
  "Puebla",
  "Tijuana",
  "León",
  "Zapopan",
  "Mérida",
  "San Luis Potosí",
  "Aguascalientes",
  "Hermosillo",
  "Mexicali",
  "Culiacán",
  "Acapulco",
  "Saltillo",
  "Veracruz",
  "Chihuahua",
  "Torreón",
  "Querétaro",
  "Oaxaca",
  "Cancún",
  "Tepic",
  "Colima",
  "Durango",
  "Tuxtla Gutiérrez",
  "Zacatecas",
  "Villahermosa",
  "Cuernavaca",
  "Toluca",
  "Tlaxcala",
  "Pachuca",
  "Guanajuato",
  "Celaya",
  "Irapuato",
  "Zamora",
  "Apatzingán",
  "Lázaro Cárdenas",
  "Pátzcuaro",
  "Zitácuaro",
  "Bogotá",
  "Buenos Aires",
  "Santiago",
  "Lima",
  "Caracas",
  "São Paulo",
  "Quito",
  "La Paz",
  "Montevideo",
  "Asunción",
  "Medellín",
  "Cali",
  "Madrid",
  "Barcelona",
  "Lisboa",
  "Paris",
  "Londres",
  "Berlin",
  "Roma",
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Miami",
  "Dallas",
  "San Francisco",
  "Toronto",
  "Vancouver",
  "Ciudad de Guatemala",
];
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
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
    window.location.href = "/acceso";
    return;
  }
  try {
    currentUser = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem("redirectAfterLogin", window.location.href);
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
  setValue(
    "matricula",
    p?.matricula || p?.control_number || currentUser?.username || "",
  );
  setValue("country", p?.country || "");
  setValue("career", p?.career || "");
  setValue("semester", p?.semester || "");
  // Smart fields
  sfInitPhone(p?.phone || "");
  sfInitSchool(p?.school || "");
  sfInitCity(p?.city || "");
  sfInitCountry(p?.country || "");
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
  document
    .getElementById("personalForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Validar escuela: debe venir del catálogo o haber sido propuesta
      const schoolVal = document.getElementById("school")?.value.trim() || "";
      if (!schoolVal) {
        sfSetHint("sfSchoolHint", "La institución es requerida.", "err");
        document.getElementById("school")?.focus();
        return;
      }
      if (!_sfSchoolOk) {
        sfSetHint(
          "sfSchoolHint",
          "Selecciona tu institución del listado o usa 'Registrar como nueva'.",
          "err",
        );
        document.getElementById("school")?.focus();
        return;
      }

      const btn = e.target.querySelector('button[type="submit"]');
      const originalText = btn ? btn.innerHTML : "";
      if (btn)
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

      try {
        const payload = {
          full_name: document.getElementById("fullName")?.value.trim() || "",
          phone: sfGetPhone(),
          school: schoolVal,
          control_number:
            document.getElementById("matricula")?.value.trim() ||
            currentUser?.profile?.control_number ||
            "",
          career:
            document.getElementById("career")?.value.trim() ||
            currentUser?.profile?.career ||
            "N/A",
          semester:
            document.getElementById("semester")?.value.trim() ||
            currentUser?.profile?.semester ||
            "N/A",
          city:
            document.getElementById("city")?.value.trim() ||
            currentUser?.profile?.city ||
            "",
          country:
            document.getElementById("country")?.value.trim() ||
            currentUser?.profile?.country ||
            "México",
          email: currentUser?.email || "",
        };

        const res = await fetch("/app/api/user-profile-update.php", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success)
          throw new Error(data.error || "No se pudo actualizar el perfil");

        currentUser.full_name = payload.full_name;
        currentUser.profile = {
          ...currentUser.profile,
          ...payload,
          matricula: payload.control_number,
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        paintUserHeader();
        showToast("Perfil actualizado correctamente", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        if (btn) btn.innerHTML = originalText;
      }
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
  fetchRequestForProfile().then(() => {
    if (isSectionActive("programa")) {
      ensureProgramSectionLoaded();
    }
  });
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

    const canUpload =
      !hasReceipt || status === "resubmit_requested" || status === "rejected";
    const uploadHtml = canUpload
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
  if (_programData?.delegatedSchedule && typeof window.initScheduleSection === "function") {
    const requests = Array.isArray(_profileRequestData?.all_requests)
      ? _profileRequestData.all_requests
      : [_profileRequestData].filter(Boolean);
    window.initScheduleSection(currentUser || {}, requests);
    return Promise.resolve(_programData);
  }
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
    const canUpload =
      !hasReceipt || status === "resubmit_requested" || status === "rejected";
    uploadBox.style.display = canUpload ? "" : "none";
  }

  // Editar solicitud
  const editLink = document.getElementById("profileEditRequestLink");
  if (editLink) {
    const canEdit =
      !hasReceipt || status === "resubmit_requested" || status === "rejected";
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

// ─── Programa académico ─────────────────────────────────────────

async function fetchProgramForProfile(requestData = _profileRequestData) {
  const loading = document.getElementById("profileProgramLoading");
  const content =
    document.getElementById("profileProgramContent") ||
    document.getElementById("cronogramaContainer");
  const empty = document.getElementById("profileProgramEmpty");
  if (!loading || !content || !empty) return;

  loading.style.display = "";
  content.style.display = "none";
  empty.style.display = "none";

  const request = requestData || _profileRequestData;
  if (typeof window.initScheduleSection === "function") {
    const requests = Array.isArray(request?.all_requests)
      ? request.all_requests
      : [request].filter(Boolean);
    await window.initScheduleSection(currentUser || {}, requests);
    _programData = { delegatedSchedule: true, request };
    return _programData;
  }

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
  const content =
    document.getElementById("profileProgramContent") ||
    document.getElementById("cronogramaContainer");
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
  const usedChanges = Number(
    _programData?.workshopState?.cancellations_used || 0,
  );
  const remainingChanges = Math.max(0, 2 - usedChanges);
  const canUnenroll =
    _programData?.workshopState?.can_unenroll !== false && remainingChanges > 0;

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
        Cambios de taller usados: <strong>${usedChanges}/2</strong>.<br>
        ${
          canUnenroll
            ? `Tienes ${remainingChanges} cambio${remainingChanges !== 1 ? "s" : ""} disponible${remainingChanges !== 1 ? "s" : ""}.<br><br>
        <button id="profileWsUnenrollBtn" class="insc-btn insc-btn--danger-outline" onclick="handleUnenrollTaller()" style="padding: 8px 16px; font-size: 0.85rem;">
          <i class="fas fa-right-from-bracket"></i> Darme de baja del taller
        </button>`
            : "Ya alcanzaste tu límite de cambios de taller."
        }
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

  const used = Number(_programData?.workshopState?.cancellations_used || 0);
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
    // Recargar estado del programa
    _programData = null;
    closeProgramModal();
    await fetchProgramForProfile();
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
  if (!window.__renovatecLogoutConfirmed) {
    showLogoutDelayOverlay(() => {
      window.__renovatecLogoutConfirmed = true;
      cerrarSesion();
    });
    return;
  }
  window.__renovatecLogoutConfirmed = false;
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

function showLogoutDelayOverlay(onDone) {
  let overlay = document.getElementById("userLogoutOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "userLogoutOverlay";
    overlay.innerHTML = `
      <div class="ulo-card">
        <div class="ulo-icon"><i class="fas fa-right-from-bracket"></i></div>
        <h2>Cerrando sesion</h2>
        <p>Puedes cancelar si tocaste el boton por error.</p>
        <div class="ulo-count">Saliendo en <strong id="uloNum">3</strong>s</div>
        <button type="button" id="uloCancel">Cancelar</button>
      </div>`;
    const style = document.createElement("style");
    style.textContent = `
      #userLogoutOverlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,.86);backdrop-filter:blur(18px);font-family:'DM Sans',system-ui,sans-serif}
      .ulo-card{width:min(380px,calc(100vw - 32px));border:1px solid rgba(34,211,238,.24);border-radius:22px;background:linear-gradient(160deg,#0f172a,#07111f);box-shadow:0 28px 90px rgba(0,0,0,.55);padding:30px;text-align:center;color:#e2e8f0}
      .ulo-icon{width:58px;height:58px;border-radius:18px;margin:0 auto 14px;display:grid;place-items:center;background:rgba(34,211,238,.12);color:#22d3ee;font-size:24px}
      .ulo-card h2{margin:0 0 8px;font:800 1.25rem 'Syne',system-ui,sans-serif}.ulo-card p{margin:0;color:#94a3b8}.ulo-count{margin:18px 0 16px;color:#bae6fd}.ulo-count strong{font-size:1.4rem;color:#22d3ee}
      #uloCancel{border:1px solid rgba(148,163,184,.28);background:rgba(15,23,42,.9);color:#e2e8f0;border-radius:999px;padding:10px 20px;font-weight:800;cursor:pointer}
      #uloCancel:hover{border-color:rgba(34,211,238,.55);color:#67e8f9}`;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }

  overlay.style.display = "flex";
  let remaining = 3;
  const num = document.getElementById("uloNum");
  const cancel = document.getElementById("uloCancel");
  let cancelled = false;
  if (num) num.textContent = remaining;
  const tick = setInterval(() => {
    if (cancelled) return;
    remaining -= 1;
    if (num) num.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(tick);
      if (typeof onDone === "function") onDone();
    }
  }, 1000);

  if (cancel) {
    cancel.onclick = () => {
      cancelled = true;
      clearInterval(tick);
      overlay.style.display = "none";
      window.__renovatecLogoutConfirmed = false;
      if (num) num.textContent = "3";
    };
  }
}

function showToast(message, type = "success") {
  // Eliminar toast anterior si existe
  document.querySelectorAll(".pf-toast").forEach((el) => el.remove());

  const icons = { success: "✓", error: "✕", warn: "⚠" };
  const colors = {
    success: {
      bg: "#0f4c2e",
      border: "#22c55e",
      icon: "#4ade80",
      text: "#dcfce7",
    },
    error: {
      bg: "#4c0f0f",
      border: "#ef4444",
      icon: "#f87171",
      text: "#fee2e2",
    },
    warn: {
      bg: "#4c3a0e",
      border: "#f59e0b",
      icon: "#fbbf24",
      text: "#fef3c7",
    },
  };
  const c = colors[type] || colors.success;

  const t = document.createElement("div");
  t.className = "pf-toast";
  t.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 24px;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: ${c.bg};
    border: 1px solid ${c.border};
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    font-family: inherit;
    font-size: 0.92rem;
    color: ${c.text};
    max-width: 340px;
    pointer-events: none;
    animation: pfToastIn 0.25s cubic-bezier(.22,1,.36,1);
  `;

  const iconEl = document.createElement("span");
  iconEl.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${c.border}33;
    color: ${c.icon};
    font-size: 0.85rem;
    font-weight: 700;
    flex-shrink: 0;
  `;
  iconEl.textContent = icons[type] || icons.success;

  const textEl = document.createElement("span");
  textEl.textContent = message;

  t.appendChild(iconEl);
  t.appendChild(textEl);

  // Inyectar animación una sola vez
  if (!document.getElementById("pf-toast-anim")) {
    const style = document.createElement("style");
    style.id = "pf-toast-anim";
    style.textContent = `
      @keyframes pfToastIn {
        from { opacity: 0; transform: translateY(16px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes pfToastOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: translateY(8px) scale(0.96); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(t);

  // Salida animada
  const duration = type === "error" ? 4500 : 3000;
  setTimeout(() => {
    t.style.animation = "pfToastOut 0.2s ease forwards";
    setTimeout(() => t.remove(), 200);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART FIELDS — Teléfono, Escuela y Ciudad
// ═══════════════════════════════════════════════════════════════════════════

(function sfInjectStyles() {
  if (document.getElementById("sf-perfil-styles")) return;
  const s = document.createElement("style");
  s.id = "sf-perfil-styles";
  s.textContent = `
/* ── Phone widget ──────────────────────────────────────────────── */
.sf-phone-wrap{display:flex;position:relative;border:1px solid rgba(255,255,255,0.12);border-radius:10px;overflow:visible;background:var(--input-bg,rgba(255,255,255,0.04));transition:border-color .2s}
.sf-phone-wrap:focus-within{border-color:rgba(59,130,246,.7);box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.sf-phone-dial-btn{display:flex;align-items:center;gap:6px;padding:0 10px 0 12px;background:rgba(255,255,255,.04);border:none;border-right:1px solid rgba(255,255,255,.08);border-radius:10px 0 0 10px;cursor:pointer;font-size:.88rem;color:var(--text-main,#e2e8f0);white-space:nowrap;min-width:90px;height:44px;transition:background .15s;flex-shrink:0}
.sf-phone-dial-btn:hover{background:rgba(255,255,255,.08)}
.sf-phone-dial-flag{font-size:1.25rem;line-height:1}
.sf-phone-dial-code{font-size:.82rem;font-weight:600}
.sf-phone-dial-caret{font-size:.6rem;color:rgba(255,255,255,.35);margin-left:2px}
.sf-phone-num{flex:1;background:transparent;border:none;outline:none;padding:0 14px;font-size:.92rem;color:var(--text-main,#e2e8f0);height:44px;border-radius:0 10px 10px 0;font-family:inherit;min-width:0}
.sf-phone-num::placeholder{color:rgba(255,255,255,.25)}
.sf-phone-dropdown{position:absolute;top:calc(100% + 6px);left:0;min-width:300px;max-width:340px;background:#1e293b;border:1px solid rgba(59,130,246,.25);border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.55);z-index:99999;display:none}
.sf-phone-dropdown.open{display:block}
.sf-phone-search-wrap{padding:10px 12px 8px;border-bottom:1px solid rgba(255,255,255,.06);position:relative;background:#1e293b}
.sf-phone-search{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px 10px 7px 32px;font-size:.83rem;color:#e2e8f0;outline:none;font-family:inherit;box-sizing:border-box}
.sf-phone-search::placeholder{color:rgba(255,255,255,.25)}
.sf-phone-search-icon{position:absolute;left:22px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.3);font-size:.78rem;pointer-events:none}
.sf-phone-list{list-style:none;margin:0;padding:4px 0;max-height:260px;overflow-y:auto;overscroll-behavior:contain}
.sf-phone-list::-webkit-scrollbar{width:4px}
.sf-phone-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
.sf-phone-country{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:.84rem;color:#e2e8f0;transition:background .1s}
.sf-phone-country:hover,.sf-phone-country.active{background:rgba(59,130,246,.14)}
.sf-phone-country-flag{font-size:1.35rem;line-height:1;flex-shrink:0}
.sf-phone-country-name{flex:1}
.sf-phone-country-dial{font-size:.76rem;color:rgba(255,255,255,.4);font-weight:600}
.sf-phone-nores{padding:14px;text-align:center;font-size:.82rem;color:rgba(255,255,255,.3)}
/* ── Autocomplete (school/city) ──────────────────────────────── */
.sf-ac-wrap{position:relative}
.sf-ac-list{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:9000;list-style:none;margin:0;padding:4px 0;background:var(--card-bg,#1e293b);border:1px solid rgba(255,255,255,.1);border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.4);max-height:220px;overflow-y:auto}
.sf-ac-list::-webkit-scrollbar{width:4px}
.sf-ac-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
.sf-ac-item{padding:9px 14px;cursor:pointer;font-size:.82rem;color:var(--text-main,#e2e8f0);display:flex;align-items:center;gap:7px;transition:background .1s}
.sf-ac-item:hover,.sf-ac-item.focused{background:rgba(59,130,246,.14)}
.sf-ac-item.proposal{color:#f59e0b;font-style:italic}
.sf-ac-divider{padding:5px 14px 4px;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.3);border-top:1px solid rgba(255,255,255,.06);margin-top:2px}
.sf-ac-empty{padding:12px 14px;font-size:.8rem;color:var(--text-mute,#94a3b8)}
.sf-hint-ok{color:#4ade80!important}
.sf-hint-warn{color:#f59e0b!important}
.sf-hint-err{color:#ef4444!important}
`;
  document.head.appendChild(s);
})();

/* ── helpers ──────────────────────────────────────────────────────────── */
function _sfNorm(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function _sfEsc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
function _sfHL(text, q) {
  if (!q) return _sfEsc(text);
  const re = new RegExp(
    "(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")",
    "gi",
  );
  return _sfEsc(text).replace(
    re,
    "<mark style='background:rgba(59,130,246,.3);color:inherit;border-radius:2px'>$1</mark>",
  );
}
function sfSetHint(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = "input-hint" + (type ? " sf-hint-" + type : "");
}

/* ═══════════════════════════════════════════════════════════════════
   TELÉFONO
═══════════════════════════════════════════════════════════════════ */
function sfInitPhone(existingPhone) {
  const container = document.getElementById("sfPhoneContainer");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  // Detectar país y número del valor guardado
  let country = _SF_PHONE_COUNTRIES[0];
  let localNum = "";
  if (existingPhone) {
    const norm = existingPhone.replace(/\s/g, "");
    const sorted = [..._SF_PHONE_COUNTRIES].sort(
      (a, b) => b.dial.length - a.dial.length,
    );
    for (const c of sorted) {
      if (norm.startsWith(c.dial)) {
        country = c;
        localNum = norm.slice(c.dial.length).replace(/\D/g, "");
        break;
      }
    }
    if (!existingPhone.startsWith("+"))
      localNum = existingPhone.replace(/\D/g, "");
  }
  _sfPhoneCountry = country;

  // Construir DOM
  const wrap = document.createElement("div");
  wrap.className = "sf-phone-wrap";
  const dialBtn = document.createElement("button");
  dialBtn.type = "button";
  dialBtn.className = "sf-phone-dial-btn";

  const numInput = document.createElement("input");
  numInput.type = "tel";
  numInput.id = "sfPhoneNum";
  numInput.className = "sf-phone-num";
  numInput.placeholder = "Número de teléfono";
  numInput.autocomplete = "tel-national";
  numInput.value = localNum;

  // Hidden que guarda el número completo (leído en submit)
  const hiddenFull = document.createElement("input");
  hiddenFull.type = "hidden";
  hiddenFull.id = "sfPhoneFull";

  function refreshBtn() {
    dialBtn.innerHTML = `<span class="sf-phone-dial-flag">${_sfPhoneCountry.flag}</span><span class="sf-phone-dial-code">${_sfPhoneCountry.dial}</span><i class="fas fa-chevron-down sf-phone-dial-caret"></i>`;
  }
  function refreshHidden() {
    const loc = numInput.value.replace(/\D/g, "");
    hiddenFull.value = loc ? `${_sfPhoneCountry.dial}${loc}` : "";
  }
  refreshBtn();
  refreshHidden();
  numInput.addEventListener("input", refreshHidden);

  // Dropdown
  const dd = document.createElement("div");
  dd.className = "sf-phone-dropdown";
  const sw = document.createElement("div");
  sw.className = "sf-phone-search-wrap";
  sw.innerHTML = `<i class="fas fa-search sf-phone-search-icon"></i><input type="text" class="sf-phone-search" placeholder="Buscar país o lada…" autocomplete="off"/>`;
  const ul = document.createElement("ul");
  ul.className = "sf-phone-list";
  dd.appendChild(sw);
  dd.appendChild(ul);

  function renderList(q = "") {
    const f = _SF_PHONE_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q.toLowerCase()),
    );
    if (!f.length) {
      ul.innerHTML = `<li class="sf-phone-nores">Sin resultados</li>`;
      return;
    }
    ul.innerHTML = f
      .map(
        (c) =>
          `<li class="sf-phone-country${c.code === _sfPhoneCountry.code ? " active" : ""}" data-code="${c.code}"><span class="sf-phone-country-flag">${c.flag}</span><span class="sf-phone-country-name">${c.name}</span><span class="sf-phone-country-dial">${c.dial}</span></li>`,
      )
      .join("");
    ul.querySelectorAll(".sf-phone-country").forEach((li) => {
      li.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        const c = _SF_PHONE_COUNTRIES.find((x) => x.code === li.dataset.code);
        if (c) {
          _sfPhoneCountry = c;
          refreshBtn();
          refreshHidden();
        }
        closeDD();
        numInput.focus();
      });
    });
  }

  const si = sw.querySelector(".sf-phone-search");
  si.addEventListener("input", () => renderList(si.value));
  let ddOpen = false;
  function openDD() {
    ddOpen = true;
    dd.classList.add("open");
    si.value = "";
    renderList();
    setTimeout(() => si.focus(), 30);
  }
  function closeDD() {
    ddOpen = false;
    dd.classList.remove("open");
  }
  dialBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ddOpen ? closeDD() : openDD();
  });
  document.addEventListener("click", (ev) => {
    if (!wrap.contains(ev.target)) closeDD();
  });

  wrap.appendChild(dialBtn);
  wrap.appendChild(numInput);
  wrap.appendChild(hiddenFull);
  wrap.appendChild(dd);
  container.appendChild(wrap);
  renderList();
}

function sfGetPhone() {
  return (
    document.getElementById("sfPhoneFull")?.value ||
    document.getElementById("sfPhoneNum")?.value ||
    ""
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ESCUELA / INSTITUCIÓN
═══════════════════════════════════════════════════════════════════ */
async function _sfLoadSchools() {
  try {
    const res = await fetch("/app/api/auth-schools.php");
    const json = await res.json();
    if (json.success && Array.isArray(json.data?.schools))
      _sfSchoolsDB = json.data.schools;
  } catch (_) {}
}

function sfInitSchool(existingValue) {
  const input = document.getElementById("school");
  const list = document.getElementById("sfSchoolList");
  if (!input || !list) return;

  // Cargar catálogo y luego arrancar autocomplete
  _sfLoadSchools().then(() => {
    if (existingValue) {
      input.value = existingValue;
      _sfSchoolOk = true;
      sfSetHint("sfSchoolHint", "", "");
    }
    _sfBuildAC(
      input,
      list,
      (q) =>
        _sfSchoolsDB
          .filter((i) => _sfNorm(i.name).includes(_sfNorm(q)))
          .slice(0, 15),
      (name) => {
        _sfSchoolOk = true;
        sfSetHint("sfSchoolHint", "✓ Institución en el catálogo", "ok");
      },
      (customName) => {
        _sfSchoolOk = true;
        input.value = customName;
        sfSetHint(
          "sfSchoolHint",
          "⚠ Se registrará como nueva (pendiente de verificación)",
          "warn",
        );
        fetch("/app/api/auth-schools.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customName,
            type: "universidad",
            is_verified: false,
          }),
          credentials: "include",
        }).catch(() => {});
      },
      false, // allowFreeText
    );
    // Invalidar si el usuario teclea manualmente después
    input.addEventListener("input", () => {
      _sfSchoolOk = false;
      sfSetHint("sfSchoolHint", "", "");
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   CIUDAD
═══════════════════════════════════════════════════════════════════ */
function sfInitCity(existingValue) {
  const input = document.getElementById("city");
  const list = document.getElementById("sfCityList");
  if (!input || !list) return;
  if (existingValue) input.value = existingValue;
  _sfBuildAC(
    input,
    list,
    (q) =>
      _SF_CITIES.filter((c) => _sfNorm(c).includes(_sfNorm(q))).slice(0, 12),
    () => {},
    null,
    true, // allowFreeText
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAÍS
═══════════════════════════════════════════════════════════════════ */
function sfInitCountry(existingValue) {
  const input = document.getElementById("country");
  const list = document.getElementById("sfCountryList");
  if (!input || !list) return;
  if (existingValue) input.value = existingValue;
  _sfBuildAC(
    input,
    list,
    (q) =>
      _SF_PHONE_COUNTRIES
        .map((c) => c.name)
        .filter((n) => _sfNorm(n).includes(_sfNorm(q)))
        .slice(0, 12),
    () => {},
    null,
    true,
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AUTOCOMPLETE GENÉRICO
═══════════════════════════════════════════════════════════════════ */
function _sfBuildAC(
  inputEl,
  listEl,
  getSuggestions,
  onSelect,
  onCustom,
  allowFreeText,
) {
  let fi = -1;
  function show(items, q) {
    fi = -1;
    const trimmed = q.trim();
    if (!items.length) {
      if (trimmed.length > 1) {
        if (allowFreeText) {
          listEl.innerHTML = `<li class="sf-ac-empty">Sin coincidencias — puedes escribirla libremente.</li>`;
        } else {
          listEl.innerHTML = `<li class="sf-ac-empty" style="color:#f59e0b"><i class="fas fa-exclamation-triangle"></i> "${_sfEsc(trimmed)}" no está en el catálogo.</li><li class="sf-ac-item proposal" data-val="__custom__"><i class="fas fa-plus-circle" style="color:#f59e0b"></i> Registrar como nueva institución</li>`;
        }
      } else {
        listEl.innerHTML = `<li class="sf-ac-empty">Sigue escribiendo…</li>`;
      }
      listEl.style.display = "block";
      _sfAttach(listEl, inputEl, onSelect, onCustom);
      return;
    }
    const verified = items.filter((i) => !i.proposed);
    const proposed = items.filter((i) => i.proposed);
    let html = verified
      .map((i) => {
        const n = typeof i === "string" ? i : i.name;
        return `<li class="sf-ac-item" data-val="${_sfEsc(n)}"><i class="fas fa-check-circle" style="color:#4ade80;font-size:.7rem"></i>${_sfHL(n, q)}</li>`;
      })
      .join("");
    if (proposed.length) {
      html += `<li class="sf-ac-divider">Propuestas por usuarios</li>`;
      html += proposed
        .map((i) => {
          const n = typeof i === "string" ? i : i.name;
          return `<li class="sf-ac-item proposal" data-val="${_sfEsc(n)}"><i class="fas fa-user-plus" style="font-size:.7rem"></i>${_sfHL(n, q)}</li>`;
        })
        .join("");
    }
    if (!allowFreeText) {
      const exact = items.some(
        (i) => _sfNorm(typeof i === "string" ? i : i.name) === _sfNorm(trimmed),
      );
      if (!exact && trimmed.length > 1)
        html += `<li class="sf-ac-divider">¿No encuentras la tuya?</li><li class="sf-ac-item proposal" data-val="__custom__"><i class="fas fa-plus-circle" style="color:#f59e0b"></i> Registrar "<strong>${_sfEsc(trimmed)}</strong>" como nueva</li>`;
    }
    listEl.innerHTML = html;
    listEl.style.display = "block";
    _sfAttach(listEl, inputEl, onSelect, onCustom);
  }
  function _sfAttach(listEl, inputEl, onSelect, onCustom) {
    listEl.querySelectorAll(".sf-ac-item").forEach((li) => {
      li.addEventListener("mousedown", (ev) => {
        ev.preventDefault();
        const val = li.dataset.val;
        if (val === "__custom__") {
          onCustom && onCustom(inputEl.value.trim());
        } else {
          inputEl.value = val;
          onSelect && onSelect(val);
        }
        listEl.style.display = "none";
      });
    });
  }
  function hide() {
    listEl.style.display = "none";
    fi = -1;
  }
  inputEl.addEventListener("input", () => {
    const q = inputEl.value;
    if (!q.trim()) {
      hide();
      return;
    }
    show(getSuggestions(q), q);
  });
  inputEl.addEventListener("keydown", (ev) => {
    const items = listEl.querySelectorAll(".sf-ac-item");
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      fi = Math.min(fi + 1, items.length - 1);
      items.forEach((li, i) => li.classList.toggle("focused", i === fi));
      items[fi]?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      fi = Math.max(fi - 1, 0);
      items.forEach((li, i) => li.classList.toggle("focused", i === fi));
      items[fi]?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter" && fi >= 0) {
      ev.preventDefault();
      items[fi]?.dispatchEvent(new Event("mousedown"));
    } else if (ev.key === "Escape") hide();
  });
  inputEl.addEventListener("blur", () => setTimeout(hide, 150));
  inputEl.addEventListener("focus", () => {
    if (inputEl.value.trim())
      show(getSuggestions(inputEl.value), inputEl.value);
  });
}
