// ===== PANEL ADMINISTRATIVO CON BD REAL =====

let isAuthenticated = false;
let currentUser = null;
let allTeams = [];
let categoryStats = [];
let selectedTeam = null;
let selectedCheckinTeam = null;
let activeSection = "congress";
let selectedCompetitionCategory = null;
let selectedValidationStage = null;
let securityActivityEvents = [];

let scanStream = null;
let scanTimerId = null;
let scanDetector = null;
let scanCanvas = null;
let scanContext = null;
let dashboardRefreshTimer = null;
const DASHBOARD_REFRESH_MS = 10000;
const SEEN_PENDING_STORAGE_KEY = "adminSeenPendingIds";
let seenPendingIds = new Set();
let reviewActionMode = null;
let isReviewSubmitting = false;
let lastNewPendingCount = 0;
let uiAudioContext = null;
let globalStatusTimer = null;
let checkinOverlayTimer = null;

const EVENT_YEAR = 2026;
const STAGE_DEFINITIONS = {
  1: {
    id: 1,
    label: "Etapa 1",
    shortLabel: "E1",
    rangeText: `1 abril - 30 junio`,
    price: 130,
    start: `${EVENT_YEAR}-04-01T00:00:00`,
    end: `${EVENT_YEAR}-06-30T23:59:59`,
  },
  2: {
    id: 2,
    label: "Etapa 2",
    shortLabel: "E2",
    rangeText: `1 julio - 31 agosto`,
    price: 200,
    start: `${EVENT_YEAR}-07-01T00:00:00`,
    end: `${EVENT_YEAR}-08-31T23:59:59`,
  },
  3: {
    id: 3,
    label: "Etapa 3",
    shortLabel: "E3",
    rangeText: `1 septiembre - 23 octubre`,
    price: 350,
    start: `${EVENT_YEAR}-09-01T00:00:00`,
    end: `${EVENT_YEAR}-10-23T23:59:59`,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  checkExistingIpBlock();
  adminSplashInit();
  initAdminPanel();
});

function checkExistingIpBlock() {
  const blockedUntil = localStorage.getItem("renovatec_ip_block_until");
  if (!blockedUntil) return;
  const unblockTime = parseInt(blockedUntil, 10);
  const now = Date.now();

  if (now < unblockTime) {
    const msg =
      localStorage.getItem("renovatec_ip_block_msg") ||
      "Por seguridad, tu red ha sido bloqueada temporalmente debido a intentos sospechosos.";

    let overlay = document.getElementById("globalIpBlockOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "globalIpBlockOverlay";
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(10, 15, 28, 0.95); backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px); z-index: 9999999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: #f1f5f9; font-family: 'Syne', 'DM Sans', sans-serif; text-align: center;
        padding: 20px; box-sizing: border-box;
      `;

      overlay.innerHTML = `
        <div style="max-width: 600px; width: 100%; background: #1e293b; border: 1px solid #ef4444; border-radius: 16px; padding: 40px 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <i class="fas fa-shield-alt" style="font-size: 4rem; color: #ef4444; margin-bottom: 20px;"></i>
          <h2 style="margin: 0 0 15px; color: #ef4444; font-size: 1.8rem;">Acceso Bloqueado</h2>
          <p style="font-size: 1.1rem; line-height: 1.5; margin-bottom: 25px;">${msg}</p>
          
          <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <div style="font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Tiempo restante para desbloqueo:</div>
            <div id="ipBlockCountdown" style="font-size: 3.5rem; font-weight: bold; color: #fca5a5; font-variant-numeric: tabular-nums;">00:00</div>
          </div>
          
          <div style="font-size: 0.95rem; color: #cbd5e1; margin-bottom: 30px; line-height: 1.6;">
            <p style="margin: 0 0 10px;">Si crees que esto es un error, comunícate con los organizadores:</p>
            <p style="margin: 0;" id="ipBlockContactEmail"><i class="fas fa-envelope"></i> Cargando correo...</p>
            <p style="margin: 5px 0 0;" id="ipBlockContactPhone"><i class="fas fa-phone"></i> Cargando teléfono...</p>
          </div>
          
          <div style="font-size: 0.75rem; color: #64748b; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
            <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/9_240124.pdf" target="_blank" rel="noopener" style="color: #60a5fa; text-decoration: none;">
              <i class="fas fa-balance-scale"></i> El acceso ilícito a sistemas y equipos de informática es un delito federal contemplado en el <strong>Código Penal Federal (Art. 211 bis 1)</strong>.
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";

      // Cargar los datos de contacto dinámicamente
      fetch("/app/api/public-landing.php")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data && json.data.settings) {
            const email =
              json.data.settings.landing_contact_email || "soporte@evento.com";
            const phone = json.data.settings.landing_contact_phone || "N/A";
            const emailEl = document.getElementById("ipBlockContactEmail");
            const phoneEl = document.getElementById("ipBlockContactPhone");
            if (emailEl)
              emailEl.innerHTML = `<i class="fas fa-envelope"></i> <a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">${email}</a>`;
            if (phoneEl && phone !== "N/A")
              phoneEl.innerHTML = `<i class="fas fa-phone"></i> <a href="tel:${phone}" style="color: #60a5fa; text-decoration: none;">${phone}</a>`;
            else if (phoneEl) phoneEl.style.display = "none";
          }
        })
        .catch(() => {});
    }

    const countdownEl = document.getElementById("ipBlockCountdown");

    function updateTimer() {
      const timeLeft = unblockTime - Date.now();
      if (timeLeft <= 0) {
        localStorage.removeItem("renovatec_ip_block_until");
        localStorage.removeItem("renovatec_ip_block_msg");
        if (overlay) overlay.remove();
        document.body.style.overflow = "";
        window.location.reload();
        return;
      }

      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      if (countdownEl) {
        countdownEl.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      }
      setTimeout(updateTimer, 1000);
    }

    updateTimer();
  } else {
    localStorage.removeItem("renovatec_ip_block_until");
    localStorage.removeItem("renovatec_ip_block_msg");
  }
}

/* ── Admin Splash helpers ── */
function adminSplashInit() {
  const splash = document.getElementById("adminSplash");
  if (!splash) return;
  const msgs = [
    "Verificando sesión…",
    "Cargando módulos…",
    "Preparando panel…",
  ];
  let i = 0;
  const msgEl = document.getElementById("adminSplashMsg");
  const interval = setInterval(() => {
    i++;
    if (msgEl && msgs[i]) msgEl.textContent = msgs[i];
    if (i >= msgs.length - 1) clearInterval(interval);
  }, 700);
}

function adminSplashHide() {
  const splash = document.getElementById("adminSplash");
  const panel = document.getElementById("adminPanel");
  if (!splash) return;
  if (panel) {
    panel.style.visibility = "visible";
    panel.style.opacity = "1";
  }
  splash.classList.add("admin-splash-out");
  setTimeout(() => {
    splash.classList.add("admin-splash-hidden");
  }, 500);
}

function getProjectBasePath() {
  return "";
}

function getApiUrl(endpoint) {
  return `/app/api/${endpoint}`;
}

function normalizeFolio(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function extractFolioFromText(text) {
  let normalized = String(text || "").toUpperCase();
  try {
    normalized = decodeURIComponent(normalized);
  } catch (e) {}
  const matchFolio = normalized.match(/FOLIO[:=]([^|%]+)/);
  if (matchFolio && matchFolio[1]) {
    return matchFolio[1].trim();
  }
  const match = normalized.match(/RENOV-\d{14}-\d{4}/);
  return match ? match[0] : null;
}

function getCategoryLabel(category) {
  const map = {
    "robot-guerra-1lb": "Robot de guerra 1 lb",
    "robot-guerra-3lb": "Robot de guerra 3lb",
    "seguidor-linea-profesional": "Seguidor de línea profesional",
    "seguidor-linea-amateur": "Seguidor de línea amateur",
    "carros-rc": "Carros RC",
    "soccer-rc": "Soccer RC",
    "mini-sumo-rc": "Mini sumo RC",
    "robot-insecto": "Robot insecto",
  };
  return map[category] || category || "Sin categoría";
}

function getStageDefinition(stageValue) {
  return (
    STAGE_DEFINITIONS[Number(stageValue)] || {
      id: Number(stageValue) || 0,
      label: `Etapa ${stageValue || "-"}`,
      shortLabel: `E${stageValue || "-"}`,
      rangeText: "Sin rango",
      price: 0,
      start: null,
      end: null,
    }
  );
}

function getStageState(stageValue) {
  const def = getStageDefinition(stageValue);
  if (!def.start || !def.end) {
    return "unknown";
  }

  const now = new Date();
  const start = new Date(def.start);
  const end = new Date(def.end);

  if (now < start) {
    return "upcoming";
  }
  if (now > end) {
    return "closed";
  }
  return "active";
}

function getStageStateLabel(stageValue) {
  const state = getStageState(stageValue);
  if (state === "active") {
    return "Activa";
  }
  if (state === "upcoming") {
    return "Próxima";
  }
  if (state === "closed") {
    return "Cerrada";
  }
  return "Sin datos";
}

function getCurrentStageNumber() {
  const now = new Date();
  const activeEntry = Object.values(STAGE_DEFINITIONS).find((stage) => {
    const start = new Date(stage.start);
    const end = new Date(stage.end);
    return now >= start && now <= end;
  });

  if (activeEntry) {
    return Number(activeEntry.id);
  }

  if (now < new Date(STAGE_DEFINITIONS[1].start)) {
    return 1;
  }

  if (now > new Date(STAGE_DEFINITIONS[3].end)) {
    return 3;
  }

  return 1;
}

function formatStageLabel(stageValue) {
  return getStageDefinition(stageValue).label;
}

function formatStageShortLabel(stageValue) {
  return getStageDefinition(stageValue).shortLabel;
}

function formatStagePrice(stageValue) {
  return formatMoney(getStageDefinition(stageValue).price || 0);
}

function getTeamStageNumber(team) {
  return safeNumber(team?.registration_stage, 0) || 0;
}

function getTeamTimelineValue(team, fieldName = "created_at") {
  const raw = team?.[fieldName] || team?.upload_date || team?.created_at || "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortTeamsByStageThenDate(
  teams,
  fieldName = "created_at",
  direction = "asc",
) {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...teams].sort((left, right) => {
    const stageDiff = getTeamStageNumber(left) - getTeamStageNumber(right);
    if (stageDiff !== 0) {
      return stageDiff * multiplier;
    }

    const leftTime = getTeamTimelineValue(left, fieldName);
    const rightTime = getTeamTimelineValue(right, fieldName);
    return (leftTime - rightTime) * multiplier;
  });
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString("es-MX");
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `$${amount.toLocaleString("es-MX")} MXN`;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLocalhostHost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function getArrivalSummary(team) {
  const total = Number(
    team.number_of_robots || (team.robots || []).length || 0,
  );
  const arrived = Number(team.arrived_robots_count || 0);

  if (!total) {
    return {
      status: team.arrived ? "arrived" : "missing",
      label: team.arrived ? "Llego" : "Pendiente",
      detail: "Sin robots registrados",
    };
  }

  if (arrived <= 0) {
    if (team.arrived) {
      return {
        status: "partial",
        label: "Llego",
        detail: total ? `Sin desglose (${total} robots)` : "Sin desglose",
      };
    }

    return {
      status: "missing",
      label: "No llegaron",
      detail: `0/${total} robots`,
    };
  }

  if (arrived >= total) {
    return {
      status: "arrived",
      label: "Completos",
      detail: `${arrived}/${total} robots`,
    };
  }

  return {
    status: "partial",
    label: "Parcial",
    detail: `${arrived}/${total} robots`,
  };
}

function setScanStatus(message, type = "info") {
  const el = document.getElementById("scanStatus");
  if (!el) {
    setGlobalStatus(message, type);
    return;
  }
  el.textContent = message;
  el.classList.remove("info", "success", "error");
  el.classList.add(type);

  if (el.offsetParent === null) {
    setGlobalStatus(message, type);
  }
}

function setGlobalStatus(message, type = "info") {
  const el = document.getElementById("globalStatus");
  if (!el) {
    return;
  }

  const safeType = ["info", "success", "error", "warning"].includes(type)
    ? type
    : "info";

  let iconClass = "fas fa-circle-info";
  if (safeType === "success") iconClass = "fas fa-circle-check";
  if (safeType === "error") iconClass = "fas fa-circle-xmark";
  if (safeType === "warning") iconClass = "fas fa-triangle-exclamation";

  el.className = "global-status";
  el.innerHTML = `
    <div class="status-item ${safeType}">
      <i class="${iconClass}" aria-hidden="true"></i>
      <span class="status-item-text"></span>
      <button type="button" class="status-close-btn" aria-label="Cerrar notificacion">
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  `;
  const textEl = el.querySelector(".status-item-text");
  if (textEl) textEl.textContent = message;

  const closeBtn = el.querySelector(".status-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      el.classList.remove("show");
    });
  }

  el.classList.add("show");

  if (globalStatusTimer) {
    window.clearTimeout(globalStatusTimer);
  }
  globalStatusTimer = window.setTimeout(() => {
    el.classList.remove("show");
  }, 3200);
}

function showCheckinOverlay(
  message,
  title = "Registro confirmado",
  options = {},
) {
  const overlay = document.getElementById("checkinOverlayToast");
  const titleEl = document.getElementById("checkinOverlayTitle");
  const messageEl = document.getElementById("checkinOverlayMessage");
  const cardEl = overlay
    ? overlay.querySelector(".checkin-overlay-card")
    : null;
  const iconEl = overlay
    ? overlay.querySelector(".checkin-overlay-icon i")
    : null;
  const variant = options.variant === "danger" ? "danger" : "success";
  const iconClass =
    typeof options.iconClass === "string" && options.iconClass.trim()
      ? options.iconClass.trim()
      : "fas fa-circle-check";

  if (!overlay || !titleEl || !messageEl) {
    setGlobalStatus(`${title}: ${message}`, "success");
    return;
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  if (cardEl) {
    cardEl.classList.remove("is-success", "is-danger");
    cardEl.classList.add(variant === "danger" ? "is-danger" : "is-success");
  }
  if (iconEl) {
    iconEl.className = iconClass;
  }
  overlay.classList.add("show");

  if (checkinOverlayTimer) {
    window.clearTimeout(checkinOverlayTimer);
  }

  checkinOverlayTimer = window.setTimeout(() => {
    overlay.classList.remove("show");
  }, 5200);
}

function resetCheckinForNextScan() {
  stopScanner();
  selectedCheckinTeam = null;

  const folioInput = document.getElementById("scanFolioInput");
  const notesInput = document.getElementById("robotCheckinNotes");
  const teamMeta = document.getElementById("robotCheckinTeamMeta");
  const robotList = document.getElementById("robotCheckinList");
  const checkinCard = document.getElementById("robotCheckinCard");

  if (folioInput) {
    folioInput.value = "";
    folioInput.focus();
  }
  if (notesInput) {
    notesInput.value = "";
  }
  if (teamMeta) {
    teamMeta.textContent = "";
  }
  if (robotList) {
    robotList.innerHTML = "";
  }
  if (checkinCard) {
    checkinCard.style.display = "none";
  }

  setScanStatus("Listo para escanear un nuevo QR.", "info");
}

function pulseNotificationBell() {
  const btn = document.getElementById("notificationsToggleBtn");
  if (!btn) {
    return;
  }
  btn.classList.remove("pulse");
  window.requestAnimationFrame(() => {
    btn.classList.add("pulse");
    window.setTimeout(() => {
      btn.classList.remove("pulse");
    }, 650);
  });
}

function playUiTone(kind = "info") {
  try {
    // Prevenir advertencia de AudioContext en consola si el usuario no ha interactuado
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    if (!uiAudioContext) {
      uiAudioContext = new AudioCtx();
    }
    if (uiAudioContext.state === "suspended") {
      uiAudioContext.resume().catch(() => {});
    }

    const config =
      kind === "scan"
        ? { freq: 760, dur: 0.08, type: "triangle" }
        : kind === "success"
          ? { freq: 620, dur: 0.11, type: "sine" }
          : kind === "warning"
            ? { freq: 420, dur: 0.14, type: "square" }
            : { freq: 520, dur: 0.1, type: "sine" };

    const now = uiAudioContext.currentTime;
    const osc = uiAudioContext.createOscillator();
    const gain = uiAudioContext.createGain();

    osc.type = config.type;
    osc.frequency.setValueAtTime(config.freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + config.dur);

    osc.connect(gain);
    gain.connect(uiAudioContext.destination);
    osc.start(now);
    osc.stop(now + config.dur + 0.02);
  } catch {
    // Ignorar restricciones del navegador de audio/autoplay.
  }
}

function normalizePhoneForWhatsapp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length === 10) {
    return `52${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("52")) {
    return digits;
  }
  return digits;
}

function buildWhatsappLink(phone, message) {
  const normalized = normalizePhoneForWhatsapp(phone);
  if (!normalized) {
    return "";
  }
  return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message || "")}`;
}

/**
 * AUTENTICACIÓN — sin login propio en este panel.
 * El login vive en acceso.html (auth-login.php).
 * Aquí solo verificamos que exista la sesión guardada con scope=admin.
 * Si no hay sesión válida → redirige a acceso.html.
 */
function initAdminPanel() {
  let savedUser = null;
  try {
    const raw = sessionStorage.getItem("adminUser");
    if (raw) savedUser = JSON.parse(raw);
  } catch {
    savedUser = null;
  }

  // Sin sesión o sin scope admin → redirigir al login
  if (!savedUser || !savedUser.username) {
    sessionStorage.removeItem("adminUser");
    window.location.href = "/acceso";
    return;
  }

  isAuthenticated = true;
  currentUser = savedUser;

  // Actualizar nombre en header
  const displayName = currentUser.full_name || currentUser.username || "Admin";
  const userEl = document.getElementById("currentUser");
  if (userEl) userEl.textContent = displayName;

  // Botón salir
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // Ocultar splash y mostrar panel
  adminSplashHide();

  // Restricciones de interfaz según el rol
  const role = String(
    currentUser.admin_role || currentUser.role || "",
  ).toLowerCase();
  if (role === "staff") {
    document
      .querySelectorAll(".superadmin-only")
      .forEach((el) => el.style.setProperty("display", "none", "important"));
    activeSection = "checkin";
  } else {
    const requestedSection = getFocusSectionFromUrl();
    if (requestedSection) {
      activeSection = requestedSection;
      document.body.classList.add("focused-mode");
      const focusedBanner = document.getElementById("focusedReturnBanner");
      if (focusedBanner) focusedBanner.style.display = "inline-flex";
    }
  }

  initDashboard();

  setTimeout(() => {
    try {
      const rawPending = sessionStorage.getItem(
        "renovatec_pending_module_config",
      );
      if (!rawPending) return;
      sessionStorage.removeItem("renovatec_pending_module_config");
      const pending = JSON.parse(rawPending);
      if (typeof window.openModuleConfigModal === "function") {
        window.openModuleConfigModal(pending);
      }
    } catch (error) {
      console.error("No se pudo abrir el módulo pendiente", error);
    }
  }, 0);
}

function handleLogout() {
  _showLogoutOverlay(function () {
    fetch("/app/api/auth-logout.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .catch((err) => console.error("Error al cerrar sesion:", err))
      .finally(() => {
        sessionStorage.removeItem("adminUser");
        isAuthenticated = false;
        currentUser = null;
        if (typeof stopScanner === "function") stopScanner();
        if (dashboardRefreshTimer) {
          window.clearInterval(dashboardRefreshTimer);
          dashboardRefreshTimer = null;
        }
        window.location.href = "/acceso";
      });
  });
}

function _showLogoutOverlay(onDone) {
  var overlay = document.getElementById("adminLogoutOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "adminLogoutOverlay";
    overlay.innerHTML =
      '<div class="alo-backdrop"></div>' +
      '<div class="alo-card">' +
      '<div class="alo-spinner-ring"><div></div><div></div><div></div><div></div></div>' +
      '<div class="alo-title">Cerrando sesion…</div>' +
      '<div class="alo-subtitle">Por favor espera un momento</div>' +
      '<div class="alo-countdown-wrap">' +
      '<span class="alo-countdown-label">Redirigiendo en</span>' +
      '<span class="alo-countdown-num" id="aloCountdownNum">3</span>' +
      '<span class="alo-countdown-label">seg</span>' +
      "</div>" +
      '<div class="alo-progress-bar"><div class="alo-progress-fill" id="aloProgressFill"></div></div>' +
      "</div>";
    var style = document.createElement("style");
    style.textContent =
      "#adminLogoutOverlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;animation:aloFadeIn 0.3s ease}" +
      "@keyframes aloFadeIn{from{opacity:0}to{opacity:1}}" +
      ".alo-backdrop{position:absolute;inset:0;background:rgba(5,10,20,0.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}" +
      ".alo-card{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:16px;padding:48px 56px;" +
      "background:linear-gradient(160deg,#0f172a 0%,#1a2540 100%);" +
      "border:1px solid rgba(248,113,113,0.25);border-radius:22px;" +
      "box-shadow:0 0 70px rgba(248,113,113,0.1),0 24px 72px rgba(0,0,0,0.7);" +
      "text-align:center;min-width:300px;animation:aloSlideUp 0.4s cubic-bezier(0.22,1,0.36,1)}" +
      "@keyframes aloSlideUp{from{transform:translateY(30px) scale(0.94);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}" +
      ".alo-spinner-ring{display:inline-block;position:relative;width:60px;height:60px}" +
      ".alo-spinner-ring div{box-sizing:border-box;display:block;position:absolute;width:48px;height:48px;margin:6px;" +
      "border:4px solid transparent;border-radius:50%;animation:aloSpin 1.2s cubic-bezier(0.5,0,0.5,1) infinite}" +
      ".alo-spinner-ring div:nth-child(1){border-top-color:#f87171;animation-delay:-0.45s}" +
      ".alo-spinner-ring div:nth-child(2){border-top-color:rgba(248,113,113,0.6);animation-delay:-0.3s}" +
      ".alo-spinner-ring div:nth-child(3){border-top-color:rgba(248,113,113,0.3);animation-delay:-0.15s}" +
      ".alo-spinner-ring div:nth-child(4){border-top-color:rgba(248,113,113,0.1)}" +
      "@keyframes aloSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}" +
      ".alo-title{font-size:1.2rem;font-weight:700;color:#f1f5f9;letter-spacing:-0.01em}" +
      ".alo-subtitle{font-size:0.84rem;color:rgba(255,255,255,0.4);margin-top:-8px}" +
      ".alo-countdown-wrap{display:flex;align-items:center;gap:6px;background:rgba(248,113,113,0.08);" +
      "border:1px solid rgba(248,113,113,0.2);border-radius:30px;padding:6px 16px}" +
      ".alo-countdown-label{font-size:0.78rem;color:rgba(255,255,255,0.45)}" +
      ".alo-countdown-num{font-size:1.35rem;font-weight:800;color:#f87171;min-width:28px;text-align:center;transition:transform 0.15s}" +
      ".alo-progress-bar{width:220px;height:4px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden}" +
      ".alo-progress-fill{height:100%;width:100%;border-radius:4px;background:linear-gradient(90deg,#f87171,#fb923c);transform-origin:left;transition:transform linear}";
    document.head.appendChild(style);
    document.body.appendChild(overlay);
  }
  overlay.style.display = "flex";

  var numEl = document.getElementById("aloCountdownNum");
  var fillEl = document.getElementById("aloProgressFill");
  var SECS = 3;
  var remaining = SECS;

  if (fillEl) {
    fillEl.style.transition = "none";
    fillEl.style.transform = "scaleX(1)";
    fillEl.offsetWidth; // force reflow
    fillEl.style.transition = "transform " + SECS + "s linear";
    fillEl.style.transform = "scaleX(0)";
  }

  var tick = setInterval(function () {
    remaining--;
    if (numEl) {
      numEl.style.transform = "scale(1.35)";
      numEl.textContent = remaining;
      setTimeout(function () {
        numEl.style.transform = "scale(1)";
      }, 150);
    }
    if (remaining <= 0) {
      clearInterval(tick);
      if (typeof onDone === "function") onDone();
    }
  }, 1000);
}

async function apiJson(endpoint, options = {}) {
  const response = await fetch(getApiUrl(endpoint), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.error || `Error HTTP ${response.status}`);
  }

  return result;
}

/** Vincula evento solo si el elemento existe — evita crash por IDs faltantes */
function bindEl(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function initDashboard() {
  initSectionNavigation();
  setupPasswordToggles();
  initNotifications();
  bindGlobalActionDelegates();
  switchSection(activeSection);

  // Inyectar estilos responsivos globales para el panel admin
  if (!document.getElementById("admin-global-responsive-styles")) {
    const style = document.createElement("style");
    style.id = "admin-global-responsive-styles";
    style.textContent = `
      #adminSidebar {
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch;
        max-height: 100vh !important;
      }
      #adminSidebar::-webkit-scrollbar { width: 4px; }
      #adminSidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      
      .admin-section {
        max-width: 100vw !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (window.__adminListenersBound) {
    loadDashboard();
    return;
  }

  window.__adminListenersBound = true;

  if (!selectedValidationStage) {
    selectedValidationStage = getCurrentStageNumber();
  }

  // Filtros opcionales (existen solo si el HTML los incluye)
  bindEl("searchInput", "input", applyFiltersAndRender);
  bindEl("categoryFilter", "change", applyFiltersAndRender);
  bindEl("stageFilter", "change", applyFiltersAndRender);
  bindEl("paymentFilter", "change", applyFiltersAndRender);

  // ── Listeners seguros (bindEl no crashea si el elemento no existe) ──
  bindEl("refreshBtn", "click", loadDashboard);
  bindEl("exportBtn", "click", exportToCsv);
  bindEl("markArrivalBtn", "click", handleManualArrival);
  bindEl("startScanBtn", "click", startScanner);
  bindEl("stopScanBtn", "click", () => {
    stopScanner();
    setScanStatus("Escáner detenido.", "info");
  });
  bindEl("scannerCancelBtn", "click", () => {
    stopScanner();
    setScanStatus("Escaner cancelado.", "info");
  });
  bindEl("markAllRobotsBtn", "click", () => setAllRobotCheckboxes(true));
  bindEl("clearAllRobotsBtn", "click", () => setAllRobotCheckboxes(false));
  bindEl("saveRobotCheckinBtn", "click", saveRobotCheckin);
  bindEl("confirmCheckinBtn", "click", saveRobotCheckin);
  bindEl("openReceiptFromCheckinBtn", "click", openReceiptFromCheckin);
  bindEl("openValidationFromCheckinBtn", "click", openValidationFromCheckin);
  bindEl("checkinOverlayToast", "click", () =>
    document.getElementById("checkinOverlayToast")?.classList.remove("show"),
  );
  bindEl("historySearchInput", "input", applyHistoryFilters);
  bindEl("historyStatusFilter", "change", applyHistoryFilters);
  bindEl("contactToggleBtn", "click", toggleContactMenu);
  bindEl("contactWhatsappBtn", "click", openSelectedTeamWhatsapp);
  bindEl("contactEmailBtn", "click", openSelectedTeamEmail);
  bindEl("rejectReasonSelect", "change", handleRejectReasonChange);
  bindEl("approvePaymentBtn", "click", () =>
    handleReviewActionButton("approve"),
  );
  bindEl("rejectPaymentBtn", "click", () => handleReviewActionButton("reject"));
  bindEl("toggleArrivalBtn", "click", handleToggleArrivalFromModal);
  bindEl("exportReadyBtn", "click", exportReadyForRounds);
  bindEl("changePasswordForm", "submit", handleChangePassword);
  bindEl("refreshSecurityBtn", "click", loadSecurityActivity);
  bindEl("securitySearchInput", "input", () => {
    if (window.renderSecurityActivityTable)
      window.renderSecurityActivityTable();
  });
  bindEl("securitySourceFilter", "change", () => {
    if (window.renderSecurityActivityTable)
      window.renderSecurityActivityTable();
  });

  document.addEventListener("click", (event) => {
    const contactMenu = document.getElementById("contactMenu");
    if (!contactMenu || contactMenu.contains(event.target)) {
      return;
    }
    closeContactMenu();
  });

  if (dashboardRefreshTimer) {
    window.clearInterval(dashboardRefreshTimer);
  }
  dashboardRefreshTimer = window.setInterval(() => {
    if (!isAuthenticated) {
      return;
    }
    loadDashboard();

    // Auto-recargar panel de Congreso sin recargar la página entera
    if (
      activeSection === "congress" &&
      typeof congressModule !== "undefined" &&
      typeof congressModule.reload === "function"
    ) {
      congressModule.reload(true);
    }
  }, DASHBOARD_REFRESH_MS);

  loadDashboard();
}

function bindGlobalActionDelegates() {
  if (window.__adminGlobalDelegatesBound) {
    return;
  }
  window.__adminGlobalDelegatesBound = true;

  document.addEventListener("click", async (event) => {
    const reviewBtn = event.target.closest("[data-review-team-id]");
    if (reviewBtn) {
      const id = Number(reviewBtn.dataset.reviewTeamId || 0);
      if (id) {
        await openReviewForTeam(id);
      }
      return;
    }

    const notificationBtn = event.target.closest("[data-notification-team-id]");
    if (notificationBtn) {
      const id = Number(notificationBtn.dataset.notificationTeamId || 0);
      if (id) {
        const dropdown = document.getElementById("notificationsDropdown");
        const toggle = document.getElementById("notificationsToggleBtn");
        if (dropdown) {
          dropdown.classList.remove("show");
        }
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
        }

        seenPendingIds.add(id);
        persistSeenPendingIds();
        await openReviewForTeam(id);
      }
      return;
    }
  });
}

function loadSeenPendingIds() {
  try {
    const raw = localStorage.getItem(SEEN_PENDING_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.map((id) => Number(id)).filter((id) => id > 0));
  } catch {
    return new Set();
  }
}

function persistSeenPendingIds() {
  localStorage.setItem(
    SEEN_PENDING_STORAGE_KEY,
    JSON.stringify(Array.from(seenPendingIds)),
  );
}

function initNotifications() {
  if (window.__adminNotificationsBound) {
    return;
  }
  window.__adminNotificationsBound = true;

  seenPendingIds = loadSeenPendingIds();

  const toggleBtn = document.getElementById("notificationsToggleBtn");
  const dropdown = document.getElementById("notificationsDropdown");
  const wrapper = document.getElementById("notificationWrapper");

  if (!toggleBtn || !dropdown || !wrapper) {
    return;
  }

  toggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !dropdown.classList.contains("show");
    dropdown.classList.toggle("show", shouldOpen);
    toggleBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (wrapper.contains(event.target)) {
      return;
    }
    dropdown.classList.remove("show");
    toggleBtn.setAttribute("aria-expanded", "false");
  });
}

function initSectionNavigation() {
  if (window.__adminNavBound) {
    return;
  }
  window.__adminNavBound = true;

  const navButtons = document.querySelectorAll("[data-section-target]");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchSection(btn.dataset.sectionTarget || "checkin");
    });
  });

  const menuToggleBtn = document.getElementById("menuToggleBtn");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");

  if (menuToggleBtn) {
    menuToggleBtn.addEventListener("click", () => {
      const sidebar = document.getElementById("adminSidebar");
      if (!sidebar) return;
      const shouldOpen = !sidebar.classList.contains("open");
      if (shouldOpen) {
        openSidebar();
      } else {
        closeSidebar();
      }
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", closeSidebar);
  }

  // ── Bottom Nav Drawer ("Más") ──────────────────────────────────────────
  _initBottomNavDrawer();
}

function _initBottomNavDrawer() {
  var moreBtn = document.getElementById("bottomNavMoreBtn");
  var drawer = document.getElementById("bottomNavDrawer");
  var backdrop = document.getElementById("bottomNavDrawerBackdrop");
  if (!moreBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add("open");
    if (backdrop) backdrop.classList.add("show");
    moreBtn.setAttribute("aria-expanded", "true");
    moreBtn.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("show");
    moreBtn.setAttribute("aria-expanded", "false");
    moreBtn.classList.remove("active");
    document.body.style.overflow = "";
  }

  moreBtn.addEventListener("click", function () {
    var isOpen = drawer.classList.contains("open");
    isOpen ? closeDrawer() : openDrawer();
  });

  if (backdrop) {
    backdrop.addEventListener("click", closeDrawer);
  }

  // Swipe-down to close
  var startY = 0;
  drawer.addEventListener(
    "touchstart",
    function (e) {
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );
  drawer.addEventListener(
    "touchend",
    function (e) {
      var dy = e.changedTouches[0].clientY - startY;
      if (dy > 60) closeDrawer();
    },
    { passive: true },
  );

  // Wire drawer buttons to switchSection
  drawer.querySelectorAll("[data-section-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.dataset.sectionTarget;
      closeDrawer();
      setTimeout(function () {
        switchSection(target);
      }, 60);
    });
  });

  // Keep drawer section buttons in sync with active section
  var origSwitch = window._origSwitchSection || switchSection;
  window._drawerSyncSwitchSection = function (sectionName) {
    origSwitch(sectionName);
    // Sync bnd-btn active states
    if (drawer) {
      drawer.querySelectorAll(".bnd-btn").forEach(function (b) {
        b.classList.toggle("active", b.dataset.sectionTarget === sectionName);
      });
    }
  };
}

function openSidebar() {
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) {
    sidebar.classList.add("open");
  }
  if (backdrop) {
    backdrop.classList.add("show");
  }
}

function closeSidebar() {
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) {
    sidebar.classList.remove("open");
  }
  if (backdrop) {
    backdrop.classList.remove("show");
  }
}

function getFocusSectionFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    return focus ? focus.trim() : "";
  } catch {
    return "";
  }
}

function getReturnUrlFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("returnUrl") || "";
  } catch {
    return "";
  }
}

function returnToEditor() {
  const returnUrl = getReturnUrlFromQuery();
  window.location.href = returnUrl || "admin-editor.html";
}

function _toTitleCase(text) {
  return String(text || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCustomModuleMeta(sectionName) {
  const fallbackLabel = _toTitleCase(
    sectionName.replace(/^custom-/, "") || "Módulo personalizado",
  );
  const label = fallbackLabel || "Módulo personalizado";

  const convs = window.settingsModule?.data?.convocatorias || [];
  for (const conv of convs) {
    try {
      const parsed = JSON.parse(conv.included_modules || "{}");
      const customItems = Array.isArray(parsed.custom) ? parsed.custom : [];
      for (const item of customItems) {
        const itemKey = String(item?.key || item?.name || item || "").trim();
        const itemSection = itemKey ? `custom-${itemKey}` : "";
        if (itemSection === sectionName) {
          return {
            label: String(item?.label || item?.name || label),
            icon: item?.icon || "fas fa-star",
          };
        }
      }
    } catch {
      /* ignore malformed payloads */
    }
  }

  return { label, icon: "fas fa-star" };
}

function ensureCustomModuleSection(sectionName) {
  if (!sectionName || !sectionName.startsWith("custom-")) return null;

  const fullId = `section-${sectionName}`;
  let existing = document.getElementById(fullId);
  if (existing) return existing;

  const meta = getCustomModuleMeta(sectionName);
  const sec = document.createElement("section");
  sec.id = fullId;
  sec.className = "admin-section";
  sec.innerHTML = `
    <div class="section-page-header">
      <div class="section-page-header-text">
        <h2><i class="${meta.icon}"></i> ${meta.label}</h2>
        <p>
          Módulo personalizado de convocatoria. Aquí puedes administrar su configuración general desde el panel.
        </p>
      </div>
    </div>
    <div class="content-card" style="padding:24px">
      <p style="color:var(--text-mute);font-size:14px;line-height:1.6">
        <i class="fas fa-info-circle" style="color:var(--accent)"></i>
        Este módulo todavía no tiene una pantalla especializada propia. Si más adelante decides convertirlo en una sección nativa, puedes abrirlo desde la convocatoria y migrarlo a Talleres o Conferencias.
      </p>
    </div>`;

  const main = document.querySelector(".admin-main");
  if (main) main.appendChild(sec);
  existing = document.getElementById(fullId);
  return existing;
}

function switchSection(sectionName) {
  activeSection = sectionName || "checkin";

  document.querySelectorAll(".admin-section").forEach((section) => {
    section.classList.remove("active");
  });

  let target = document.getElementById(`section-${activeSection}`);
  if (!target && activeSection.startsWith("custom-")) {
    target = ensureCustomModuleSection(activeSection);
  }
  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll("[data-section-target]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sectionTarget === activeSection);
  });

  closeSidebar();

  // Cargar módulos nuevos cuando se navega a ellos
  if (activeSection === "congress") {
    if (
      typeof congressModule !== "undefined" &&
      congressModule._getRequests().length === 0
    ) {
      congressModule.reload();
    }
  }
  if (activeSection === "conferences") {
    if (typeof conferencesModule !== "undefined") conferencesModule.render();
  }
  if (activeSection === "users") {
    if (typeof usersModule !== "undefined") usersModule.load();
  }
  if (activeSection === "settings") {
    if (typeof settingsModule !== "undefined") settingsModule.init();
  }
}

async function loadDashboard() {
  try {
    const result = await apiJson("admin-dashboard.php", { method: "GET" });
    allTeams = result.data.teams || [];
    categoryStats = result.data.category_stats || [];

    updateStats(allTeams);
    renderRegistrationOverview(allTeams);
    renderOpsPanels(allTeams);
    renderNotifications(allTeams);
    renderTableAll(allTeams);
    renderHistoryPanel(allTeams);
    loadSecurityActivity();

    // Actualizar charts de estadísticas si la sección está activa
    if (activeSection === "stats") {
      renderSchoolBarChart(allTeams);
      renderCongressPackageChart();
      updateCongressStatsKpis();
    }
  } catch (error) {
    setScanStatus(`Error cargando dashboard: ${error.message}`, "error");
  }
}

window.globalNotifState = { robotics: [], congress: [] };

function renderNotifications(teams) {
  window.globalNotifState.robotics = sortTeamsByStageThenDate(
    teams.filter((team) => team.payment_status === "pending"),
    "upload_date",
    "asc",
  );
  updateGlobalNotifications();
}

function updateGlobalNotifications() {
  const countEl = document.getElementById("notificationsCount");
  const newCountEl = document.getElementById("notificationsNewCount");
  const listEl = document.getElementById("notificationsList");
  const toggleBtn = document.getElementById("notificationsToggleBtn");

  if (!countEl || !newCountEl || !listEl || !toggleBtn) {
    return;
  }

  const pendingRobotics = window.globalNotifState.robotics || [];
  const pendingCongress = window.globalNotifState.congress || [];

  const pendingIds = new Set(pendingRobotics.map((team) => Number(team.id)));
  seenPendingIds.forEach((id) => {
    if (!pendingIds.has(id)) {
      seenPendingIds.delete(id);
    }
  });
  persistSeenPendingIds();

  const newRobotics = pendingRobotics.filter(
    (team) => !seenPendingIds.has(Number(team.id)),
  );
  const newCongress = pendingCongress.filter((r) => r.status === "pending");

  const total = pendingRobotics.length + pendingCongress.length;
  const totalNew = newRobotics.length + newCongress.length;

  if (totalNew > lastNewPendingCount) {
    pulseNotificationBell();
    playUiTone("info");
  }
  lastNewPendingCount = totalNew;

  countEl.textContent = total > 99 ? "99+" : String(total);
  countEl.style.display = total > 0 ? "inline-flex" : "none";
  newCountEl.textContent = `${totalNew} nuevas`;
  toggleBtn.classList.toggle("has-new", totalNew > 0);

  if (total === 0) {
    listEl.innerHTML =
      '<li class="notification-empty">No hay solicitudes pendientes.</li>';
    return;
  }

  let html = "";

  if (pendingCongress.length > 0) {
    html +=
      '<li class="notif-section-title" style="padding: 8px 14px; background: var(--bg-surface); font-size: 0.75rem; font-weight: bold; color: var(--text-mute);">CONGRESO (' +
      pendingCongress.length +
      ")</li>";
    html += pendingCongress
      .slice(0, 5)
      .map((r) => {
        const isPending = r.status === "pending";
        const iconCls = isPending ? "fas fa-clock" : "fas fa-hourglass-half";
        const label = isPending
          ? "Listo para revisar"
          : "Esperando comprobante";
        const badge = isPending
          ? '<span class="badge-status badge-pending">Nueva</span>'
          : '<span class="badge-status badge-pending" style="background:#fff7ed;color:#9a3412">Comprobante</span>';
        return `
        <li>
          <button class="notification-item ${isPending ? "is-new" : ""}" type="button" onclick="if(window.congressModule) { window.congressModule._goToRequest(${r.request_id}); }">
            <div class="notification-item-head">
              <strong>${r.full_name || "-"}</strong>
              ${badge}
            </div>
            <div class="notification-item-meta"><i class="${iconCls}"></i> ${label}</div>
          </button>
        </li>
      `;
      })
      .join("");
  }

  if (pendingRobotics.length > 0) {
    html +=
      '<li class="notif-section-title" style="padding: 8px 14px; background: var(--bg-surface); font-size: 0.75rem; font-weight: bold; color: var(--text-mute);">ROBÓTICA (' +
      pendingRobotics.length +
      ")</li>";
    html += pendingRobotics
      .slice(0, 5)
      .map((team) => {
        const isNew = !seenPendingIds.has(Number(team.id));
        return `
        <li>
          <button class="notification-item ${isNew ? "is-new" : ""}" data-notification-team-id="${team.id}" type="button">
            <div class="notification-item-head">
              <strong>${team.folio}</strong>
              ${isNew ? '<span class="badge-status badge-pending">Nueva</span>' : '<span class="badge-status badge-pending">Pendiente</span>'}
            </div>
          </button>
        </li>
      `;
      })
      .join("");
  }

  if (total > 10) {
    html += `<li class="notification-more">+${total - 10} más en los paneles</li>`;
  }

  listEl.innerHTML = html;

  listEl.querySelectorAll("[data-notification-team-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const teamId = Number(btn.dataset.notificationTeamId || 0);
      if (!teamId) {
        return;
      }
      seenPendingIds.add(teamId);
      persistSeenPendingIds();
      renderNotifications(allTeams);

      const dropdown = document.getElementById("notificationsDropdown");
      const toggle = document.getElementById("notificationsToggleBtn");
      if (dropdown) {
        dropdown.classList.remove("show");
      }
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
      }

      await openReviewForTeam(teamId);
    });
  });
}

function renderHistoryPanel(teams) {
  const container = document.getElementById("historyTeamsList");
  if (!container) {
    return;
  }

  if (!teams.length) {
    container.innerHTML = '<p class="quick-empty">Sin equipos registrados.</p>';
    return;
  }

  const orderedTeams = sortTeamsByStageThenDate(teams, "created_at", "asc");

  container.innerHTML = orderedTeams
    .map((team) => {
      const arrival = getArrivalSummary(team);
      const robots = (team.robots || [])
        .map((robot) => robot.robot_name)
        .join(", ");
      const stage = getStageDefinition(team.registration_stage);
      return `
        <article class="history-item" data-history-arrival="${arrival.status}" data-history-search="${String(
          `${team.folio} ${team.captain_name || ""} ${team.school_name || ""} ${robots}`,
        ).toLowerCase()}">
          <div class="history-item-head">
            <strong>${team.folio}</strong>
            <span class="stage-chip ${getStageState(team.registration_stage)}">${stage.shortLabel}</span>
            <span class="attendance-chip ${arrival.status}">${arrival.label}</span>
          </div>
          <div class="history-item-grid">
            <span><strong>Capitan:</strong> ${team.captain_name || "-"}</span>
            <span><strong>Escuela:</strong> ${team.school_name || "-"}</span>
            <span><strong>Detalle:</strong> ${arrival.detail}</span>
            <span><strong>Check-in:</strong> ${team.checkin_at ? formatDateTime(team.checkin_at) : "-"}</span>
            <span><strong>Pago:</strong> ${mapPaymentBadge(team.payment_status).text}</span>
            <span><strong>Robots:</strong> ${(team.robots || []).length}</span>
          </div>
        </article>
      `;
    })
    .join("");

  applyHistoryFilters();
}

function renderConfirmedTeamsByStage(teams) {
  // confirmedPanel lee window.allTeams directamente (ya sincronizado).
  // El argumento 'teams' se pasa igualmente como respaldo por si
  // window.allTeams aún no está asignado en el momento de la llamada.
  if (Array.isArray(teams) && teams.length > 0) {
    window.allTeams = teams;
  }

  if (
    typeof confirmedPanel !== "undefined" &&
    typeof confirmedPanel.render === "function"
  ) {
    confirmedPanel.render();
  }

  // Compatibilidad: inyectar equipos aprobados vía Congreso+Robótica
  if (
    typeof congressModule !== "undefined" &&
    typeof congressModule._updateConfirmedFromCongress === "function"
  ) {
    congressModule._updateConfirmedFromCongress();
  }
}

function renderRejectedRequests(teams) {
  const container = document.getElementById("rejectedRequestsList");
  if (!container) {
    return;
  }

  const rejectedTeams = sortTeamsByStageThenDate(
    teams.filter((team) => team.payment_status === "rejected"),
    "upload_date",
    "asc",
  );

  if (!rejectedTeams.length) {
    container.innerHTML =
      '<p class="quick-empty">No hay solicitudes rechazadas por ahora.</p>';
    return;
  }

  container.innerHTML = rejectedTeams
    .map((team) => {
      const stage = getStageDefinition(team.registration_stage);
      return `
        <article class="rejected-request-card">
          <div class="review-queue-top">
            <strong>${team.folio}</strong>
            <span class="stage-chip ${getStageState(team.registration_stage)}">${stage.shortLabel}</span>
          </div>
          <div class="quick-meta">${team.captain_name || "-"} · ${team.school_name || "-"}</div>
          <div class="rejected-request-meta">
            <span><strong>Motivo:</strong> ${escapeHtml(team.review_notes || "Sin motivo registrado")}</span>
            <span><strong>Robots:</strong> ${(team.robots || []).length}</span>
            <span><strong>Subido:</strong> ${team.upload_date ? formatDateTime(team.upload_date) : "-"}</span>
          </div>
          <div class="review-queue-actions">
            <button class="btn btn-small btn-secondary" type="button" data-rejected-team-open="${team.id}">
              <i class="fas fa-pen-to-square"></i> Revisar otra vez
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-rejected-team-open]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const teamId = Number(btn.dataset.rejectedTeamOpen || 0);
      if (!teamId) {
        return;
      }
      switchSection("registrations");
      showDetails(teamId);
    });
  });
}

function applyHistoryFilters() {
  const statusFilter = document.getElementById("historyStatusFilter");
  const searchInput = document.getElementById("historySearchInput");
  const container = document.getElementById("historyTeamsList");

  if (!statusFilter || !searchInput || !container) {
    return;
  }

  const statusValue = statusFilter.value || "all";
  const searchValue = String(searchInput.value || "")
    .trim()
    .toLowerCase();

  container.querySelectorAll(".history-item").forEach((item) => {
    const itemStatus = item.dataset.historyArrival || "missing";
    const itemSearch = item.dataset.historySearch || "";

    const matchStatus = statusValue === "all" || itemStatus === statusValue;
    const matchSearch = !searchValue || itemSearch.includes(searchValue);

    item.style.display = matchStatus && matchSearch ? "block" : "none";
  });
}

function updateStats(teams) {
  const totalTeams = teams.length;
  const paidTeams = teams.filter(
    (item) => item.payment_status === "verified",
  ).length;
  const totalSchools = new Set(teams.map((item) => item.school_name)).size;

  const pendingRevenue = teams
    .filter((item) => item.payment_status === "pending")
    .reduce((acc, item) => acc + safeNumber(item.total_amount, 0), 0);

  const confirmedRevenue = teams
    .filter((item) => item.payment_status === "verified")
    .reduce((acc, item) => acc + safeNumber(item.total_amount, 0), 0);

  const totalRevenue = pendingRevenue + confirmedRevenue;

  const confirmedRobots = teams
    .filter((item) => item.payment_status === "verified")
    .reduce((acc, item) => {
      const approved = safeNumber(item.approved_robots_count, 0);
      if (approved > 0) {
        return acc + approved;
      }
      return acc + safeNumber(item.number_of_robots, item.robots?.length || 0);
    }, 0);

  const pendingRobots = teams
    .filter((item) => item.payment_status === "pending")
    .reduce(
      (acc, item) =>
        acc + safeNumber(item.number_of_robots, item.robots?.length || 0),
      0,
    );

  const totalTeamsEl = document.getElementById("totalTeams");
  if (totalTeamsEl) {
    totalTeamsEl.textContent = String(totalTeams);
  }

  const paidTeamsEl = document.getElementById("paidTeams");
  if (paidTeamsEl) {
    paidTeamsEl.textContent = String(paidTeams);
  }

  const confirmedRobotsEl = document.getElementById("confirmedRobots");
  if (confirmedRobotsEl) {
    confirmedRobotsEl.textContent = String(confirmedRobots);
  }

  const pendingRobotsEl = document.getElementById("pendingRobots");
  if (pendingRobotsEl) {
    pendingRobotsEl.textContent = String(pendingRobots);
  }

  const totalSchoolsEl = document.getElementById("totalSchools");
  if (totalSchoolsEl) {
    totalSchoolsEl.textContent = String(totalSchools);
  }

  const pendingRevenueEl = document.getElementById("pendingRevenue");
  if (pendingRevenueEl) {
    pendingRevenueEl.textContent = formatMoney(pendingRevenue);
  }

  const confirmedRevenueEl = document.getElementById("confirmedRevenue");
  if (confirmedRevenueEl) {
    confirmedRevenueEl.textContent = formatMoney(confirmedRevenue);
  }

  const revenueEl = document.getElementById("totalRevenue");
  if (revenueEl) {
    revenueEl.textContent = formatMoney(totalRevenue);
  }
}

function renderOpsPanels(teams) {
  renderRoundsReady(teams);
  renderRecentCheckins(teams);
}

function renderRegistrationOverview(teams) {
  renderConfirmedTeamsByStage(teams);
  renderRejectedRequests(teams);
}

async function openReviewForTeam(teamId) {
  if (!teamId) {
    return;
  }

  let targetTeam = allTeams.find((team) => Number(team.id) === Number(teamId));
  if (!targetTeam) {
    try {
      await loadDashboard();
      targetTeam = allTeams.find((team) => Number(team.id) === Number(teamId));
    } catch {
      // Si falla recarga, dejamos que showDetails maneje estado.
    }
  }

  if (!targetTeam) {
    setScanStatus(
      "No se encontro la solicitud seleccionada en tiempo real.",
      "error",
    );
    return;
  }

  switchSection("registrations");
  selectedValidationStage =
    Number(targetTeam.registration_stage || 0) || selectedValidationStage;
  showDetails(targetTeam.id);
  const modal = document.getElementById("detailsModal");
  if (modal && !modal.classList.contains("show")) {
    modal.classList.add("show");
  }

  const card = document.getElementById(`review-card-team-${targetTeam.id}`);
  if (!card) {
    setScanStatus(`Abriendo solicitud ${targetTeam.folio}...`, "info");
    return;
  }
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("review-card-focus");
  window.setTimeout(() => {
    card.classList.remove("review-card-focus");
  }, 1600);
}

function renderRoundsReady(teams) {
  const list = document.getElementById("roundsReadyList");
  const board = document.getElementById("competitionMatchupsBoard");
  if (!list || !board) {
    return;
  }

  const roles = buildCompetitionRolesData(teams);

  if (!roles.length) {
    list.innerHTML =
      '<li class="quick-empty">Aun no hay categorias listas para rounds.</li>';
    board.innerHTML =
      '<p class="quick-empty">Selecciona una categoria para ver su lista de robots listos.</p>';
    return;
  }

  if (
    !selectedCompetitionCategory ||
    !roles.some((entry) => entry.category === selectedCompetitionCategory)
  ) {
    selectedCompetitionCategory = roles[0].category;
  }

  list.innerHTML = roles
    .map((entry) => {
      const isActive = entry.category === selectedCompetitionCategory;
      return `
      <li>
        <button class="competition-category-chip ${isActive ? "active" : ""}" type="button" data-competition-category="${entry.category}">
          <div>
            <strong>${getCategoryLabel(entry.category)}</strong>
            <div class="quick-meta">${entry.robots} robots · ${entry.teams} equipos</div>
          </div>
          <span class="badge-status badge-verified">${entry.items.length} listos</span>
        </button>
      </li>
    `;
    })
    .join("");

  const selectedEntry = roles.find(
    (entry) => entry.category === selectedCompetitionCategory,
  );

  board.innerHTML = selectedEntry
    ? `
      <article class="competition-category-card">
        <div class="competition-category-head">
          <div>
            <h4>${getCategoryLabel(selectedEntry.category)}</h4>
            <p>Robots llegados y listos para competir</p>
          </div>
          <span>${selectedEntry.robots} robots · ${selectedEntry.teams} equipos</span>
        </div>
        <ul class="competition-roster-list">
          ${selectedEntry.items
            .map(
              (item) => `
                <li class="competition-roster-item">
                  <div class="competition-roster-main">
                    <strong>${escapeHtml(item.robot)}</strong>
                    <span>${escapeHtml(item.captain)}</span>
                  </div>
                  <div class="competition-roster-meta">
                    <span><strong>Equipo:</strong> ${escapeHtml(item.folio)}</span>
                    <span><strong>Escuela:</strong> ${escapeHtml(item.school)}</span>
                    <span><strong>Integrantes:</strong> ${item.members.length ? escapeHtml(item.members.join(", ")) : "Sin integrantes adicionales"}</span>
                  </div>
                </li>
              `,
            )
            .join("")}
        </ul>
      </article>
    `
    : '<p class="quick-empty">Selecciona una categoria para ver su lista de robots listos.</p>';

  list.querySelectorAll("[data-competition-category]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoryCode = String(btn.dataset.competitionCategory || "");
      if (!categoryCode) {
        return;
      }
      selectedCompetitionCategory = categoryCode;
      renderRoundsReady(teams);
    });
  });
}

function buildCompetitionRolesData(teams) {
  const participantsByCategory = {};

  teams
    .filter((team) => team.payment_status === "verified")
    .forEach((team) => {
      const memberNames = (team.members || [])
        .filter((member) => !member.is_captain)
        .map((member) => member.member_name || "Sin nombre");

      (team.robots || []).forEach((robot) => {
        const isArrived =
          robot.arrived == 1 ||
          robot.arrived === true ||
          robot.arrived === "1" ||
          String(robot.arrived).toLowerCase() === "true";
        if (!isArrived) {
          return;
        }

        const categoryCode = String(robot.category || "sin-categoria");
        if (!participantsByCategory[categoryCode]) {
          participantsByCategory[categoryCode] = [];
        }

        participantsByCategory[categoryCode].push({
          robot: robot.robot_name || "Robot sin nombre",
          captain: team.captain_name || "Capitan sin nombre",
          members: memberNames,
          folio: team.folio || "Sin folio",
          school: team.school_name || "Sin escuela",
        });
      });
    });

  return Object.keys(participantsByCategory)
    .sort((a, b) =>
      getCategoryLabel(a).localeCompare(getCategoryLabel(b), "es"),
    )
    .map((categoryCode) => {
      const participants = participantsByCategory[categoryCode]
        .slice()
        .sort((a, b) => a.robot.localeCompare(b.robot, "es"));

      const teamSet = new Set(
        participantsByCategory[categoryCode].map((item) => item.folio),
      );

      return {
        category: categoryCode,
        robots: participants.length,
        teams: teamSet.size,
        items: participants,
      };
    })
    .filter((entry) => entry.robots > 0);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRecentCheckins(teams) {
  const list = document.getElementById("recentCheckinsList");
  if (!list) {
    return;
  }

  const checkins = [...teams]
    .filter((team) => team.arrived && team.checkin_at)
    .sort((a, b) => new Date(b.checkin_at) - new Date(a.checkin_at))
    .slice(0, 8);

  if (!checkins.length) {
    list.innerHTML =
      '<li class="quick-empty">Todavía no se registran llegadas por QR.</li>';
    return;
  }

  list.innerHTML = checkins
    .map(
      (team) => `
      <li>
        <div>
          <strong>${team.folio}</strong>
          <div class="quick-meta">${team.captain_name} · ${formatDateTime(team.checkin_at)} · ${getArrivalSummary(team).detail}</div>
        </div>
        <span class="attendance-chip ${getArrivalSummary(team).status}">${getArrivalSummary(team).label}</span>
      </li>
    `,
    )
    .join("");
}

function showRobotCheckinCard(team) {
  selectedCheckinTeam = team;

  const card = document.getElementById("robotCheckinCard");
  const meta = document.getElementById("robotCheckinTeamMeta");
  const list = document.getElementById("robotCheckinList");
  const notes = document.getElementById("robotCheckinNotes");
  const validatorCaptain = document.getElementById("validatorCaptain");
  const validatorPhone = document.getElementById("validatorPhone");
  const validatorSchool = document.getElementById("validatorSchool");
  const validatorPaymentStatus = document.getElementById(
    "validatorPaymentStatus",
  );
  const validatorReviewNotes = document.getElementById("validatorReviewNotes");
  const validatorApprovedRobots = document.getElementById(
    "validatorApprovedRobots",
  );
  const validatorMembersList = document.getElementById("validatorMembersList");
  const validatorRobotsList = document.getElementById("validatorRobotsList");
  const openValidationBtn = document.getElementById(
    "openValidationFromCheckinBtn",
  );

  if (
    !card ||
    !meta ||
    !list ||
    !notes ||
    !validatorCaptain ||
    !validatorPhone ||
    !validatorSchool ||
    !validatorPaymentStatus ||
    !validatorReviewNotes ||
    !validatorApprovedRobots ||
    !validatorMembersList ||
    !validatorRobotsList
  ) {
    return;
  }

  const robots = team.robots || [];
  const summary = getArrivalSummary(team);

  meta.textContent = `${team.folio} · ${team.captain_name || "Sin capitan"} · ${summary.detail}`;
  notes.value = team.checkin_notes || "";
  validatorCaptain.textContent = team.captain_name || "-";
  validatorPhone.textContent = team.captain_phone || "-";
  validatorSchool.textContent = team.school_name || "-";

  const paymentBadge = mapPaymentBadge(team.payment_status);
  validatorPaymentStatus.textContent = paymentBadge.text;
  validatorReviewNotes.textContent = String(team.review_notes || "Sin notas");
  const authorized = safeNumber(team.approved_robots_count, 0);
  validatorApprovedRobots.textContent =
    authorized > 0
      ? `${authorized} autorizados`
      : `${(team.robots || []).length} (sin limite configurado)`;

  if (openValidationBtn) {
    if (team.payment_status !== "verified") {
      openValidationBtn.innerHTML =
        '<i class="fas fa-clipboard-check"></i> Inscribir y validar ahora';
      openValidationBtn.classList.remove("btn-secondary");
      openValidationBtn.classList.add("btn-danger");
    } else {
      openValidationBtn.innerHTML =
        '<i class="fas fa-clipboard-check"></i> Ver validacion';
      openValidationBtn.classList.remove("btn-danger");
      openValidationBtn.classList.add("btn-secondary");
    }
  }

  const members = team.members || [];
  validatorMembersList.innerHTML = members.length
    ? members
        .map(
          (member) =>
            `<li>${member.is_captain ? "Capitan" : "Integrante"}: ${member.member_name || "Sin nombre"}</li>`,
        )
        .join("")
    : '<li class="quick-empty">Sin integrantes adicionales</li>';

  validatorRobotsList.innerHTML = robots.length
    ? robots
        .map(
          (robot) =>
            `<li>${robot.robot_name || "Robot"} · ${getCategoryLabel(robot.category)}</li>`,
        )
        .join("")
    : '<li class="quick-empty">Sin robots registrados</li>';

  if (!robots.length) {
    list.innerHTML =
      '<p class="quick-empty">Este equipo no tiene robots registrados.</p>';
  } else {
    list.innerHTML = robots
      .map((robot) => {
        const isArrived =
          robot.arrived == 1 ||
          robot.arrived === true ||
          robot.arrived === "1" ||
          String(robot.arrived).toLowerCase() === "true";
        const checked = isArrived ? "checked" : "";
        return `
          <label class="robot-checkin-item" data-robot-category="${robot.category || ""}">
            <input type="checkbox" class="robot-checkin-toggle" data-robot-id="${robot.id}" data-robot-category="${robot.category || ""}" ${checked} />
            <div>
              <span class="robot-name">${robot.robot_name || "Robot"}</span>
              <span class="robot-category">${getCategoryLabel(robot.category)}</span>
            </div>
          </label>
        `;
      })
      .join("");
  }

  card.style.display = "block";
}

function openValidationFromCheckin() {
  if (!selectedCheckinTeam) {
    setScanStatus("Primero carga un equipo en check-in.", "error");
    return;
  }

  switchSection("registrations");
  showDetails(selectedCheckinTeam.id);
}

function openReceiptFromCheckin() {
  if (!selectedCheckinTeam) {
    setScanStatus("Primero carga un equipo en check-in.", "error");
    return;
  }

  openReceipt(selectedCheckinTeam.id);
}

function toggleContactMenu(event) {
  if (event) {
    event.stopPropagation();
  }
  const menu = document.getElementById("contactOptions");
  if (!menu) {
    return;
  }
  menu.classList.toggle("show");
}

function closeContactMenu() {
  const menu = document.getElementById("contactOptions");
  if (menu) {
    menu.classList.remove("show");
  }
}

function setAllRobotCheckboxes(checked) {
  const checkboxes = document.querySelectorAll(".robot-checkin-toggle");
  checkboxes.forEach((input) => {
    input.checked = checked;
  });
}

function getSelectedRobotStatuses() {
  if (!selectedCheckinTeam) {
    return [];
  }

  const robotIndex = new Map(
    (selectedCheckinTeam.robots || []).map((robot) => [
      Number(robot.id),
      robot,
    ]),
  );

  return Array.from(document.querySelectorAll(".robot-checkin-toggle"))
    .map((input) => {
      const robotId = Number(input.dataset.robotId || 0);
      const robot = robotIndex.get(robotId);
      if (!robotId || !robot) {
        return null;
      }

      return {
        robot_id: robotId,
        arrived: input.checked,
        robot_name: robot.robot_name || null,
        category: robot.category || null,
      };
    })
    .filter(Boolean);
}

async function saveRobotCheckin() {
  if (!selectedCheckinTeam) {
    setScanStatus("Primero escanea QR o captura folio.", "error");
    return;
  }

  if (selectedCheckinTeam.payment_status !== "verified") {
    setScanStatus(
      "Este equipo aun no tiene inscripcion aprobada. Valida el pago antes de registrar llegada.",
      "error",
    );
    openValidationFromCheckin();
    return;
  }

  const robotStatuses = getSelectedRobotStatuses();
  const arrivedCount = robotStatuses.filter((item) => item.arrived).length;
  const approvedCount = safeNumber(
    selectedCheckinTeam.approved_robots_count,
    0,
  );
  const notes = String(
    document.getElementById("robotCheckinNotes").value || "",
  ).trim();

  if (!robotStatuses.length) {
    setScanStatus("Este equipo no tiene robots registrados.", "error");
    return;
  }

  if (arrivedCount <= 0) {
    setScanStatus(
      "Marca al menos un robot verificado para confirmar registro.",
      "error",
    );
    return;
  }

  const previousArrivalByRobot = new Map(
    (selectedCheckinTeam.robots || []).map((robot) => {
      const isArrived =
        robot.arrived == 1 ||
        robot.arrived === true ||
        robot.arrived === "1" ||
        String(robot.arrived).toLowerCase() === "true";
      return [Number(robot.id), isArrived];
    }),
  );

  const mergedRobotStatuses = robotStatuses.map((item) => ({
    ...item,
    arrived: Boolean(item.arrived || previousArrivalByRobot.get(item.robot_id)),
  }));

  const mergedArrivedCount = mergedRobotStatuses.filter(
    (item) => item.arrived,
  ).length;

  const arrivedByCategory = {};
  mergedRobotStatuses.forEach((item) => {
    if (!item.arrived) {
      return;
    }
    const key = String(item.category || "sin-categoria");
    arrivedByCategory[key] = (arrivedByCategory[key] || 0) + 1;
  });

  if (approvedCount > 0 && mergedArrivedCount > approvedCount) {
    setScanStatus(
      `Advertencia: llegaron ${mergedArrivedCount} robots y solo ${approvedCount} estan autorizados para competir. Ajusta o deja nota.`,
      "error",
    );
    return;
  }

  try {
    await apiJson("admin-checkin.php", {
      method: "POST",
      body: JSON.stringify({
        team_id: selectedCheckinTeam.id,
        arrived: arrivedCount > 0,
        checked_by:
          (currentUser && (currentUser.username || currentUser.full_name)) ||
          "ADMIN",
        notes: notes || "Check-in por equipo (detalle por robot)",
        robot_statuses: mergedRobotStatuses.length ? mergedRobotStatuses : null,
      }),
    });

    await loadDashboard();

    const categorySummary = Object.entries(arrivedByCategory)
      .map(([category, count]) => `${getCategoryLabel(category)}: ${count}`)
      .join(" | ");
    const missingCategoryLabels = Array.from(
      new Set(
        mergedRobotStatuses
          .filter((item) => !item.arrived)
          .map((item) => getCategoryLabel(item.category || "sin-categoria")),
      ),
    );
    const totalRobots = mergedRobotStatuses.length || 0;
    const completionLabel =
      mergedArrivedCount >= totalRobots ? "COMPLETO" : "PARCIAL";

    let destinationMessage = "";
    if (missingCategoryLabels.length === 1) {
      destinationMessage = ` Mandalos a la mesa de ${missingCategoryLabels[0]}.`;
    } else if (missingCategoryLabels.length === 2) {
      destinationMessage = ` Mandalos a la mesa de ${missingCategoryLabels[0]} y ${missingCategoryLabels[1]}.`;
    } else if (missingCategoryLabels.length > 2) {
      const lastCategory =
        missingCategoryLabels[missingCategoryLabels.length - 1];
      const firstCategories = missingCategoryLabels.slice(0, -1).join(", ");
      destinationMessage = ` Mandalos a la mesa de ${firstCategories} y ${lastCategory}.`;
    }

    const confirmedLabel =
      mergedArrivedCount === 1 ? "robot confirmado" : "robots confirmados";
    const successMessage = `Robots confirmados: ${mergedArrivedCount}/${totalRobots}. ${categorySummary || "Sin categorias detectadas."}${destinationMessage}`;

    setScanStatus(
      `Registro ${completionLabel}: ${mergedArrivedCount}/${totalRobots} ${confirmedLabel}. ${categorySummary || "Sin categorias detectadas."}${destinationMessage}`,
      "success",
    );
    showCheckinOverlay(successMessage, "Registro confirmado");
    playUiTone("success");
    resetCheckinForNextScan();
  } catch (error) {
    setScanStatus(`No se pudo guardar llegada: ${error.message}`, "error");
  }
}

function mapPaymentBadge(status) {
  if (status === "verified") {
    return { cls: "badge-verified", text: "Aceptado" };
  }
  if (status === "rejected") {
    return { cls: "badge-rejected", text: "Rechazado" };
  }
  return { cls: "badge-pending", text: "Pendiente" };
}

function renderTableAll(teams) {
  renderTable(sortTeamsByStageThenDate(teams, "created_at", "asc"));
}

function applyFiltersAndRender() {
  const searchValue = String(
    document.getElementById("searchInput")?.value || "",
  )
    .trim()
    .toLowerCase();
  const categoryValue = document.getElementById("categoryFilter")?.value || "";
  const stageValue = document.getElementById("stageFilter")?.value || "all";
  const paymentValue = document.getElementById("paymentFilter")?.value || "";

  let filtered = [...allTeams];

  if (searchValue) {
    filtered = filtered.filter((team) => {
      const robotsText = (team.robots || []).map((r) => r.robot_name).join(" ");
      return (
        String(team.folio || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(team.captain_name || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(team.school_name || "")
          .toLowerCase()
          .includes(searchValue) ||
        robotsText.toLowerCase().includes(searchValue)
      );
    });
  }

  if (categoryValue) {
    filtered = filtered.filter((team) =>
      (team.robots || []).some((robot) => robot.category === categoryValue),
    );
  }

  if (stageValue && stageValue !== "all") {
    filtered = filtered.filter(
      (team) => String(team.registration_stage || "") === String(stageValue),
    );
  }

  if (paymentValue) {
    filtered = filtered.filter((team) => team.payment_status === paymentValue);
  }

  renderTable(sortTeamsByStageThenDate(filtered, "created_at", "asc"));
}

function renderTable(rows) {
  const tableBody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");
  const totalRecords = document.getElementById("totalRecords");

  if (!tableBody || !emptyState || !totalRecords) {
    return;
  }

  totalRecords.textContent = String(rows.length);

  if (!rows.length) {
    tableBody.innerHTML = "";
    emptyState.classList.add("show");
    return;
  }

  emptyState.classList.remove("show");

  tableBody.innerHTML = rows
    .map((team) => {
      const payment = mapPaymentBadge(team.payment_status);
      const arrival = getArrivalSummary(team);
      const robots = team.robots || [];
      const categories = Array.from(
        new Set(robots.map((r) => getCategoryLabel(r.category))),
      );
      const robotsLabel = robots.length
        ? `${robots.length} (${robots.map((r) => r.robot_name).join(", ")})`
        : "0";
      const stage = getStageDefinition(team.registration_stage);

      return `
        <tr>
          <td data-label="Folio"><strong>${team.folio}</strong></td>
          <td data-label="Etapa"><span class="stage-chip ${getStageState(team.registration_stage)}">${stage.shortLabel}</span><div class="quick-meta">${stage.label}</div></td>
          <td data-label="Robots">${robotsLabel}</td>
          <td data-label="Categoria">${categories.join(", ") || "Sin categoría"}</td>
          <td data-label="Capitan">${team.captain_name || "-"}</td>
          <td data-label="Escuela">${team.school_name || "-"}</td>
          <td data-label="Pago"><span class="badge-status ${payment.cls}">${payment.text}</span></td>
          <td data-label="Asistencia"><span class="attendance-chip ${arrival.status}">${arrival.label}</span><div class="quick-meta">${arrival.detail}</div></td>
          <td data-label="Check-in">${team.checkin_at ? formatDateTime(team.checkin_at) : "-"}</td>
          <td data-label="Acciones" class="text-center">
            <div class="action-buttons-cell">
              <button class="btn btn-icon btn-view" data-action="details" data-team-id="${team.id}" title="Ver detalle"><i class="fas fa-eye"></i></button>
              <button class="btn btn-icon btn-download" data-action="receipt" data-team-id="${team.id}" title="Ver comprobante"><i class="fas fa-file-invoice"></i></button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tableBody.querySelectorAll("[data-action='details']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const teamId = Number(btn.dataset.teamId);
      showDetails(teamId);
    });
  });

  tableBody.querySelectorAll("[data-action='receipt']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const teamId = Number(btn.dataset.teamId);
      openReceipt(teamId);
    });
  });
}

function showDetails(teamId) {
  selectedTeam = allTeams.find((team) => Number(team.id) === Number(teamId));
  if (!selectedTeam) {
    return;
  }

  const arrival = getArrivalSummary(selectedTeam);
  const payment = mapPaymentBadge(selectedTeam.payment_status);
  const robots = selectedTeam.robots || [];
  const members = selectedTeam.members || [];
  const stage = getStageDefinition(selectedTeam.registration_stage);

  const robotsList = robots.length
    ? `<ul>${robots.map((r) => `<li>${r.robot_name} - ${getCategoryLabel(r.category)}</li>`).join("")}</ul>`
    : "<p>Sin robots registrados.</p>";

  const membersList = members.length
    ? `<ul>${members.map((m) => `<li>${m.is_captain ? "Capitán" : "Miembro"}: ${m.member_name}</li>`).join("")}</ul>`
    : "<p>Sin integrantes adicionales.</p>";

  const modalBody = document.getElementById("modalBody");
  if (!modalBody) {
    return;
  }

  modalBody.innerHTML = `
    <div class="modal-detail-row"><span class="modal-detail-label">Folio</span><span class="modal-detail-value"><strong>${selectedTeam.folio}</strong></span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Capitán</span><span class="modal-detail-value">${selectedTeam.captain_name}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Correo</span><span class="modal-detail-value">${selectedTeam.captain_email}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Teléfono</span><span class="modal-detail-value">${selectedTeam.captain_phone}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Escuela</span><span class="modal-detail-value">${selectedTeam.school_name}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Etapa</span><span class="modal-detail-value"><span class="stage-chip ${getStageState(selectedTeam.registration_stage)}">${stage.label}</span> · ${stage.rangeText} · ${formatStagePrice(selectedTeam.registration_stage)} por robot</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Estado de pago</span><span class="modal-detail-value"><span class="badge-status ${payment.cls}">${payment.text}</span></span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Total a pagar</span><span class="modal-detail-value">${formatMoney(selectedTeam.total_amount)}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Comprobante</span><span class="modal-detail-value"><button class="btn btn-small btn-secondary" id="modalVoucherBtn" type="button"><i class="fas fa-file-invoice"></i> Ver/Descargar comprobante</button></span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Llegada</span><span class="modal-detail-value">${arrival.label} (${arrival.detail}) ${selectedTeam.checkin_at ? `· ${formatDateTime(selectedTeam.checkin_at)}` : ""}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Robots</span><span class="modal-detail-value">${robotsList}</span></div>
    <div class="modal-detail-row"><span class="modal-detail-label">Integrantes</span><span class="modal-detail-value">${membersList}</span></div>
  `;

  const decisionNotesEl = document.getElementById("decisionNotes");
  if (decisionNotesEl) {
    decisionNotesEl.value = selectedTeam.review_notes || "";
  }

  const modalVoucherBtn = document.getElementById("modalVoucherBtn");
  if (modalVoucherBtn) {
    modalVoucherBtn.addEventListener("click", () =>
      openReceipt(selectedTeam.id),
    );
  }

  resetReviewActionMode();

  const rejectReasonSelect = document.getElementById("rejectReasonSelect");
  const rejectReasonOther = document.getElementById("rejectReasonOther");
  if (rejectReasonSelect && rejectReasonOther) {
    rejectReasonSelect.value = "";
    rejectReasonOther.value = "";
    rejectReasonOther.style.display = "none";
  }

  const robotsRegistered = (selectedTeam.robots || []).length;
  const robotsPaid = safeNumber(
    selectedTeam.number_of_robots,
    robotsRegistered,
  );
  const robotsApproved = safeNumber(selectedTeam.approved_robots_count, 0);
  const approvedInput = document.getElementById("approvedRobotsInput");
  const paidInfoInput = document.getElementById("paidRobotsInfo");
  const paymentWarning = document.getElementById("paymentWarning");

  if (approvedInput) {
    const baseApproved = robotsApproved > 0 ? robotsApproved : robotsPaid;
    const defaultApproved = Math.max(
      0,
      Math.min(robotsRegistered, baseApproved || robotsRegistered),
    );
    approvedInput.max = String(robotsRegistered);
    approvedInput.value = String(defaultApproved);
    approvedInput.readOnly = true;
  }
  bindApproveModeSwitches();

  if (paidInfoInput) {
    paidInfoInput.value = `${robotsPaid} pagados / ${robotsRegistered} registrados`;
  }

  if (paymentWarning) {
    if (robotsPaid < robotsRegistered) {
      paymentWarning.textContent =
        "Pago incompleto detectado: se registraron mas robots de los pagados.";
      paymentWarning.className = "scan-status error";
    } else if (robotsApproved > 0 && robotsApproved < robotsRegistered) {
      paymentWarning.textContent = `Participacion parcial configurada: competiran ${robotsApproved} de ${robotsRegistered} robots.`;
      paymentWarning.className = "scan-status info";
    } else {
      paymentWarning.textContent = "Pago y registro de robots sin diferencia.";
      paymentWarning.className = "scan-status success";
    }
  }

  const whatsappBtn = document.getElementById("contactWhatsappBtn");
  if (whatsappBtn) {
    whatsappBtn.disabled = !normalizePhoneForWhatsapp(
      selectedTeam.captain_phone,
    );
  }

  const emailBtn = document.getElementById("contactEmailBtn");
  if (emailBtn) {
    emailBtn.disabled = !String(selectedTeam.captain_email || "").trim();
  }

  const contactToggleBtn = document.getElementById("contactToggleBtn");
  if (contactToggleBtn) {
    contactToggleBtn.disabled = Boolean(
      whatsappBtn?.disabled && emailBtn?.disabled,
    );
  }

  closeContactMenu();

  const toggleBtn = document.getElementById("toggleArrivalBtn");
  if (toggleBtn) {
    if (selectedTeam.arrived) {
      toggleBtn.innerHTML =
        '<i class="fas fa-user-xmark"></i> Quitar llegada (check-in)';
      toggleBtn.classList.remove("btn-success");
      toggleBtn.classList.add("btn-secondary");
    } else {
      toggleBtn.innerHTML =
        '<i class="fas fa-user-check"></i> Registrar llegada (check-in)';
      toggleBtn.classList.remove("btn-secondary");
      toggleBtn.classList.add("btn-success");
    }
  }

  const detailsModal = document.getElementById("detailsModal");
  if (typeof openModal === "function") {
    openModal("detailsModal");
  } else if (detailsModal) {
    detailsModal.classList.add("show");
  }
}

function openSelectedTeamWhatsapp() {
  if (!selectedTeam) {
    return;
  }

  closeContactMenu();

  const notes = String(
    document.getElementById("decisionNotes").value || "",
  ).trim();
  const message = `Hola ${selectedTeam.captain_name || "equipo"}, te contactamos de RENOVATEC sobre tu registro ${selectedTeam.folio}. ${notes || "Comparte evidencia de pago si hubo correcciones pendientes."}`;
  const url = buildWhatsappLink(selectedTeam.captain_phone, message);

  if (!url) {
    setScanStatus("No hay telefono valido para WhatsApp.", "error");
    return;
  }

  window.open(url, "_blank");
}

function openSelectedTeamEmail() {
  if (!selectedTeam) {
    return;
  }

  closeContactMenu();

  const email = String(selectedTeam.captain_email || "").trim();
  if (!email) {
    setScanStatus("No hay correo del capitan para contacto.", "error");
    return;
  }

  const notes = String(
    document.getElementById("decisionNotes")?.value || "",
  ).trim();
  const subject = `RENOVATEC - Seguimiento de registro ${selectedTeam.folio}`;
  const body = `Hola ${selectedTeam.captain_name || "equipo"},\n\nTe contactamos de RENOVATEC sobre tu registro ${selectedTeam.folio}.\n${notes || "Comparte por favor la informacion faltante para completar validacion."}\n\nSaludos.`;

  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

function openReceipt(teamId) {
  window.open(getApiUrl(`get-receipt.php?team_id=${teamId}`), "_blank");
}

function renderApproveRobotsChecklist() {
  const container = document.getElementById("approveRobotsChecklist");
  const approvedInput = document.getElementById("approvedRobotsInput");
  if (!container || !selectedTeam) {
    return;
  }

  const robots = selectedTeam.robots || [];
  if (!robots.length) {
    container.innerHTML =
      '<p class="quick-empty">Este equipo no tiene robots registrados.</p>';
    if (approvedInput) {
      approvedInput.value = "0";
    }
    return;
  }

  const currentApproved = safeNumber(
    approvedInput?.value,
    safeNumber(selectedTeam.approved_robots_count, robots.length) ||
      robots.length,
  );

  container.innerHTML = robots
    .map((robot, index) => {
      const checked = index < currentApproved ? "checked" : "";
      return `
        <label class="approve-robot-item">
          <input type="checkbox" class="approve-robot-toggle" data-robot-id="${robot.id}" ${checked} />
          <span>${robot.robot_name || "Robot"} · ${getCategoryLabel(robot.category)}</span>
        </label>
      `;
    })
    .join("");

  container.querySelectorAll(".approve-robot-toggle").forEach((input) => {
    input.addEventListener("change", syncApprovedRobotsFromChecklist);
  });

  syncApproveModeFromSelection();
  syncApprovedRobotsFromChecklist();
}

function syncApproveModeFromSelection() {
  const mode =
    document.querySelector('input[name="approveRobotMode"]:checked')?.value ||
    "all";
  const toggles = document.querySelectorAll(".approve-robot-toggle");
  if (!toggles.length) {
    return;
  }

  if (mode === "all") {
    toggles.forEach((toggle) => {
      toggle.checked = true;
      toggle.disabled = true;
    });
  } else {
    toggles.forEach((toggle) => {
      toggle.disabled = false;
    });
  }
}

function syncApprovedRobotsFromChecklist() {
  const approvedInput = document.getElementById("approvedRobotsInput");
  if (!approvedInput) {
    return;
  }
  const count = Array.from(
    document.querySelectorAll(".approve-robot-toggle"),
  ).filter((input) => input.checked).length;
  approvedInput.value = String(count);
}

function bindApproveModeSwitches() {
  document
    .querySelectorAll('input[name="approveRobotMode"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        syncApproveModeFromSelection();
        syncApprovedRobotsFromChecklist();
      });
    });
}

function handleRejectReasonChange() {
  const reasonSelect = document.getElementById("rejectReasonSelect");
  const reasonOther = document.getElementById("rejectReasonOther");
  if (!reasonSelect || !reasonOther) {
    return;
  }

  const isOther = reasonSelect.value === "Otro";
  reasonOther.style.display = isOther ? "block" : "none";
  if (!isOther) {
    reasonOther.value = "";
  }
}

function setReviewActionMode(mode) {
  reviewActionMode = mode === "reject" ? "reject" : "approve";

  const approveWrap = document.getElementById("approveFieldsWrap");
  const rejectWrap = document.getElementById("rejectFieldsWrap");
  const notesWrap = document.getElementById("decisionNotesWrap");
  const notesLabel = notesWrap?.querySelector("label");
  const notesInput = document.getElementById("decisionNotes");
  const approveBtn = document.getElementById("approvePaymentBtn");
  const rejectBtn = document.getElementById("rejectPaymentBtn");
  const hint = document.getElementById("reviewModeHint");
  const modeTitle = document.getElementById("reviewModeTitle");
  const contactMenu = document.getElementById("contactMenu");
  const toggleArrivalBtn = document.getElementById("toggleArrivalBtn");
  const modalContent = document.querySelector("#detailsModal .modal-content");

  if (approveWrap) {
    approveWrap.style.display =
      reviewActionMode === "approve" ? "block" : "none";
  }
  if (rejectWrap) {
    rejectWrap.style.display = reviewActionMode === "reject" ? "block" : "none";
  }
  if (notesWrap) {
    notesWrap.style.display = "block";
  }
  if (hint) {
    hint.style.display = "none";
  }
  if (modeTitle) {
    modeTitle.style.display = "block";
    modeTitle.textContent =
      reviewActionMode === "approve"
        ? "Modo: Aprobacion de inscripcion"
        : "Modo: Rechazo de inscripcion";
  }
  if (contactMenu) {
    contactMenu.style.display = "none";
  }
  if (toggleArrivalBtn) {
    toggleArrivalBtn.style.display = "none";
  }
  if (modalContent) {
    modalContent.classList.add("review-mode-active");
  }
  if (notesLabel) {
    notesLabel.textContent =
      reviewActionMode === "reject"
        ? "Notas y observaciones de rechazo"
        : "Notas de aprobacion";
  }
  if (notesInput) {
    notesInput.placeholder =
      reviewActionMode === "reject"
        ? "Escribe el motivo adicional del rechazo..."
        : "Escribe observaciones de aprobacion (opcional)...";
  }
  if (approveBtn) {
    approveBtn.classList.toggle("btn-primary", reviewActionMode === "approve");
    approveBtn.innerHTML =
      reviewActionMode === "approve"
        ? '<i class="fas fa-check-circle"></i> Confirmar Aprobacion'
        : '<i class="fas fa-check-circle"></i> Aprobar';
    approveBtn.style.display =
      reviewActionMode === "reject" ? "none" : "inline-flex";
  }
  if (rejectBtn) {
    rejectBtn.classList.toggle("btn-primary", reviewActionMode === "reject");
    rejectBtn.innerHTML =
      reviewActionMode === "reject"
        ? '<i class="fas fa-times-circle"></i> Confirmar Rechazo'
        : '<i class="fas fa-times-circle"></i> Rechazar';
    rejectBtn.style.display =
      reviewActionMode === "approve" ? "none" : "inline-flex";
  }

  if (reviewActionMode === "approve") {
    renderApproveRobotsChecklist();
  }
}

function resetReviewActionMode() {
  reviewActionMode = null;

  const approveWrap = document.getElementById("approveFieldsWrap");
  const rejectWrap = document.getElementById("rejectFieldsWrap");
  const notesWrap = document.getElementById("decisionNotesWrap");
  const hint = document.getElementById("reviewModeHint");
  const modeTitle = document.getElementById("reviewModeTitle");
  const approveBtn = document.getElementById("approvePaymentBtn");
  const rejectBtn = document.getElementById("rejectPaymentBtn");
  const contactMenu = document.getElementById("contactMenu");
  const toggleArrivalBtn = document.getElementById("toggleArrivalBtn");
  const modalContent = document.querySelector("#detailsModal .modal-content");

  if (approveWrap) {
    approveWrap.style.display = "none";
  }
  if (rejectWrap) {
    rejectWrap.style.display = "none";
  }
  if (notesWrap) {
    notesWrap.style.display = "none";
  }
  if (hint) {
    hint.style.display = "block";
  }
  if (modeTitle) {
    modeTitle.style.display = "none";
    modeTitle.textContent = "Modo: Revision";
  }
  if (contactMenu) {
    contactMenu.style.display = "";
  }
  if (toggleArrivalBtn) {
    toggleArrivalBtn.style.display = "";
  }
  if (modalContent) {
    modalContent.classList.remove("review-mode-active");
  }
  if (approveBtn) {
    approveBtn.classList.remove("btn-primary");
    approveBtn.innerHTML = '<i class="fas fa-check-circle"></i> Aprobar';
    approveBtn.style.display = "inline-flex";
  }
  if (rejectBtn) {
    rejectBtn.classList.remove("btn-primary");
    rejectBtn.innerHTML = '<i class="fas fa-times-circle"></i> Rechazar';
    rejectBtn.style.display = "inline-flex";
  }
}

async function handleReviewActionButton(mode) {
  if (!selectedTeam) {
    return;
  }

  if (isReviewSubmitting) {
    return;
  }

  const normalizedMode = mode === "reject" ? "reject" : "approve";
  setReviewActionMode(normalizedMode);

  if (normalizedMode === "reject") {
    const reasonSelect = document.getElementById("rejectReasonSelect");
    const reasonOther = document.getElementById("rejectReasonOther");
    const selectedReason = reasonSelect ? String(reasonSelect.value || "") : "";
    const customReason = reasonOther
      ? String(reasonOther.value || "").trim()
      : "";

    if (!selectedReason || (selectedReason === "Otro" && !customReason)) {
      setScanStatus("Selecciona un motivo de rechazo para continuar.", "error");
      if (reasonSelect) {
        reasonSelect.focus();
      }
      return;
    }
  }

  await handlePaymentDecision(normalizedMode);
}

function setReviewButtonsProcessing(isProcessing, action = "") {
  const approveBtn = document.getElementById("approvePaymentBtn");
  const rejectBtn = document.getElementById("rejectPaymentBtn");

  if (approveBtn) {
    approveBtn.disabled = isProcessing;
    if (isProcessing && action === "approve") {
      approveBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    } else {
      approveBtn.innerHTML =
        '<i class="fas fa-check-circle"></i> Confirmar Aprobacion';
    }
  }

  if (rejectBtn) {
    rejectBtn.disabled = isProcessing;
    if (isProcessing && action === "reject") {
      rejectBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    } else {
      rejectBtn.innerHTML =
        '<i class="fas fa-times-circle"></i> Confirmar Rechazo';
    }
  }
}

function showReviewDecisionConfirmation(
  message,
  type = "success",
  decisionAction = null,
) {
  setGlobalStatus(message, type);
  setScanStatus(message, type);

  let overlayTitle = "Confirmacion";
  let variant = type === "error" ? "danger" : "success";
  let iconClass =
    type === "error" ? "fas fa-circle-xmark" : "fas fa-circle-check";

  if (decisionAction === "approve") {
    overlayTitle = type === "error" ? "Error al aprobar" : "Solicitud aceptada";
    variant = type === "error" ? "danger" : "success";
    iconClass =
      type === "error" ? "fas fa-circle-xmark" : "fas fa-circle-check";
  } else if (decisionAction === "reject") {
    overlayTitle =
      type === "error" ? "Error al rechazar" : "Solicitud rechazada";
    variant = "danger";
    iconClass = "fas fa-circle-xmark";
  } else if (type === "error") {
    overlayTitle = "Error";
  }

  showCheckinOverlay(message, overlayTitle, {
    variant,
    iconClass,
  });
}

async function handlePaymentDecision(action) {
  if (!selectedTeam || isReviewSubmitting) {
    return;
  }

  if (action !== "approve" && action !== "reject") {
    setScanStatus("Primero elige si vas a Aprobar o Rechazar.", "error");
    return;
  }

  const notes = String(
    document.getElementById("decisionNotes").value || "",
  ).trim();
  const reasonSelect = document.getElementById("rejectReasonSelect");
  const reasonOther = document.getElementById("rejectReasonOther");
  const approvedRobotsValue = safeNumber(
    document.getElementById("approvedRobotsInput")?.value,
    0,
  );
  const registeredRobots = (selectedTeam.robots || []).length;

  if (
    action === "approve" &&
    approvedRobotsValue === 0 &&
    registeredRobots > 0
  ) {
    setScanStatus(
      "Selecciona al menos un robot autorizado para competir.",
      "error",
    );
    return;
  }

  if (
    action === "approve" &&
    (approvedRobotsValue < 0 || approvedRobotsValue > registeredRobots)
  ) {
    setScanStatus(
      `Robots autorizados inválidos. Debe estar entre 0 y ${registeredRobots}.`,
      "error",
    );
    return;
  }

  let rejectionReason = "";
  if (action === "reject") {
    const selectedReason = reasonSelect ? String(reasonSelect.value || "") : "";
    const customReason = reasonOther
      ? String(reasonOther.value || "").trim()
      : "";

    if (!selectedReason) {
      setScanStatus("Selecciona un motivo de rechazo.", "error");
      return;
    }

    if (selectedReason === "Otro" && !customReason) {
      setScanStatus("Especifica el motivo personalizado de rechazo.", "error");
      return;
    }

    rejectionReason = selectedReason === "Otro" ? customReason : selectedReason;
  }

  const finalNotes =
    action === "reject"
      ? `${rejectionReason}${notes ? ` - ${notes}` : ""}`
      : notes;

  isReviewSubmitting = true;
  setReviewButtonsProcessing(true, action);

  try {
    await apiJson("verify-payment.php", {
      method: "POST",
      body: JSON.stringify({
        action,
        team_id: selectedTeam.id,
        notes: finalNotes,
        reason: finalNotes,
        approved_robots_count: approvedRobotsValue,
      }),
    });

    showReviewDecisionConfirmation(
      action === "approve"
        ? `Solicitud aceptada para ${selectedTeam.folio}.`
        : `Solicitud rechazada para ${selectedTeam.folio}.`,
      "success",
      action,
    );
    pulseNotificationBell();
    playUiTone(action === "approve" ? "success" : "warning");

    closeModal();
    await loadDashboard();
  } catch (error) {
    showReviewDecisionConfirmation(
      `No se pudo actualizar pago: ${error.message}`,
      "error",
      action,
    );
  } finally {
    isReviewSubmitting = false;
    setReviewButtonsProcessing(false);
  }
}

async function handleToggleArrivalFromModal() {
  if (!selectedTeam) {
    return;
  }

  await setAttendance(selectedTeam.id, !selectedTeam.arrived);
  selectedTeam = allTeams.find((item) => item.id === selectedTeam.id) || null;
  if (selectedTeam) {
    showDetails(selectedTeam.id);
  }
}

async function setAttendance(teamId, arrived) {
  const team = allTeams.find((item) => Number(item.id) === Number(teamId));
  const robotStatuses = (team?.robots || []).map((robot) => ({
    robot_id: Number(robot.id),
    arrived,
    robot_name: robot.robot_name || null,
    category: robot.category || null,
  }));

  try {
    await apiJson("admin-checkin.php", {
      method: "POST",
      body: JSON.stringify({
        team_id: teamId,
        arrived,
        checked_by:
          (currentUser && (currentUser.username || currentUser.full_name)) ||
          "ADMIN",
        notes: arrived ? "Check-in desde panel" : "Asistencia removida",
        robot_statuses: robotStatuses.length ? robotStatuses : null,
      }),
    });

    await loadDashboard();
    setScanStatus(
      arrived ? "Llegada registrada correctamente." : "Llegada removida.",
      "success",
    );
  } catch (error) {
    setScanStatus(
      `No se pudo actualizar asistencia: ${error.message}`,
      "error",
    );
    await loadDashboard();
  }
}

async function handleManualArrival() {
  const input = document.getElementById("scanFolioInput");
  const folio = normalizeFolio(input.value);
  if (!folio) {
    setScanStatus(
      "Escribe un folio para abrir el check-in del equipo.",
      "error",
    );
    return;
  }
  await openTeamCheckinByFolio(folio);
}

async function openTeamCheckinByFolio(folio) {
  try {
    switchSection("checkin");
    await loadDashboard();
    const team = allTeams.find(
      (item) => normalizeFolio(item.folio) === normalizeFolio(folio),
    );

    if (!team) {
      setScanStatus("No se encontro un equipo con ese folio.", "error");
      return;
    }

    document.getElementById("scanFolioInput").value = team.folio;
    showRobotCheckinCard(team);
    pulseNotificationBell();
    playUiTone("scan");
    if (team.payment_status !== "verified") {
      setScanStatus(
        `Equipo ${team.folio} pendiente/rechazado. Revisa inscripcion, valida y despues registra llegada por mesa.`,
        "error",
      );
    } else {
      setScanStatus(
        `Equipo cargado: ${team.folio}. Marca los robots verificados en esta mesa y confirma; puedes repetir este proceso en otras mesas hasta completar al equipo.`,
        "info",
      );
    }
  } catch (error) {
    setScanStatus(`No se pudo abrir check-in: ${error.message}`, "error");
  }
}

let isRequestingCamera = false;

async function startScanner() {
  if (isRequestingCamera) return;

  if (!("mediaDevices" in navigator) || !navigator.mediaDevices.getUserMedia) {
    setScanStatus("Tu navegador no permite usar cámara.", "error");
    return;
  }
  if (
    typeof window.BarcodeDetector === "undefined" &&
    typeof window.jsQR !== "function"
  ) {
    setScanStatus(
      "Escaneo QR no soportado por este navegador (falta BarcodeDetector/jsQR).",
      "error",
    );
    return;
  }

  isRequestingCamera = true;

  const video = document.getElementById("adminScannerVideo");
  const scannerBox = document.getElementById("scannerBox");
  if (!video) {
    setScanStatus("No se encontro el visor del escaner en pantalla.", "error");
    return;
  }

  try {
    scanDetector =
      typeof window.BarcodeDetector !== "undefined"
        ? new window.BarcodeDetector({ formats: ["qr_code"] })
        : null;
    if (!scanDetector) {
      setScanStatus(
        "Escaner activo en modo compatible. Apunta al QR para abrir check-in por robot.",
        "info",
      );
    }

    if (!scanCanvas) {
      scanCanvas = document.createElement("canvas");
    }
    if (!scanContext) {
      scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
    }
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    video.srcObject = scanStream;
    video.setAttribute("playsinline", "true");
    video.muted = true;

    video.onloadedmetadata = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) =>
          console.warn("Autoplay prevenido por navegador", err),
        );
      }
    };

    if (scannerBox) {
      scannerBox.style.display = "block";
      document.body.classList.add("scanner-active");
    }
    if (scanDetector) {
      setScanStatus(
        "Escaner activo. Apunta al QR para abrir check-in por robot.",
        "info",
      );
    }

    if (scanTimerId) {
      window.clearInterval(scanTimerId);
    }

    scanTimerId = window.setInterval(async () => {
      try {
        let rawValue = "";

        if (scanDetector) {
          const detections = await scanDetector.detect(video);
          if (detections && detections.length > 0) {
            rawValue = detections[0].rawValue || "";
          }
        } else if (
          scanContext &&
          scanCanvas &&
          typeof window.jsQR === "function"
        ) {
          const width = video.videoWidth || 0;
          const height = video.videoHeight || 0;
          if (width > 0 && height > 0) {
            scanCanvas.width = width;
            scanCanvas.height = height;
            scanContext.drawImage(video, 0, 0, width, height);
            const imageData = scanContext.getImageData(0, 0, width, height);
            const detected = window.jsQR(imageData.data, width, height);
            if (detected && detected.data) {
              rawValue = detected.data;
            }
          }
        }

        if (!rawValue) {
          return;
        }

        const folio = extractFolioFromText(rawValue);
        if (!folio) {
          return;
        }

        stopScanner();
        await openTeamCheckinByFolio(folio);
      } catch {
        // Ignorar errores intermitentes del detector.
      }
    }, 350);

    isRequestingCamera = false;
  } catch (error) {
    isRequestingCamera = false;
    stopScanner();
    const secureHint =
      !window.isSecureContext && !isLocalhostHost()
        ? " En red local desde celular, puede requerir HTTPS para habilitar camara."
        : "";
    setScanStatus(
      `No se pudo iniciar escáner: ${error.message}.${secureHint}`,
      "error",
    );
  }
}

function stopScanner() {
  if (scanTimerId) {
    window.clearInterval(scanTimerId);
    scanTimerId = null;
  }
  if (scanStream) {
    scanStream.getTracks().forEach((track) => track.stop());
    scanStream = null;
  }
  const video = document.getElementById("adminScannerVideo");
  const scannerBox = document.getElementById("scannerBox");
  if (video) {
    video.srcObject = null;
  }
  if (scannerBox) {
    scannerBox.style.display = "none";
  }
  document.body.classList.remove("scanner-active");
}

function exportToCsv() {
  const rows = applyFilterSnapshot();
  if (!rows.length) {
    setScanStatus("No hay registros para exportar.", "error");
    return;
  }

  const data = rows.map((team) => ({
    Folio: team.folio,
    Captain: team.captain_name,
    Escuela: team.school_name,
    Robots: (team.robots || []).map((r) => r.robot_name).join(" | "),
    Categorias: Array.from(
      new Set((team.robots || []).map((r) => getCategoryLabel(r.category))),
    ).join(" | "),
    EstadoPago: team.payment_status,
    Llegada: team.arrived ? "SI" : "NO",
    Total: team.total_amount,
    FechaRegistro: team.created_at,
  }));

  const headers = Object.keys(data[0]);
  const csv = [headers.join(",")]
    .concat(
      data.map((row) =>
        headers
          .map((h) => {
            const raw = String(row[h] ?? "");
            return raw.includes(",") ? `"${raw.replace(/"/g, '""')}"` : raw;
          })
          .join(","),
      ),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.download = `admin_registros_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setScanStatus("Exportación completada.", "success");
}

function exportReadyForRounds() {
  const roles = buildCompetitionRolesData(allTeams);
  if (!roles.length) {
    setScanStatus(
      "No hay robots verificados por llegada para exportar roles.",
      "error",
    );
    return;
  }

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Calibri, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
    .sheet { padding: 16px; }
    h1 { margin: 0 0 12px; color: #0f172a; }
    .category { margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .category-head { background: #0f766e; color: #ecfeff; font-weight: bold; padding: 8px 10px; }
    table { width: 100%; border-collapse: collapse; background: #ffffff; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
    th { background: #dbeafe; text-transform: uppercase; letter-spacing: .3px; }
  </style>
</head>
<body>
  <div class="sheet">
    <h1>Roles por Categoria</h1>
    ${roles
      .map(
        (entry) => `
      <section class="category">
        <div class="category-head">${escapeHtml(getCategoryLabel(entry.category))} · ${entry.robots} robots</div>
        <table>
          <thead>
            <tr>
              <th>Robot</th>
              <th>Capitan</th>
              <th>Escuela</th>
              <th>Integrantes</th>
            </tr>
          </thead>
          <tbody>
            ${entry.items
              .map(
                (item) => `
              <tr>
                <td>${escapeHtml(item.robot)}</td>
                <td>${escapeHtml(item.captain)}</td>
                <td>${escapeHtml(item.school)}</td>
                <td>${escapeHtml(item.members.length ? item.members.join(", ") : "Sin integrantes adicionales")}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    `,
      )
      .join("")}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.download = `roles_competencia_${date}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setScanStatus(
    "Roles por categoria exportados correctamente en formato Excel.",
    "success",
  );
}

async function loadSecurityActivity() {
  const body = document.getElementById("securityActivityBody");
  if (!body) {
    return;
  }

  try {
    const result = await apiJson("admin-security-activity.php", {
      method: "GET",
    });

    securityActivityEvents = result.data?.events || [];
    window.securityActivityEvents = securityActivityEvents; // Sincronización para el historial de tabla

    const totalEventsEl = document.getElementById("securityTotalEvents");
    if (totalEventsEl) {
      totalEventsEl.textContent = String(
        result.data?.summary?.total_events || 0,
      );
    }

    const uniqueIpsEl = document.getElementById("securityUniqueIps");
    if (uniqueIpsEl) {
      uniqueIpsEl.textContent = String(
        result.data?.summary?.unique_ips_24h || 0,
      );
    }

    const adminActionsEl = document.getElementById("securityAdminActions");
    if (adminActionsEl) {
      adminActionsEl.textContent = String(
        result.data?.summary?.admin_actions || 0,
      );
    }

    const registrationsEl = document.getElementById("securityRegistrations");
    if (registrationsEl) {
      registrationsEl.textContent = String(
        result.data?.summary?.registration_events || 0,
      );
    }

    if (typeof window.renderSecurityActivityTable === "function") {
      window.renderSecurityActivityTable();
    }
  } catch (error) {
    setSecurityMessage(
      `No se pudo cargar monitoreo de seguridad: ${error.message}`,
      "error",
    );
  }
}

window.renderSecurityActivityTable = function () {
  const body = document.getElementById("securityActivityBody");
  if (!body) {
    return;
  }

  const searchValue = String(
    document.getElementById("securitySearchInput")?.value || "",
  )
    .trim()
    .toLowerCase();
  const sourceFilter =
    document.getElementById("securitySourceFilter")?.value || "all";

  let filtered = [...securityActivityEvents];

  if (sourceFilter && sourceFilter !== "all") {
    filtered = filtered.filter((item) => item.source === sourceFilter);
  }

  if (searchValue) {
    filtered = filtered.filter((item) => {
      const text =
        `${item.timestamp || ""} ${item.action || ""} ${item.ip || ""} ${item.browser || ""} ${item.device || ""} ${item.detail || ""}`.toLowerCase();
      return text.includes(searchValue);
    });
  }

  if (!filtered.length) {
    body.innerHTML =
      '<tr><td colspan="7">Sin actividad para los filtros seleccionados.</td></tr>';
    return;
  }

  body.innerHTML = filtered
    .map((item) => {
      const sourceBadge =
        item.source === "admin"
          ? '<span class="badge-status badge-verified">Admin</span>'
          : '<span class="badge-status badge-pending">Registro</span>';

      return `
        <tr>
          <td>${formatDateTime(item.timestamp)}</td>
          <td>${sourceBadge}</td>
          <td>${escapeHtml(item.action || "-")}</td>
          <td>${escapeHtml(item.ip || "-")}</td>
          <td>${escapeHtml(item.browser || "-")}</td>
          <td>${escapeHtml(item.device || "-")}</td>
          <td>${escapeHtml(item.detail || "-")}</td>
        </tr>
      `;
    })
    .join("");
};

function toggleSecurityPanel() {
  switchSection("security");
}

function setSecurityMessage(message, type = "success") {
  const el = document.getElementById("securityMessage");
  if (!el) {
    return;
  }
  el.textContent = message;
  el.classList.remove("success", "error");
  el.classList.add(type);
}

function validateStrongPassword(value) {
  return (
    value.length >= 10 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

async function handleChangePassword(event) {
  event.preventDefault();

  const newUsername = String(
    document.getElementById("newUsername")?.value || "",
  ).trim();
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmNewPassword").value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    setSecurityMessage("Completa todos los campos de seguridad.", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    setSecurityMessage(
      "La confirmación no coincide con la nueva contraseña.",
      "error",
    );
    return;
  }

  if (!validateStrongPassword(newPassword)) {
    setSecurityMessage(
      "Usa mínimo 10 caracteres con mayúscula, minúscula, número y símbolo.",
      "error",
    );
    return;
  }

  const username =
    (currentUser && (currentUser.username || currentUser.full_name)) || "admin";

  try {
    await apiJson("admin-change-password.php", {
      method: "POST",
      body: JSON.stringify({
        username,
        new_username: newUsername || null,
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (newUsername) {
      if (typeof currentUser === "string") {
        currentUser = { username: newUsername, full_name: newUsername };
      } else {
        currentUser = {
          ...(currentUser || {}),
          username: newUsername,
        };
      }
      sessionStorage.setItem("adminUser", JSON.stringify(currentUser));
      document.getElementById("currentUser").textContent =
        currentUser.full_name || currentUser.username || "Admin";
    }

    document.getElementById("changePasswordForm").reset();
    setSecurityMessage(
      newUsername
        ? "Usuario y contraseña actualizados correctamente."
        : "Contraseña actualizada correctamente.",
      "success",
    );
  } catch (error) {
    setSecurityMessage(
      error.message || "No se pudo actualizar contraseña.",
      "error",
    );
  }
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    if (btn.dataset.passwordBound === "1") {
      return;
    }
    btn.dataset.passwordBound = "1";

    btn.addEventListener("click", () => {
      const fieldId = btn.dataset.togglePassword;
      const input = document.getElementById(fieldId);
      if (!input) {
        return;
      }

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      const icon = btn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye", !isHidden);
        icon.classList.toggle("fa-eye-slash", isHidden);
      }
    });
  });
}

function applyFilterSnapshot() {
  const searchValue = String(document.getElementById("searchInput").value || "")
    .trim()
    .toLowerCase();
  const categoryValue = document.getElementById("categoryFilter")?.value || "";
  const paymentValue = document.getElementById("paymentFilter")?.value || "";

  return allTeams.filter((team) => {
    if (searchValue) {
      const robotsText = (team.robots || []).map((r) => r.robot_name).join(" ");
      const matchSearch =
        String(team.folio || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(team.captain_name || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(team.school_name || "")
          .toLowerCase()
          .includes(searchValue) ||
        robotsText.toLowerCase().includes(searchValue);
      if (!matchSearch) {
        return false;
      }
    }

    if (
      categoryValue &&
      !(team.robots || []).some((robot) => robot.category === categoryValue)
    ) {
      return false;
    }

    if (paymentValue && team.payment_status !== paymentValue) {
      return false;
    }

    return true;
  });
}

const usersModule = {
  data: [],
  selectedUsername: null,

  async load() {
    try {
      const res = await apiJson("admin-users.php", { method: "GET" });
      this.data = res.data || [];
      this.render();
    } catch (err) {
      setGlobalStatus("Error al cargar usuarios: " + err.message, "error");
    }
  },

  render() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    const search = (
      document.getElementById("usersSearchInput")?.value || ""
    ).toLowerCase();
    const roleFilter =
      document.getElementById("usersRoleFilter")?.value || "all";

    const filtered = this.data.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search) {
        const str =
          `${u.username} ${u.full_name} ${u.email} ${u.phone} ${u.school}`.toLowerCase();
        if (!str.includes(search)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="sec-table-empty">No se encontraron usuarios.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map((u) => {
        let roleBadge = "";
        if (u.role === "superadmin")
          roleBadge =
            '<span class="badge-status badge-verified">Superadmin</span>';
        else if (u.role === "staff")
          roleBadge =
            '<span class="badge-status badge-pending" style="background:#fff7ed;color:#9a3412">Staff</span>';
        else
          roleBadge =
            '<span class="badge-status" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;">Estudiante</span>';

        return `
        <tr>
          <td><strong>${escapeHtml(u.username)}</strong></td>
          <td>${escapeHtml(u.full_name)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.phone || "-")}</td>
          <td>${escapeHtml(u.school || "-")}</td>
          <td>${roleBadge}</td>
          <td>
            <button class="btn btn-secondary btn-small" onclick="usersModule.openModal('${u.username}')">
              <i class="fas fa-user-edit"></i> Detalles y Editar
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  },

  openModal(username) {
    if (
      currentUser.admin_role !== "superadmin" &&
      currentUser.role !== "superadmin"
    ) {
      setGlobalStatus(
        "Solo los superadministradores pueden gestionar detalles y privilegios.",
        "error",
      );
      return;
    }

    const user = this.data.find((u) => u.username === username);
    if (!user) return;

    this.selectedUsername = username;

    if (user.platform_id) {
      document.getElementById("studentDataBlock").style.display = "block";
      document.getElementById("lblUserPhone").textContent = user.phone || "-";
      document.getElementById("lblUserSchool").textContent = user.school || "-";
      document.getElementById("lblUserCareer").textContent = user.career || "-";
      document.getElementById("lblUserSemester").textContent =
        user.semester || "-";
      document.getElementById("lblUserMatricula").textContent =
        user.matricula || "-";
      document.getElementById("lblUserControl").textContent =
        user.control_number || "-";
      document.getElementById("lblUserLocation").textContent =
        [user.city, user.country].filter(Boolean).join(", ") || "-";
    } else {
      document.getElementById("studentDataBlock").style.display = "none";
    }

    document.getElementById("editOriginalUsername").value = user.username;
    document.getElementById("editUserFullName").value = user.full_name;
    document.getElementById("editUserEmail").value = user.email;
    document.getElementById("editUserUsername").value = user.username;

    const currentRole = user.role;
    document.getElementById("editUserRole").value =
      currentRole === "admin" || currentRole === "alumno"
        ? "estudiante"
        : currentRole;

    document.getElementById("editUserPassword").value = "";
    document.getElementById("adminAuthPassword").value = "";

    openModal("userEditModal");
  },

  closeModal() {
    this.selectedUsername = null;
    closeModal();
  },

  async saveUser() {
    const originalUsername = document.getElementById(
      "editOriginalUsername",
    ).value;
    const newUsername = document.getElementById("editUserUsername").value;
    const fullName = document.getElementById("editUserFullName").value;
    const email = document.getElementById("editUserEmail").value;
    const role = document.getElementById("editUserRole").value;
    const newPassword = document.getElementById("editUserPassword").value;
    const authPassword = document.getElementById("adminAuthPassword").value;

    if (!newUsername || !fullName || !email || !authPassword) {
      setGlobalStatus(
        "El usuario, nombre, correo y tu contraseña son obligatorios.",
        "error",
      );
      return;
    }

    try {
      await apiJson("admin-users.php", {
        method: "POST",
        body: JSON.stringify({
          action: "update_user",
          original_username: originalUsername,
          username: newUsername,
          full_name: fullName,
          email: email,
          role: role,
          new_password: newPassword,
          admin_password: authPassword,
          current_admin: currentUser.username,
        }),
      });
      setGlobalStatus("Usuario actualizado correctamente.", "success");
      this.closeModal();
      this.load();
    } catch (err) {
      setGlobalStatus(err.message, "error");
    }
  },
};

function closeModal() {
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.classList.remove("show");
    modal.classList.add("hidden");
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("show");
  }
}

window.customConfirm = function (message, title = "Confirmar acción") {
  return new Promise((resolve) => {
    let modal = document.getElementById("confirmModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "confirmModal";
      modal.className = "modal-overlay hidden";
      modal.style.zIndex = "10000";
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 400px; text-align: center; padding: 2rem;">
          <i class="fas fa-exclamation-triangle fa-3x" style="color: var(--danger); margin-bottom: 1rem;"></i>
          <h3 id="confirmModalTitle" style="margin-bottom: 1rem;"></h3>
          <p id="confirmModalMessage" style="color: var(--text-mute); margin-bottom: 1.5rem;"></p>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="confirmModalCancel" class="btn btn-secondary">Cancelar</button>
            <button id="confirmModalOk" class="btn btn-danger">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalMessage").textContent = message;

    const btnOk = document.getElementById("confirmModalOk");
    const btnCancel = document.getElementById("confirmModalCancel");

    const cleanup = () => {
      modal.classList.add("hidden");
      modal.classList.remove("show");
      btnOk.onclick = null;
      btnCancel.onclick = null;
    };

    btnOk.onclick = () => {
      cleanup();
      resolve(true);
    };
    btnCancel.onclick = () => {
      cleanup();
      resolve(false);
    };

    // Forzar un reflow para que la animación fluya
    void modal.offsetWidth;
    modal.classList.remove("hidden");
    modal.classList.add("show");
  });
};

window.closeModal = closeModal;

window.addEventListener("click", (event) => {
  const modal = document.getElementById("detailsModal");
  if (event.target === modal) {
    closeModal();
  }
});

window.addEventListener("beforeunload", () => {
  stopScanner();
});

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES NUEVAS
// ═══════════════════════════════════════════════════════════════════

function _setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val ?? "");
}

function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d)
    ? String(v)
    : d.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

// ═══════════════════════════════════════════════════════════════════
// ESTADÍSTICAS EXTENDIDAS  (congreso + escuelas + paquetes)
// ═══════════════════════════════════════════════════════════════════

function updateCongressStatsKpis() {
  const reqs = congressModule._getRequests();
  const approved = reqs.filter((r) => r.status === "approved");
  const pending = reqs.filter((r) => r.status === "pending");
  const rejected = reqs.filter((r) => r.status === "rejected");
  const resubmit = reqs.filter((r) => r.status === "resubmit_requested");
  const congRev = approved.reduce((s, r) => s + safeNumber(r.total_fee, 0), 0);
  const robRev = allTeams
    .filter((t) => t.payment_status === "verified")
    .reduce((s, t) => s + safeNumber(t.total_amount, 0), 0);

  _setEl("statCongressTotal", reqs.length);
  _setEl("statCongressApproved", approved.length);
  _setEl("statCongressPending", pending.length);
  _setEl("statCongressRevenue", formatMoney(congRev));
  _setEl("statTotalCombined", formatMoney(congRev + robRev));

  // KPIs dentro de la sección congreso
  _setEl("congressKpiPending", pending.length);
  _setEl("congressKpiApproved", approved.length);
  _setEl("congressKpiRejected", rejected.length);
  _setEl("congressKpiResubmit", resubmit.length);
  _setEl("congressKpiRevenue", formatMoney(congRev));
}

function renderSchoolBarChart(teams) {
  const container = document.getElementById("schoolBarChart");
  if (!container) return;
  const verified = teams.filter((t) => t.payment_status === "verified");
  const map = {};
  verified.forEach((t) => {
    const s = t.school_name || "Otra";
    map[s] = (map[s] || 0) + 1;
  });
  const sorted = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (!sorted.length) {
    container.innerHTML = '<p class="quick-empty">Sin datos aún.</p>';
    return;
  }
  const max = sorted[0][1] || 1;
  container.innerHTML = sorted
    .map(
      ([name, cnt]) => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      <div class="bar-track"><div class="bar-fill bar-fill-blue" style="width:${Math.round((cnt / max) * 100)}%"></div></div>
      <div class="bar-val">${cnt}</div>
    </div>`,
    )
    .join("");
}

function renderCongressPackageChart() {
  const container = document.getElementById("congressPackageChart");
  if (!container) return;
  const reqs = congressModule._getRequests();
  const map = {};
  reqs.forEach((r) => {
    const k = r.package_label || "Solo congreso";
    map[k] = (map[k] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    container.innerHTML =
      '<p class="quick-empty">Sin solicitudes de congreso aún.</p>';
    return;
  }
  const max = sorted[0][1] || 1;
  container.innerHTML = sorted
    .map(
      ([pkg, cnt]) => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(pkg)}">${escapeHtml(pkg)}</div>
      <div class="bar-track"><div class="bar-fill bar-fill-accent" style="width:${Math.round((cnt / max) * 100)}%"></div></div>
      <div class="bar-val">${cnt}</div>
    </div>`,
    )
    .join("");
}

// ═══════════════════════════════════════════════════════════════
// CIERRE DE SESIÓN POR INACTIVIDAD
// • 15 minutos de inactividad → cerrar sesión
// • Aviso a los 13 minutos (2 minutos antes)
// ═══════════════════════════════════════════════════════════════
(function initIdleSessionTimeout() {
  const IDLE_TOTAL_MS = 15 * 60 * 1000;
  const IDLE_WARN_MS = 13 * 60 * 1000;
  const WARN_COUNTDOWN = 2 * 60;

  let idleWarnTimer = null;
  let idleLogoutTimer = null;
  let countdownTimer = null;
  let warningVisible = false;

  let sessionRemainingMs = IDLE_TOTAL_MS;
  let globalTickTimer = null;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes idleTimerPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);

  const timerWidget = document.createElement("div");
  timerWidget.id = "idleGlobalTimerWidget";
  timerWidget.style.cssText = `
    position: fixed;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #94a3b8;
    padding: 8px 14px;
    border-radius: 99px;
    font-size: 0.85rem;
    font-weight: 600;
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    cursor: default;
    user-select: none;
  `;
  timerWidget.innerHTML = `<i class="fas fa-clock" style="color: #3b82f6;"></i> <span id="idleGlobalTimerText">15:00</span>`;
  document.body.appendChild(timerWidget);

  const overlay = document.createElement("div");
  overlay.id = "idleWarningOverlay";
  overlay.style.cssText = [
    "display:none",
    "position:fixed",
    "inset:0",
    "z-index:99999",
    "background:rgba(0,0,0,.72)",
    "backdrop-filter:blur(4px)",
    "align-items:center",
    "justify-content:center",
  ].join(";");
  overlay.innerHTML = `
    <div style="
      background:#0f1923;border:1px solid #22d3ee44;border-radius:16px;
      padding:36px 40px;max-width:420px;width:90%;text-align:center;
      box-shadow:0 0 60px #22d3ee22;
    ">
      <div style="font-size:2.4rem;margin-bottom:12px;">&#x23F1;</div>
      <h3 style="color:#22d3ee;margin:0 0 10px;font-size:1.2rem;font-weight:700;">
        Sesión a punto de cerrarse
      </h3>
      <p style="color:#94a3b8;margin:0 0 18px;font-size:.9rem;line-height:1.5;">
        No se ha detectado actividad. La sesión se cerrará en
      </p>
      <div id="idleCountdownNum" style="
        font-size:3rem;font-weight:800;color:#f97316;
        margin-bottom:22px;letter-spacing:2px;
      ">2:00</div>
      <button id="idleStayBtn" style="
        background:#22d3ee;color:#0f1923;border:none;border-radius:8px;
        padding:12px 32px;font-size:1rem;font-weight:700;cursor:pointer;
      ">
        Seguir en sesión
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  document
    .getElementById("idleStayBtn")
    .addEventListener("click", resetIdleTimer);

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function showWarning() {
    warningVisible = true;
    overlay.style.display = "flex";
    let secs = WARN_COUNTDOWN;
    updateCountdown(secs);
    countdownTimer = setInterval(() => {
      secs--;
      updateCountdown(secs);
      if (secs <= 0) clearInterval(countdownTimer);
    }, 1000);
  }

  function updateCountdown(secs) {
    const el = document.getElementById("idleCountdownNum");
    if (el) el.textContent = Math.floor(secs / 60) + ":" + pad(secs % 60);
  }

  function hideWarning() {
    warningVisible = false;
    overlay.style.display = "none";
    clearInterval(countdownTimer);
  }

  function forceLogout() {
    hideWarning();
    if (typeof _showLogoutOverlay === "function") {
      _showLogoutOverlay(function () {
        fetch("/app/api/auth-logout.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })
          .catch(function () {})
          .finally(function () {
            sessionStorage.removeItem("adminUser");
            window.location.href = "/acceso";
          });
      });
    } else {
      sessionStorage.removeItem("adminUser");
      window.location.href = "/acceso";
    }
  }

  function updateGlobalTimer() {
    if (sessionRemainingMs <= 0) return;
    sessionRemainingMs -= 1000;

    const totalSecs = Math.floor(sessionRemainingMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;

    const textEl = document.getElementById("idleGlobalTimerText");
    if (textEl) {
      textEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
    }

    if (totalSecs <= 120) {
      timerWidget.style.borderColor = "rgba(239, 68, 68, 0.6)";
      timerWidget.style.color = "#fca5a5";
      timerWidget.querySelector("i").style.color = "#ef4444";
      timerWidget.style.animation = "idleTimerPulse 1s infinite";
    } else if (totalSecs <= 300) {
      timerWidget.style.borderColor = "rgba(245, 158, 11, 0.6)";
      timerWidget.style.color = "#fcd34d";
      timerWidget.querySelector("i").style.color = "#f59e0b";
      timerWidget.style.animation = "none";
    } else {
      timerWidget.style.borderColor = "rgba(59, 130, 246, 0.3)";
      timerWidget.style.color = "#94a3b8";
      timerWidget.querySelector("i").style.color = "#3b82f6";
      timerWidget.style.animation = "none";
    }
  }

  function resetIdleTimer() {
    clearTimeout(idleWarnTimer);
    clearTimeout(idleLogoutTimer);
    clearInterval(countdownTimer);

    sessionRemainingMs = IDLE_TOTAL_MS;
    if (globalTickTimer) clearInterval(globalTickTimer);
    updateGlobalTimer(); // Actualizar de inmediato
    globalTickTimer = setInterval(updateGlobalTimer, 1000);

    if (warningVisible) hideWarning();
    idleWarnTimer = setTimeout(showWarning, IDLE_WARN_MS);
    idleLogoutTimer = setTimeout(forceLogout, IDLE_TOTAL_MS);
  }

  [
    "mousemove",
    "mousedown",
    "keydown",
    "touchstart",
    "scroll",
    "click",
  ].forEach((ev) =>
    document.addEventListener(ev, resetIdleTimer, { passive: true }),
  );

  resetIdleTimer();
})();
