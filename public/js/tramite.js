// ================================================
// TRAMITE.JS — Wizard de inscripción pantalla completa
// RENOVATEC 2026
// ================================================

var TRAMITE_SESSION_KEY = "renovatec_user_session_v1";
var TRAMITE_PACKAGE_DRAFT_KEY = "renovatec_package_draft_v1";

var TRAMITE_PRECIO_CONGRESO = 400;
var TRAMITE_PRECIO_CAMPAMENTO = 200;
var TRAMITE_ETAPAS_ROBOTICA = [
  {
    precio: 130,
    inicio: new Date("2026-04-01"),
    fin: new Date("2026-06-30T23:59:59"),
    nombre: "Etapa 1",
  },
  {
    precio: 200,
    inicio: new Date("2026-07-01"),
    fin: new Date("2026-08-31T23:59:59"),
    nombre: "Etapa 2",
  },
  {
    precio: 350,
    inicio: new Date("2026-09-01"),
    fin: new Date("2026-10-23T23:59:59"),
    nombre: "Etapa 3",
  },
];

var TRAMITE_CATEGORIAS_ROBOT = [
  "Robot de guerra 1 lb",
  "Robot de guerra 3lb",
  "Seguidor de línea profesional",
  "Seguidor de línea amateur",
  "Carros RC",
  "Soccer RC",
  "Mini sumo RC",
  "Robot insecto",
];

var TRAMITE_ROBOT_CATEGORY_ALIASES = {
  "mini sumo (sin sensor)": "Mini sumo RC",
  "sumo estándar (con sensor)": "Robot de guerra 3lb",
  "sumo estandar (con sensor)": "Robot de guerra 3lb",
  "seguidor de línea básico": "Seguidor de línea amateur",
  "seguidor de linea básico": "Seguidor de línea amateur",
  "seguidor de linea basico": "Seguidor de línea amateur",
  "seguidor de línea avanzado": "Seguidor de línea profesional",
  "seguidor de linea avanzado": "Seguidor de línea profesional",
  laberinto: "Robot insecto",
  "robot de velocidad": "Carros RC",
  "categoría libre": "Robot insecto",
  "categoria libre": "Robot insecto",
};

var tramiteUserSession = JSON.parse(
  sessionStorage.getItem(TRAMITE_SESSION_KEY) || "null",
);
// Convocatoria activa cargada desde admin-settings
var tramiteConvocatoriaActiva = null;
var tramiteModulosActivos = {
  congress: true,
  robotics: true,
  camp: false,
  custom: [],
};
var tramiteCurrentStep = 1;
var tramiteRobotCounter = 0;
var tramiteCurrentFolio = "";
var tramiteIncludesRobotics = false;
var tramiteShouldResumeAtStep5 =
  new URLSearchParams(window.location.search).get("resume") === "5";
var tramiteLockedRobotUnitPrice = null;
var tramiteExistingRequest = null;

function getProjectBasePath() {
  return "";
}

function getApiUrl(endpoint) {
  return `/app/api/${endpoint}`;
}

function getRobotUnitPrice() {
  return tramiteLockedRobotUnitPrice ?? getEtapaActual().precio;
}

function normalizeRobotCategory(category) {
  const raw = String(category || "").trim();
  if (!raw) return "";
  const canonical = TRAMITE_CATEGORIAS_ROBOT.find(
    (item) => item.toLowerCase() === raw.toLowerCase(),
  );
  if (canonical) return canonical;
  return TRAMITE_ROBOT_CATEGORY_ALIASES[raw.toLowerCase()] || raw;
}

// ================================================
// INIT
// ================================================
function initTramite() {
  if (window._tramiteInitialized) return;
  window._tramiteInitialized = true;

  checkExistingIpBlock();
  if (!tramiteUserSession) {
    window.location.href = "/acceso";
    return;
  }

  splashShow("Verificando tu sesión…");

  initUserInfo();
  injectVoiceAssistantButton();
  restorePackageDraft();
  initDropZone();
  updateStageLabel();

  splashMsg("Cargando convocatoria activa…");

  loadConvocatoriaActiva()
    .then(() => {
      renderPackagesGrid();
      initPackageListeners();
      syncTotal();
    })
    .catch(() => {
      renderPackagesGrid();
      initPackageListeners();
      syncTotal();
    })
    .finally(() => {
      splashMsg("Revisando solicitudes existentes…");
      loadSavedRequestDraft()
        .catch(() => null)
        .finally(() => {
          if (!tramiteRobotCounter) {
            addInitialRobot();
          }
          updateTotalSteps();
          if (tramiteShouldResumeAtStep5) {
            buildSummary();
            showStep(5);
          } else {
            showStep(1);
          }
          splashHide();
        });
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTramite);
} else {
  initTramite(); // Si el DOM ya cargó (Fallback async), ejecutar de inmediato
}

// ================================================
// CONVOCATORIA ACTIVA — carga dinámica de módulos
// ================================================
async function loadConvocatoriaActiva() {
  try {
    const res = await fetch("/app/api/admin-settings.php?action=get_all");
    const json = await res.json();
    if (!json.success) return;

    // Buscar la primera convocatoria activa
    const convs = json.data?.convocatorias ?? [];
    const activa = convs.find((c) => parseInt(c.is_active) === 1) ?? null;
    tramiteConvocatoriaActiva = activa;

    // Load bank settings
    window.tramiteBankSettings = {
      bank_name: json.data.settings?.bank_name || "Banco No Configurado",
      bank_beneficiary:
        json.data.settings?.bank_beneficiary || "Nombre del beneficiario",
      bank_clabe: json.data.settings?.bank_clabe || "000000000000000000",
      bank_card_number:
        json.data.settings?.bank_card_number || "0000 0000 0000 0000",
      bank_account: json.data.settings?.bank_account || "",
    };

    // Update DOM
    document
      .querySelectorAll(".dynBankName")
      .forEach((el) => (el.textContent = window.tramiteBankSettings.bank_name));
    document
      .querySelectorAll(".dynBankBeneficiary")
      .forEach(
        (el) => (el.textContent = window.tramiteBankSettings.bank_beneficiary),
      );
    document
      .querySelectorAll(".dynBankClabe")
      .forEach(
        (el) => (el.textContent = window.tramiteBankSettings.bank_clabe),
      );
    document
      .querySelectorAll(".dynBankCardNumber")
      .forEach(
        (el) => (el.textContent = window.tramiteBankSettings.bank_card_number),
      );

    if (activa) {
      // Leer módulos incluidos
      let mods = { congress: true, robotics: true, camp: false, custom: [] };
      try {
        const parsed = JSON.parse(activa.included_modules ?? "null");
        if (parsed && typeof parsed === "object") mods = { ...mods, ...parsed };
      } catch (e) {}
      tramiteModulosActivos = mods;

      // Actualizar precios desde la convocatoria si tiene precio_base
      if (activa.precio_base && parseFloat(activa.precio_base) > 0) {
        TRAMITE_PRECIO_CONGRESO = parseFloat(activa.precio_base);
      }
    }
  } catch (e) {
    console.warn("[tramite] No se pudo cargar convocatoria activa:", e);
  }
}

/** Definición estática de módulos fijos — se extienden con custom */
const TRAMITE_MODULO_DEFS = {
  congress: {
    id: "congress",
    cssClass: "pkg-congress",
    icon: "fa-microphone-lines",
    title: "Congreso Internacional",
    subtitle: "Talleres + conferencias magistrales + materiales de apoyo",
    bullets: [
      "Acceso a todas las conferencias",
      "Talleres prácticos",
      "Material de apoyo digital",
      "Constancia de participación",
    ],
    priceHtml: () =>
      `<strong>$${TRAMITE_PRECIO_CONGRESO}</strong><span>MXN por persona</span>`,
    inputId: "includeCongress",
    defaultChecked: true,
  },
  robotics: {
    id: "robotics",
    cssClass: "pkg-robotics",
    icon: "fa-robot",
    title: "Torneo de Robótica",
    subtitle:
      "Compite con tu equipo en la arena de robots más importante del sureste",
    bullets: [
      "Registro de robot(s)",
      "Acceso al área de competencia",
      "Trofeos y reconocimientos",
    ],
    priceHtml: () =>
      `<strong id="roboticsPrice">$${getEtapaActual().precio}</strong><span>MXN por robot</span><small class="stage-label" id="stageLabel">Etapa 1 activa</small>`,
    inputId: "includeRobotics",
    defaultChecked: false,
  },
  camp: {
    id: "camp",
    cssClass: "pkg-camp",
    icon: "fa-campground",
    title: "Campamento",
    subtitle: "Una experiencia de convivencia y aprendizaje fuera del aula",
    bullets: [
      "Alojamiento incluido",
      "Alimentación completa",
      "Actividades de integración",
    ],
    priceHtml: () =>
      `<strong>$${TRAMITE_PRECIO_CAMPAMENTO}</strong><span>MXN por persona</span>`,
    inputId: "includeCamp",
    defaultChecked: false,
  },
};

function renderPackagesGrid() {
  const grid = document.getElementById("packagesGrid");
  const loadingState = document.getElementById("packagesLoadingState");
  const noConvState = document.getElementById("noConvocatoriaState");
  if (!grid) return;

  // Ocultar skeleton
  if (loadingState) loadingState.style.display = "none";

  if (!tramiteConvocatoriaActiva) {
    // Sin convocatoria — mostrar estado vacío
    if (noConvState) noConvState.style.display = "";
    grid.style.display = "none";
    return;
  }

  if (noConvState) noConvState.style.display = "none";
  grid.style.display = "";
  grid.innerHTML = "";

  const mods = tramiteModulosActivos;
  const order = ["congress", "robotics", "camp"];

  // Módulos fijos
  order.forEach((key) => {
    if (!mods[key]) return;
    const def = TRAMITE_MODULO_DEFS[key];
    grid.innerHTML += buildPkgCardHTML(def);
  });

  // Módulos personalizados
  (mods.custom ?? []).forEach((m) => {
    if (!m.label) return;
    const def = {
      id: m.key || m.label.toLowerCase().replace(/\s+/g, "-"),
      cssClass: "pkg-custom",
      icon: m.icon || "fa-star",
      title: m.label,
      subtitle: m.desc || "",
      bullets: [],
      priceHtml: () =>
        m.price > 0
          ? `<strong>$${m.price}</strong><span>${m.priceLabel || "MXN por persona"}</span>`
          : `<strong>Incluido</strong><span>${m.priceLabel || ""}</span>`,
      inputId:
        "includeCustom_" +
        (m.key || m.label.toLowerCase().replace(/\s+/g, "-")),
      defaultChecked: false,
    };
    // Registrar precio en globals para cálculo
    window["TRAMITE_PRECIO_CUSTOM_" + def.id.toUpperCase().replace(/-/g, "_")] =
      m.price || 0;
    grid.innerHTML += buildPkgCardHTML(def);
  });
}

function buildPkgCardHTML(def) {
  const bulletsHtml = def.bullets.length
    ? `<ul class="pkg-includes">${def.bullets.map((b) => `<li><i class="fas fa-check-circle"></i> ${b}</li>`).join("")}</ul>`
    : "";
  return `
    <label class="pkg-card ${def.cssClass}" id="pkgCard_${def.id}">
      <input type="checkbox" id="${def.inputId}" ${def.defaultChecked ? "checked" : ""} />
      <div class="pkg-card-inner">
        <div class="pkg-icon"><i class="fas ${def.icon}"></i></div>
        <div class="pkg-info">
          <strong>${def.title}</strong>
          <span>${def.subtitle}</span>
          ${bulletsHtml}
        </div>
        <div class="pkg-price">${def.priceHtml()}</div>
      </div>
      <div class="pkg-selected-indicator"><i class="fas fa-check"></i></div>
    </label>`;
}

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
            <p style="margin: 0;"><i class="fas fa-envelope"></i> soporte@renovatec.mx</p>
            <p style="margin: 5px 0 0;"><i class="fas fa-phone"></i> +52 452 123 4567</p>
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

// ── Splash helpers ─────────────────────────────
function splashShow(msg) {
  const el = document.getElementById("tramiteSplash");
  if (el) el.classList.remove("splash-hidden");
  splashMsg(msg || "Cargando…");
}
function splashHide() {
  const el = document.getElementById("tramiteSplash");
  if (!el) return;
  el.classList.add("splash-out");
  setTimeout(() => el.classList.add("splash-hidden"), 420);
}
function splashMsg(msg) {
  const el = document.getElementById("splashMsg");
  if (el) el.textContent = msg;
}

function initUserInfo() {
  const profile = tramiteUserSession.profile || {};
  const name =
    profile.full_name || tramiteUserSession.full_name || "Participante";

  setVal("headerUserName", name);
  setVal("profileFullName", name);
  setVal("profileEmail", tramiteUserSession.email || "");
  setVal("profilePhone", profile.phone || tramiteUserSession.phone || "");
  setVal("profileSchool", profile.school || "");
  setVal("profileControlNumber", profile.control_number || "");
  setVal("profileCareer", profile.career || "");
  setVal("profileSemester", profile.semester || "");
  setVal("profileCountry", profile.country || "");
  setVal("profileCity", profile.city || "");

  // Capitán en step 3
  setVal("member1", name);
  setVal("captainNameDisplay", name);
  setVal("captainSchoolDisplay", profile.school || "—");

  makeProfileFieldsReadOnly();
}

function makeProfileFieldsReadOnly() {
  const fields = [
    "profileFullName",
    "profileEmail",
    "profilePhone",
    "profileSchool",
    "profileCountry",
    "profileCity",
    "profileControlNumber",
    "profileCareer",
    "profileSemester",
  ];

  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute("readonly", "true");
      el.style.pointerEvents = "none"; // Bloquea todo intento de clic o enfoque
      el.style.backgroundColor = "rgba(255,255,255,0.02)";
      el.style.color = "#94a3b8";
      el.style.cursor = "not-allowed";
      el.tabIndex = -1; // Lo saca del orden de tabulación
      if (el.tagName === "SELECT") {
        el.setAttribute("disabled", "true");
      }
    }
  });

  let btnContainer = document.getElementById("profileEditRedirectContainer");
  if (!btnContainer) {
    const step2Body =
      document.querySelector("#step2 .wizard-body") ||
      document.getElementById("step2");
    if (step2Body) {
      btnContainer = document.createElement("div");
      btnContainer.id = "profileEditRedirectContainer";
      btnContainer.style.cssText =
        "margin-top: 20px; padding: 15px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; text-align: center;";
      btnContainer.innerHTML = `
        <p style="margin: 0 0 10px 0; color: #fcd34d; font-size: 0.95rem;"><i class="fas fa-lock"></i> Confirma tus datos antes de continuar.</p>
        <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 0.85rem;">Por seguridad, no puedes modificar tu información desde aquí. Si necesitas hacer algún cambio, dirígete a tu Perfil para actualizar tus datos y luego regresa a elegir tus paquetes.</p>
        <a href="perfil.html?section=personal" class="btn btn-secondary"><i class="fas fa-user-edit"></i> Actualizar mis datos en el Perfil</a>
      `;
      const footer = step2Body.querySelector(".wizard-footer");
      if (footer) {
        footer.parentNode.insertBefore(btnContainer, footer);
      } else {
        step2Body.appendChild(btnContainer);
      }
    }
  }
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el)
    el.value !== undefined
      ? (el.value = value || "")
      : (el.textContent = value || "");
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

// ================================================
// ETAPA ACTUAL
// ================================================
function getEtapaActual() {
  const hoy = new Date();
  for (const e of TRAMITE_ETAPAS_ROBOTICA) {
    if (hoy >= e.inicio && hoy <= e.fin) return e;
  }
  return TRAMITE_ETAPAS_ROBOTICA[0]; // fallback
}

function updateStageLabel() {
  const etapa = getEtapaActual();
  setText("roboticsPrice", `$${etapa.precio}`);
  setText("stageLabel", `${etapa.nombre} activa`);
}

// ================================================
// TOTAL ESTIMADO (PASO 1)
// ================================================
function syncTotal() {
  const blocked = _getBlockedSet();

  // FORZAR desmarcado si la convocatoria está bloqueada
  if (!tramiteShouldResumeAtStep5) {
    if (blocked.congress) {
      const el = document.getElementById("includeCongress");
      if (el) el.checked = false;
      const card =
        document.getElementById("pkgCard_congress") ||
        document.getElementById("pkgCard_congress") ||
        document.getElementById("pkgCongressCard");
      if (card) card.classList.remove("selected", "active", "checked");
    }
    if (blocked.camp) {
      const el = document.getElementById("includeCamp");
      if (el) el.checked = false;
      const card =
        document.getElementById("pkgCard_camp") ||
        document.getElementById("pkgCard_camp") ||
        document.getElementById("pkgCampCard");
      if (card) card.classList.remove("selected", "active", "checked");
    }
  }

  const congress = document.getElementById("includeCongress")?.checked;
  const robotics = document.getElementById("includeRobotics")?.checked;
  const camp = document.getElementById("includeCamp")?.checked;

  const rCount = getRobotCount();
  const etapa = getEtapaActual();

  let total = 0;
  if (congress) total += TRAMITE_PRECIO_CONGRESO;
  if (robotics) total += etapa.precio * Math.max(1, rCount);
  if (camp) total += TRAMITE_PRECIO_CAMPAMENTO;
  // Módulos personalizados
  (tramiteModulosActivos.custom ?? []).forEach((m) => {
    const el = document.getElementById("includeCustom_" + m.key);
    if (el?.checked && m.price > 0) total += m.price;
  });

  setText("packageTotalDisplay", `$${total.toLocaleString("es-MX")} MXN`);

  const hasAny =
    congress ||
    robotics ||
    camp ||
    (tramiteModulosActivos.custom ?? []).some(
      (m) => document.getElementById("includeCustom_" + m.key)?.checked,
    );

  const helper = document.getElementById("pkgHelper");
  if (helper) {
    if (!hasAny) {
      helper.textContent =
        "Selecciona al menos una convocatoria para continuar.";
    } else {
      helper.textContent = "Puedes continuar al siguiente paso.";
    }
  }

  saveDraft();
}

/**
 * Devuelve un objeto {congress, robotics, camp} con true en las que
 * están bloqueadas por una solicitud pendiente.
 *
 * Estados que BLOQUEAN (el usuario ya tiene algo en curso o aprobado):
 *   - awaiting_receipt  → generó solicitud, aún no sube comprobante
 *   - pending           → comprobante subido, esperando revisión admin
 *   - resubmit_requested→ admin pidió cambios, esperando nueva carga
 *   - approved / paid   → ya confirmado — nunca debe pagar de nuevo
 *
 * El único estado que LIBERA el bloqueo es "rejected":
 *   - El admin rechazó — el usuario puede iniciar una nueva solicitud.
 */
function _getBlockedSet() {
  const none = { congress: false, robotics: false, camp: false };
  if (!tramiteExistingRequest) return none;
  const s = String(tramiteExistingRequest.status || "").toLowerCase();
  // rejected libera; todo lo demás bloquea.
  if (s === "rejected") return none;
  return {
    congress: !!tramiteExistingRequest.includes_congress,
    robotics: false, // Robótica NUNCA se bloquea
    camp: !!tramiteExistingRequest.includes_camp,
  };
}

function getRobotCount() {
  return tramiteRobotCounter; // número de robots actualmente en la lista
}

function initPackageListeners() {
  const baseIds = ["includeCongress", "includeRobotics", "includeCamp"];
  const customIds = (tramiteModulosActivos.custom ?? []).map(
    (m) => "includeCustom_" + m.key,
  );
  [...baseIds, ...customIds].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      syncTotal();
      _refreshBlockedStyles();
    });
  });
}

function saveDraft() {
  const draft = {
    congress: document.getElementById("includeCongress")?.checked || false,
    robotics: document.getElementById("includeRobotics")?.checked || false,
    camp: document.getElementById("includeCamp")?.checked || false,
  };
  localStorage.setItem(TRAMITE_PACKAGE_DRAFT_KEY, JSON.stringify(draft));
}

function restorePackageDraft() {
  try {
    const raw = localStorage.getItem(TRAMITE_PACKAGE_DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    setCheck("includeCongress", d.congress);
    setCheck("includeRobotics", d.robotics);
    setCheck("includeCamp", d.camp);
  } catch {}
}

function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el && typeof val === "boolean") el.checked = val;
}

async function loadSavedRequestDraft() {
  if (!tramiteUserSession?.id) {
    return;
  }

  const response = await fetch(
    `${getApiUrl("congress-request-status.php")}?userId=${encodeURIComponent(tramiteUserSession.id)}&_cb=${Date.now()}`,
    {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    },
  );

  const result = await response.json();
  if (
    !response.ok ||
    !result.success ||
    !result.data ||
    !result.data.request_folio
  ) {
    return;
  }

  const data = result.data;

  // Integración para backward compatibility si existen múltiples solicitudes
  if (data.all_requests && data.all_requests.length > 0) {
    const activeReqs = data.all_requests.filter((r) => r.status !== "rejected");
    const statuses = data.all_requests.map((r) => r.status);
    if (statuses.includes("awaiting_receipt")) data.status = "awaiting_receipt";
    else if (statuses.includes("resubmit_requested"))
      data.status = "resubmit_requested";
    else if (statuses.includes("pending")) data.status = "pending";
    else if (statuses.includes("approved") || statuses.includes("paid"))
      data.status = "approved";
    else data.status = "rejected";

    data.includes_congress = activeReqs.some((r) => r.includes_congress);
    data.includes_robotics = activeReqs.some((r) => r.includes_robotics);
    data.includes_camp = activeReqs.some((r) => r.includes_camp);
  }

  const resolvedStatus = String(data.status || "").toLowerCase();

  // Guardar siempre el estado de la solicitud existente para poder
  // verificar bloqueos en el paso 1, incluso si es approved/rejected/awaiting_receipt.
  tramiteExistingRequest = {
    status: resolvedStatus,
    includes_congress: !!data.includes_congress,
    includes_robotics: !!data.includes_robotics,
    includes_camp: !!data.includes_camp,
    request_folio: data.request_folio || "",
    has_receipt: !!data.has_receipt,
  };

  if (tramiteShouldResumeAtStep5) {
    setCheck("includeCongress", !!data.includes_congress);
    setCheck("includeRobotics", !!data.includes_robotics);
    setCheck("includeCamp", !!data.includes_camp);
  } else {
    // JAMÁS auto-seleccionar convocatorias. Siempre iniciar en blanco para evitar bloqueos fantasma
    setCheck("includeCongress", false);
    setCheck("includeRobotics", false);
    setCheck("includeCamp", false);
  }

  const profile = data.profile_snapshot || {};
  const profileName =
    profile.full_name || tramiteUserSession.full_name || "Participante";
  setVal("profileFullName", profileName);
  setVal("profileEmail", profile.email || tramiteUserSession.email || "");
  setVal("profilePhone", profile.phone || tramiteUserSession.phone || "");
  setVal("profileSchool", profile.school || "");
  setVal("profileControlNumber", profile.control_number || "");
  setVal("profileCareer", profile.career || "");
  setVal("profileSemester", profile.semester || "");
  setVal("profileCountry", profile.country || "");
  setVal("profileCity", profile.city || "");
  setVal("member1", profileName);
  setText("captainNameDisplay", profileName);
  setText("captainSchoolDisplay", profile.school || "—");

  const members = Array.isArray(data.members_snapshot)
    ? data.members_snapshot
    : [];
  const m2 = members[0];
  const m3 = members[1];

  let m2Value =
    typeof m2 === "object" ? m2?.name || m2?.member_name || "" : m2 || "";
  let m3Value =
    typeof m3 === "object" ? m3?.name || m3?.member_name || "" : m3 || "";

  // Limpiar basura histórica de caché
  if (String(m2Value).includes("[object")) m2Value = "";
  if (String(m3Value).includes("[object")) m3Value = "";

  setVal("member2", m2Value);
  setVal("member3", m3Value);

  document.getElementById("robotsList").innerHTML = "";
  tramiteRobotCounter = 0;

  // Nunca precargar robots antiguos. Iniciar la ficha en blanco para la nueva compra.
  addInitialRobot();
  // Si estamos resumiendo, cargar robots guardados para no sobrescribir el snapshot al enviar el paso 5.
  if (tramiteShouldResumeAtStep5) {
    const robotsSnapshot = Array.isArray(data.robots_snapshot)
      ? data.robots_snapshot
      : data.robots || [];
    if (robotsSnapshot.length > 0) {
      robotsSnapshot.forEach((r) => {
        addRobot();
        const idx = tramiteRobotCounter;
        const nameEl = document.getElementById(`robotName${idx}`);
        const catEl = document.getElementById(`robotCategory${idx}`);
        if (nameEl) nameEl.value = r.name || r.robot_name || "";
        if (catEl) catEl.value = normalizeRobotCategory(r.category || "");
      });
    } else {
      addInitialRobot();
    }
  } else {
    // Nunca precargar robots antiguos. Iniciar la ficha en blanco para la nueva compra.
    addInitialRobot();
  }

  syncRoboticsSubtotal();
  syncTotal();
  _refreshBlockedStyles();
}

// ================================================
// ESTADO DE SOLICITUD EXISTENTE
// (se llena en loadSavedRequestDraft y se usa para bloqueos)
// ================================================
tramiteExistingRequest = null; // { status, includes_congress, includes_robotics, includes_camp, request_folio }

// ================================================
// PASO 1 → 2  (con validación de convocatorias bloqueadas)
// ================================================
function goToStep(targetStep) {
  // Solo aplicar la verificación cuando se avanza del paso 1 al 2
  if (targetStep === 2 && tramiteCurrentStep === 1) {
    const blocked = getBlockedConvocatorias();
    if (blocked.length > 0) {
      showExistingRequestModal(blocked);
      return;
    }
  }
  showStep(targetStep);
}

/**
 * Devuelve las convocatorias que el usuario seleccionó Y ya tiene
 * en una solicitud pendiente/en revisión que bloquea crear otra.
 * Si el status es 'rejected' no bloquea nada.
 */
function getBlockedConvocatorias() {
  // Devuelve solo las que el usuario MARCÓ y además están bloqueadas,
  // para el mensaje de error al intentar avanzar al paso 2.
  const b = _getBlockedSet();
  const want = {
    congress: document.getElementById("includeCongress")?.checked || false,
    robotics: document.getElementById("includeRobotics")?.checked || false,
    camp: document.getElementById("includeCamp")?.checked || false,
  };
  const blocked = [];
  if (want.congress && b.congress) blocked.push("Congreso Internacional");
  if (want.camp && b.camp) blocked.push("Campamento");
  return blocked;
}

/**
 * Muestra el modal #modalExistingRequest con el detalle de qué
 * convocatorias están bloqueadas y el folio activo.
 */
function showExistingRequestModal(blockedList) {
  const folio = tramiteExistingRequest?.request_folio || "";
  const status = String(
    tramiteExistingRequest?.status || "pending",
  ).toLowerCase();

  const statusLabel =
    {
      awaiting_receipt: "en espera de que subas tu comprobante",
      pending: "en espera de revisión",
      resubmit_requested: "con cambios solicitados por el administrador",
      approved: "ya aprobada y aceptada",
      paid: "ya pagada y confirmada",
    }[status] || "activa";

  // Mensaje adaptado: si ya está aprobado/pagado, el mensaje es más claro
  const isFinalized = status === "approved" || status === "paid";
  const isAwaitingReceipt = status === "awaiting_receipt";
  const names = blockedList.join(", ");
  const plural = blockedList.length > 1;

  const titleEl = document.getElementById("modalExistingTitle");
  const msgEl = document.getElementById("modalExistingMsg");
  const folioEl = document.getElementById("modalExistingFolio");
  const folioWrap = document.getElementById("modalExistingFolioWrap");

  if (titleEl)
    titleEl.textContent = isFinalized
      ? plural
        ? "Convocatorias ya inscritas"
        : "Convocatoria ya inscrita"
      : plural
        ? "Ya tienes solicitudes activas"
        : "Ya tienes una solicitud activa";

  if (msgEl)
    msgEl.innerHTML = isFinalized
      ? `La${plural ? "s" : ""} convocatoria${plural ? "s" : ""} <strong>${names}</strong> ` +
        `${plural ? "están" : "está"} <strong>${statusLabel}</strong>. ` +
        `No puedes volver a pagar por ${plural ? "ellas" : "ella"} — ` +
        `ya ${plural ? "forman parte" : "forma parte"} de tu inscripción confirmada.<br><br>` +
        `Puedes consultar el detalle en <a href="perfil.html?section=inscripciones" style="color:#f2a900; font-weight:700;">tu perfil de inscripciones</a>.`
      : isAwaitingReceipt
        ? `La${plural ? "s" : ""} convocatoria${plural ? "s" : ""} <strong>${names}</strong> ` +
          `ya ${plural ? "tienen" : "tiene"} una solicitud generada y ` +
          `<strong>está esperando que subas tu comprobante de pago</strong>.<br><br>` +
          `No puedes crear una nueva solicitud para ${plural ? "esas convocatorias" : "esa convocatoria"} ` +
          `hasta completar o cancelar la actual. ` +
          `<a href="usuario.html" style="color:#f2a900; font-weight:700;">Ve a Mi solicitud →</a> para subir tu comprobante.`
        : `La${plural ? "s" : ""} convocatoria${plural ? "s" : ""} <strong>${names}</strong> ` +
          `ya ${plural ? "están" : "está"} en una solicitud <strong>${statusLabel}</strong>. ` +
          `No puedes generar una nueva ficha para ${plural ? "esas convocatorias" : "esa convocatoria"} ` +
          `hasta que el administrador la resuelva.<br><br>` +
          `Si deseas agregar una convocatoria <em>diferente</em> que no tengas en espera, ` +
          `desmarca la${plural ? "s" : ""} bloqueada${plural ? "s" : ""} y continúa.`;

  if (folioEl) folioEl.textContent = folio || "—";
  if (folioWrap) folioWrap.classList.toggle("hidden", !folio);

  document.getElementById("modalExistingRequest")?.classList.remove("hidden");

  // Marcar visualmente las tarjetas bloqueadas en el paso 1
  _applyBlockedCardStyles(blockedList);
}

/**
 * Cierra el modal de solicitud existente (llamado desde el HTML).
 * No es función de navegación — solo cierra el aviso.
 */
function closeExistingRequestModal() {
  document.getElementById("modalExistingRequest")?.classList.add("hidden");
}

/**
 * Aplica/retira la clase "pkg-blocked" a las tarjetas cuya convocatoria
 * ya está en una solicitud pendiente, para feedback visual inmediato.
 */
function _applyBlockedCardStyles(blockedList) {
  const map = {
    "Congreso Internacional": "pkgCard_congress",
    "Torneo de Robótica": "pkgCard_robotics",
    Campamento: "pkgCard_camp",
  };

  // Limpiar estilos en todas las tarjetas
  Object.values(map).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("pkg-blocked");
    el.removeAttribute("data-blocked-msg");
  });

  // Mensaje del overlay según el estado actual
  const currentStatus = String(
    tramiteExistingRequest?.status || "",
  ).toLowerCase();
  const isFinalized = currentStatus === "approved" || currentStatus === "paid";
  const isAwaiting = currentStatus === "awaiting_receipt";
  const overlayMsg = isFinalized
    ? "✅ Ya inscrito — no se puede volver a pagar."
    : isAwaiting
      ? "⏳ Solicitud activa — sube tu comprobante en Mi solicitud."
      : "⚠ Solicitud en revisión — espera a que el administrador la resuelva.";

  // Aplicar en las bloqueadas con mensaje explicativo en el overlay
  blockedList.forEach((name) => {
    const id = map[name];
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("pkg-blocked");
    el.setAttribute("data-blocked-msg", overlayMsg);
  });

  // Mostrar/ocultar el notice explicativo encima del total
  const noticeEl = document.getElementById("pkgBlockedNotice");
  const titleEl = document.getElementById("pkgBlockedNoticeTitle");
  const msgEl = document.getElementById("pkgBlockedNoticeMsg");

  if (!noticeEl) return;

  if (blockedList.length === 0) {
    noticeEl.classList.add("hidden");
    return;
  }

  noticeEl.classList.remove("hidden");
  const plural = blockedList.length > 1;
  if (titleEl)
    titleEl.textContent = isFinalized
      ? plural
        ? `${blockedList.length} convocatorias ya inscritas`
        : "Convocatoria ya inscrita"
      : isAwaiting
        ? plural
          ? `${blockedList.length} convocatorias esperando comprobante`
          : "Convocatoria en espera de comprobante"
        : plural
          ? `${blockedList.length} convocatorias con solicitud activa`
          : "Convocatoria con solicitud activa";
  if (msgEl) {
    const names = blockedList.join(" y ");
    msgEl.innerHTML = isFinalized
      ? `<strong>${names}</strong> ${plural ? "están" : "está"} confirmada${plural ? "s" : ""} ` +
        `en tu inscripción. No puedes volver a pagar por ${plural ? "ellas" : "ella"}. ` +
        `<a href="perfil.html?section=inscripciones" style="color:#fbbf24; font-weight:600;">Ver mis inscripciones →</a>`
      : isAwaiting
        ? `<strong>${names}</strong> ${plural ? "tienen" : "tiene"} una solicitud generada ` +
          `<strong>esperando tu comprobante de pago</strong>. No se ${plural ? "incluyen" : "incluye"} ` +
          `en este trámite porque ya ${plural ? "existen" : "existe"} como solicitud activa. ` +
          `<a href="usuario.html" style="color:#fbbf24; font-weight:600;">Sube tu comprobante →</a>`
        : `<strong>${names}</strong> ${plural ? "tienen" : "tiene"} una solicitud ` +
          `en espera de revisión. No se ${plural ? "incluyen" : "incluye"} en el ` +
          `total ya que no puedes pagar por ${plural ? "ellas" : "ella"} de nuevo. ` +
          `Si quieres agregar una convocatoria nueva, deja ${plural ? "esas" : "esa"} ` +
          `marcada${plural ? "s" : ""} y el total solo mostrará lo que sí pagarás ahora.`;
  }
}

/**
 * Cuando el usuario cambia la selección en el paso 1 limpiamos
 * los estilos de bloqueo para que no queden "pegados" si desmarcó.
 * Se llama desde initPackageListeners.
 */
function _refreshBlockedStyles() {
  // Reutiliza _getBlockedSet() — fuente única de verdad sobre qué está bloqueado.
  // Aquí siempre mostramos TODAS las que están bloqueadas en existingRequest,
  // sin importar si el usuario las tiene marcadas o no, para que el feedback
  // visual sea inmediato al cargar la página.
  if (!tramiteExistingRequest) {
    _applyBlockedCardStyles([]);
    return;
  }
  const b = _getBlockedSet();
  const blocked = [];

  if (!tramiteShouldResumeAtStep5) {
    if (b.congress) {
      blocked.push("Congreso Internacional");
      const el = document.getElementById("includeCongress");
      if (el) {
        el.checked = false;
        el.disabled = true;
        const card =
          document.getElementById("pkgCard_congress") ||
          document.getElementById("pkgCongressCard");
        if (card) card.classList.remove("selected", "active", "checked");
      }
    }
    if (b.camp) {
      blocked.push("Campamento");
      const el = document.getElementById("includeCamp");
      if (el) {
        el.checked = false;
        el.disabled = true;
        const card =
          document.getElementById("pkgCard_camp") ||
          document.getElementById("pkgCampCard");
        if (card) card.classList.remove("selected", "active", "checked");
      }
    }
  } else {
    if (b.congress) blocked.push("Congreso Internacional");
    if (b.camp) blocked.push("Campamento");
  }

  _applyBlockedCardStyles(blocked);
  syncTotal();

  // FORZAR DESBLOQUEO ABSOLUTO DE ROBÓTICA
  const elRob = document.getElementById("includeRobotics");
  if (elRob) elRob.disabled = false;
  const cardRob =
    document.getElementById("pkgCard_robotics") ||
    document.getElementById("pkgRoboticsCard");
  if (cardRob) {
    cardRob.classList.remove("pkg-blocked", "disabled", "locked", "blocked");
    cardRob.removeAttribute("data-blocked-msg");
    cardRob.style.opacity = "1";
    cardRob.style.pointerEvents = "auto";
    cardRob.style.filter = "none";
    // Forzar desmarcado si se había quedado pegado visualmente
    const cb = document.getElementById("includeRobotics");
    if (cb && cardRob.classList.contains("selected")) {
      cb.checked = false;
      cardRob.classList.remove("selected", "active", "checked");
    }
  }
}

function handleStep2Next() {
  // Validar campos obligatorios
  const required = [
    "profileFullName",
    "profileEmail",
    "profilePhone",
    "profileSchool",
    "profileCountry",
    "profileCity",
  ];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      toast("Completa todos los campos obligatorios (*)", "error");
      toast(
        "Faltan datos obligatorios (*). Ve a tu Perfil para actualizarlos y regresa.",
        "error",
      );
      el?.focus();
      return;
    }
  }

  // Actualizar capitán en paso 3
  const name = document.getElementById("profileFullName").value.trim();
  const school = document.getElementById("profileSchool").value.trim();
  setVal("member1", name);
  setText("captainNameDisplay", name);
  setText("captainSchoolDisplay", school);

  tramiteIncludesRobotics =
    document.getElementById("includeRobotics")?.checked || false;

  // Si no seleccionó robótica, saltar paso 3
  if (!tramiteIncludesRobotics) {
    showStep(4, { skipRobotics: true });
  } else {
    showStep(3);
  }
}

// ================================================
// PASO 3 — ROBOTS
// ================================================
function addInitialRobot() {
  tramiteRobotCounter = 0;
  document.getElementById("robotsList").innerHTML = "";
  addRobot();
}

function addRobot() {
  tramiteRobotCounter++;
  const idx = tramiteRobotCounter;
  const list = document.getElementById("robotsList");
  if (!list) return;

  const entry = document.createElement("div");
  entry.className = "robot-entry";
  entry.id = `robotEntry${idx}`;

  entry.innerHTML = `
    <div class="robot-entry-header">
      <span class="robot-entry-title"><i class="fas fa-robot"></i> Robot ${idx}</span>
      ${
        idx > 1
          ? `<button type="button" class="btn-remove-robot" onclick="removeRobot(${idx})">
        <i class="fas fa-trash-alt"></i> Eliminar
      </button>`
          : ""
      }
    </div>
    <div class="robot-fields">
      <div class="form-field">
        <label>Nombre del robot *</label>
        <input type="text" id="robotName${idx}" placeholder="Ej. ThunderBot 3000" />
      </div>
      <div class="form-field">
        <label>Categoría *</label>
        <select id="robotCategory${idx}">
          <option value="">-- Elige categoría --</option>
          ${TRAMITE_CATEGORIAS_ROBOT.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>
    </div>
  `;

  list.appendChild(entry);
  syncRoboticsSubtotal();
}

function removeRobot(idx) {
  const el = document.getElementById(`robotEntry${idx}`);
  if (el) {
    el.remove();
    syncRoboticsSubtotal();
  }
}

function removeMember(idx) {
  const input = document.getElementById(`member${idx}`);
  if (input) input.value = "";
}

function syncRoboticsSubtotal() {
  const entries = document.querySelectorAll(".robot-entry");
  const count = entries.length;
  const etapa = getEtapaActual();
  const total = count * etapa.precio;
  setText("roboticsSubtotal", `$${total.toLocaleString("es-MX")} MXN`);
}

function handleStep3Next() {
  // Validar robots
  const entries = document.querySelectorAll(".robot-entry");
  if (entries.length === 0) {
    toast("Agrega al menos un robot para continuar.", "error");
    return;
  }

  for (const entry of entries) {
    const idx = entry.id.replace("robotEntry", "");
    const nameEl = document.getElementById(`robotName${idx}`);
    const catEl = document.getElementById(`robotCategory${idx}`);
    if (!nameEl?.value.trim()) {
      toast(`Escribe el nombre del robot ${idx}.`, "error");
      nameEl?.focus();
      return;
    }
    if (!catEl?.value) {
      toast(`Selecciona la categoría del robot ${idx}.`, "error");
      catEl?.focus();
      return;
    }
  }

  buildSummary();
  showStep(4);
}

// ================================================
// PASO 4 — RESUMEN
// ================================================
function handleStep4Back() {
  if (tramiteIncludesRobotics) {
    showStep(3);
  } else {
    showStep(2);
  }
}

function buildSummary() {
  const blocked = _getBlockedSet();
  const congress =
    document.getElementById("includeCongress")?.checked && !blocked.congress;
  const robotics =
    document.getElementById("includeRobotics")?.checked && !blocked.robotics;
  const camp = document.getElementById("includeCamp")?.checked && !blocked.camp;
  const etapa = getEtapaActual();

  // Mostrar/ocultar cards
  toggleBlock("summaryCongressBlock", congress);
  toggleBlock("summaryRoboticsBlock", robotics);
  toggleBlock("summaryCampBlock", camp);

  let total = 0;
  if (congress) total += TRAMITE_PRECIO_CONGRESO;
  if (camp) total += TRAMITE_PRECIO_CAMPAMENTO;

  if (robotics) {
    const entries = document.querySelectorAll(".robot-entry");
    const count = entries.length;
    const subtotal = count * etapa.precio;
    total += subtotal;

    setText(
      "summaryRoboticsDetail",
      `${count} robot(s) · ${etapa.nombre} · $${etapa.precio} c/u`,
    );
    setText("summaryRoboticsPrice", `$${subtotal.toLocaleString("es-MX")}`);

    // Detalles de robots
    const detailBlock = document.getElementById("summaryRobotDetails");
    if (detailBlock) {
      detailBlock.classList.remove("hidden");
      detailBlock.innerHTML =
        '<strong style="font-size:0.82rem;color:var(--text-muted);display:block;margin-bottom:8px">Robots registrados</strong>';
      entries.forEach((entry, i) => {
        const idx = entry.id.replace("robotEntry", "");
        const name =
          document.getElementById(`robotName${idx}`)?.value || `Robot ${i + 1}`;
        const cat =
          normalizeRobotCategory(
            document.getElementById(`robotCategory${idx}`)?.value,
          ) || "—";
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;justify-content:space-between;font-size:0.85rem;padding:4px 0;border-bottom:1px solid var(--border)";
        row.innerHTML = `<span><i class="fas fa-robot" style="color:var(--yellow);margin-right:6px"></i>${name}</span><span style="color:var(--text-sub)">${cat}</span>`;
        detailBlock.appendChild(row);
      });
    }
  } else {
    document.getElementById("summaryRobotDetails")?.classList.add("hidden");
  }

  setText("summaryTotal", `$${total.toLocaleString("es-MX")} MXN`);

  // Folio provisional basado en iniciales + número de control
  if (!tramiteCurrentFolio) {
    // Fuente de verdad: el campo del DOM que el usuario ya ve y puede corregir.
    // Fallback en cascada: DOM → profile.full_name → tramiteUserSession.full_name
    const profile = tramiteUserSession.profile || {};
    const fullName =
      document.getElementById("profileFullName")?.value?.trim() ||
      profile.full_name ||
      tramiteUserSession.full_name ||
      "";
    // control_number puede estar guardado como "matricula" en el profile (perfil.js lo guarda así)
    const controlNumber =
      document.getElementById("profileControlNumber")?.value?.trim() ||
      profile.control_number ||
      profile.matricula ||
      tramiteUserSession.control_number ||
      "";

    // Iniciales: primera letra de cada palabra del nombre completo (ej: "Juan Carlos Pérez Coronel" → "JCPC")
    const initials = fullName
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/[^A-Za-z\s]/g, "") // eliminar caracteres no letra tras normalizar
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase())
      .join("");

    const base = initials || "XX";
    const ctrl = controlNumber.replace(/\D/g, "").slice(0, 8) || "00000000";
    const baseKey = `${base}-${ctrl}`;

    // Detectar colisión: si en esta sesión del navegador ya se generó el mismo folio base,
    // añadir 2 dígitos aleatorios al final (ej: JCPC-2104013023)
    const prevKey = sessionStorage.getItem("renovatec_folio_prev");
    const savedFolio = sessionStorage.getItem("renovatec_folio_saved");

    // Si ya existe una solicitud en el historial, sincronizamos el folio con el backend
    if (tramiteExistingRequest && tramiteExistingRequest.request_folio) {
      if (tramiteShouldResumeAtStep5) {
        // Estamos resumiendo la solicitud existente, usamos SU folio
        tramiteCurrentFolio = tramiteExistingRequest.request_folio;
      } else {
        // Estamos creando una NUEVA solicitud.
        // Calculamos el sufijo C2, C3...
        const lastFolio = tramiteExistingRequest.request_folio;
        const match = lastFolio.match(/C(\d+)$/);
        const nextCount = match ? parseInt(match[1], 10) + 1 : 2;
        tramiteCurrentFolio = `${baseKey}C${nextCount}`;
      }
    } else {
      // Primera vez, sin historial. Aplicar prevención de colisiones locales
      if (savedFolio && prevKey === baseKey) {
        tramiteCurrentFolio = savedFolio;
      } else if (prevKey && prevKey !== baseKey) {
        const suffix = Math.floor(Math.random() * 90 + 10);
        tramiteCurrentFolio = `${baseKey}-${suffix}`;
        sessionStorage.setItem("renovatec_folio_prev", baseKey);
        sessionStorage.setItem("renovatec_folio_saved", tramiteCurrentFolio);
      } else {
        tramiteCurrentFolio = baseKey;
        sessionStorage.setItem("renovatec_folio_prev", baseKey);
        sessionStorage.setItem("renovatec_folio_saved", tramiteCurrentFolio);
      }
    }
  }
  setText("summaryFolio", tramiteCurrentFolio);

  // Actualizar paso 5 — nuevos IDs
  setText("receiptFolioDisplay", tramiteCurrentFolio);
  setText("receiptTotalDisplay", `$${total.toLocaleString("es-MX")} MXN`);
  setText("step5TotalDisplay", `$${total.toLocaleString("es-MX")} MXN`);
  setText("step5FolioText", tramiteCurrentFolio);
  setText("step5FolioInline", tramiteCurrentFolio);

  // QR en resumen (paso 4)
  const clabeStr = window.tramiteBankSettings
    ? window.tramiteBankSettings.bank_clabe
    : "722969040860863730";
  const qrData = encodeURIComponent(
    `FOLIO:${tramiteCurrentFolio}|TOTAL:${total}|CLABE:${clabeStr}`,
  );
  const qrImg = document.getElementById("wizardSummaryQr");
  if (qrImg && tramiteCurrentFolio) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&bgcolor=ffffff&color=0c1222`;
  }

  // QR en paso 5
  const step5Qr = document.getElementById("step5QrImg");
  if (step5Qr) {
    step5Qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}&bgcolor=ffffff&color=0c1222`;
  }

  // Guardar total para PDF
  window._summaryTotal = total;
  window._summaryData = { congress, robotics, camp, total, etapa };
}

function toggleBlock(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("hidden", !show);
}

// ================================================
// GENERACIÓN DE PDF — PASO 5
// Comprobante profesional tipo referencia bancaria
// ================================================
async function downloadSummaryPDF() {
  const btn = document.getElementById("btnDownloadPDF");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
  }

  try {
    const { jsPDF } = window.jspdf;

    // ── Datos del formulario ──────────────────────────────────────────
    const blocked = _getBlockedSet();
    const congress =
      document.getElementById("includeCongress")?.checked && !blocked.congress;
    const robotics =
      document.getElementById("includeRobotics")?.checked && !blocked.robotics;
    const camp =
      document.getElementById("includeCamp")?.checked && !blocked.camp;
    const etapa = getEtapaActual();
    const total = window._summaryTotal || 0;
    const folio = tramiteCurrentFolio || "—";
    const nombre =
      document.getElementById("profileFullName")?.value?.trim() || "—";
    const correo =
      document.getElementById("profileEmail")?.value?.trim() || "—";
    const telefono =
      document.getElementById("profilePhone")?.value?.trim() || "—";
    const escuela =
      document.getElementById("profileSchool")?.value?.trim() || "—";
    const carrera =
      document.getElementById("profileCareer")?.value?.trim() || "—";
    const semestre =
      document.getElementById("profileSemester")?.value?.trim() || "—";
    const matricula =
      document.getElementById("profileControlNumber")?.value?.trim() || "—";
    const ciudad = document.getElementById("profileCity")?.value?.trim() || "—";
    const pais =
      document.getElementById("profileCountry")?.value?.trim() || "—";

    // Robots y equipo
    const robotEntries = document.querySelectorAll(".robot-entry");
    const robotsData = [];
    robotEntries.forEach((entry) => {
      const idx = entry.id.replace("robotEntry", "");
      robotsData.push({
        name:
          document.getElementById(`robotName${idx}`)?.value?.trim() ||
          `Robot ${idx}`,
        cat: document.getElementById(`robotCategory${idx}`)?.value || "—",
      });
    });
    const miembro2 = document.getElementById("member2")?.value?.trim() || "";
    const miembro3 = document.getElementById("member3")?.value?.trim() || "";
    const teamMembers = [nombre, miembro2, miembro3].filter(Boolean);

    // Conceptos / líneas de detalle
    const conceptos = [];
    if (congress)
      conceptos.push({
        clave: "01",
        concepto: "Congreso Internacional RENOVATEC 2026",
        detalle: "Acceso completo · 1 persona",
        importe: TRAMITE_PRECIO_CONGRESO,
      });
    if (robotics)
      conceptos.push({
        clave: "02",
        concepto: `Torneo de Robótica (${etapa.nombre})`,
        detalle: `${robotsData.length} robot(s) · $${etapa.precio} c/u`,
        importe: robotsData.length * etapa.precio,
      });
    if (camp)
      conceptos.push({
        clave: "03",
        concepto: "Campamento RENOVATEC",
        detalle: "Alojamiento + alimentación",
        importe: TRAMITE_PRECIO_CAMPAMENTO,
      });

    // ── Precargar QR ──────────────────────────────────────────────────
    const clabeStr = window.tramiteBankSettings
      ? window.tramiteBankSettings.bank_clabe
      : "722969040860863730";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`RENOVATEC2026|FOLIO:${folio}|TOTAL:${total}|CLABE:${clabeStr}`)}&bgcolor=ffffff&color=000000&margin=4`;
    let qrBase64 = null;
    try {
      qrBase64 = await loadImageAsBase64(qrUrl);
    } catch {
      /* sin QR */
    }

    // ── Precargar logos ───────────────────────────────────────────────
    const logoDefs = [
      { src: "assets/images/tec.png", ext: "PNG" },
      { src: "assets/images/electro.png", ext: "PNG" },
      { src: "assets/images/robot-clean-v2.png", ext: "PNG" },
      { src: "assets/images/IEEE.jpeg", ext: "JPEG" },
    ];
    const logoImgs = await Promise.all(
      logoDefs.map(async (l) => {
        try {
          return { b64: await loadImageAsBase64(l.src), ext: l.ext };
        } catch {
          return null;
        }
      }),
    );

    // ── Crear documento A4 ────────────────────────────────────────────
    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const W = 210;
    const H = 297;
    const ML = 15;
    const MR = 15;
    const CW = W - ML - MR;

    // ── Paleta institucional ──────────────────────────────────────────
    const AZUL_OSCURO = [0, 47, 108];
    const AZUL_MED = [0, 82, 163];
    const AZUL_CLARO = [220, 232, 246];
    const GRIS_LINEA = [200, 207, 218];
    const GRIS_TEXTO = [90, 100, 115];
    const NEGRO = [30, 30, 30];
    const BLANCO = [255, 255, 255];
    const AMARILLO_BG = [255, 250, 220];
    const AMARILLO_BD = [200, 170, 0];
    const VERDE_ACC = [22, 163, 74];

    // ── Helpers ───────────────────────────────────────────────────────
    const setFill = (rgb) => doc.setFillColor(...rgb);
    const setDraw = (rgb) => doc.setDrawColor(...rgb);
    const setColor = (rgb) => doc.setTextColor(...rgb);
    const lw = (n) => doc.setLineWidth(n);

    function hline(x1, y, x2, color = GRIS_LINEA, width = 0.25) {
      lw(width);
      setDraw(color);
      doc.line(x1, y, x2, y);
    }
    function vline(x, y1, y2, color = GRIS_LINEA, width = 0.25) {
      lw(width);
      setDraw(color);
      doc.line(x, y1, x, y2);
    }
    function filledRect(x, y, w, h, fill, stroke = null, sw = 0.25) {
      setFill(fill);
      doc.rect(x, y, w, h, "F");
      if (stroke) {
        lw(sw);
        setDraw(stroke);
        doc.rect(x, y, w, h, "S");
      }
    }
    function labelValue(
      lbl,
      val,
      x,
      y,
      valSize = 9,
      valColor = NEGRO,
      maxW = 80,
    ) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setColor(GRIS_TEXTO);
      doc.text(lbl, x, y);
      doc.setFontSize(valSize);
      doc.setFont("helvetica", "bold");
      setColor(valColor);
      doc.text(String(val).substring(0, 50), x, y + 4.8, { maxWidth: maxW });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FONDO BLANCO
    // ═══════════════════════════════════════════════════════════════════
    filledRect(0, 0, W, H, BLANCO);

    // ═══════════════════════════════════════════════════════════════════
    //  FRANJA SUPERIOR AZUL (encabezado con logos)
    // ═══════════════════════════════════════════════════════════════════
    filledRect(0, 0, W, 28, AZUL_OSCURO);

    // Logos alineados a la izquierda dentro de la franja
    const logoH = 14;
    const logoGap = 4;
    let lx = ML;
    const logoY = (28 - logoH) / 2;
    logoImgs.forEach((l) => {
      if (l) {
        doc.addImage(l.b64, l.ext, lx, logoY, logoH, logoH, undefined, "FAST");
        lx += logoH + logoGap;
      }
    });

    // Nombre del evento y subtítulo (derecha de la franja)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    setColor(BLANCO);
    doc.text("RENOVATEC 2026", W - MR, 11, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor([180, 210, 245]);
    doc.text("Comprobante de Inscripción", W - MR, 18, { align: "right" });
    doc.text("Instituto Tecnológico Superior de Uruapan · IEEE", W - MR, 24, {
      align: "right",
    });

    // ═══════════════════════════════════════════════════════════════════
    //  BANDA DE FOLIO / FECHAS
    // ═══════════════════════════════════════════════════════════════════
    filledRect(0, 28, W, 16, AZUL_CLARO);
    hline(0, 28, W, AZUL_MED, 0.5);
    hline(0, 44, W, GRIS_LINEA, 0.3);

    // Folio (izquierda)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(AZUL_OSCURO);
    doc.text("Folio:", ML, 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setColor(AZUL_MED);
    doc.text(folio, ML + 11, 35);

    // Fechas (centro)
    const hoy = new Date();
    const fechaEmision = hoy.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const limPago = new Date(hoy);
    limPago.setDate(limPago.getDate() + 7);
    const fechaLimite = limPago.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(GRIS_TEXTO);
    doc.text(`Fecha de emisión: ${fechaEmision}`, W / 2, 33, {
      align: "center",
    });
    doc.text(`Fecha límite de pago: ${fechaLimite}`, W / 2, 38.5, {
      align: "center",
    });

    // Badge PENDIENTE DE PAGO (derecha)
    filledRect(W - MR - 54, 30, 54, 10, AMARILLO_BG, AMARILLO_BD, 0.4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor([130, 100, 0]);
    doc.text("PENDIENTE DE PAGO", W - MR - 27, 37, { align: "center" });

    // ═══════════════════════════════════════════════════════════════════
    //  SECCIÓN: DATOS DEL PARTICIPANTE
    // ═══════════════════════════════════════════════════════════════════
    let y = 50;

    filledRect(ML, y, CW, 6, AZUL_MED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(BLANCO);
    doc.text("DATOS DEL PARTICIPANTE", ML + 3, y + 4.3);
    y += 6;

    filledRect(ML, y, CW, 38, [248, 250, 253], GRIS_LINEA, 0.3);

    const c1x = ML + 5,
      c2x = ML + CW / 2 + 5;
    labelValue("Número de control", matricula, c1x, y + 7, 9, NEGRO, 80);
    labelValue("Nombre completo", nombre, c2x, y + 7, 9, NEGRO, 82);
    labelValue("Correo electrónico", correo, c1x, y + 21, 8.5, NEGRO, 80);
    labelValue("Teléfono", telefono, c2x, y + 21, 9, NEGRO, 80);
    labelValue("Carrera", carrera, c1x, y + 33, 8.5, NEGRO, 82);
    labelValue("Semestre", semestre, c2x, y + 33, 9, NEGRO, 30);

    hline(ML + 5, y + 14, ML + CW - 5, GRIS_LINEA);
    hline(ML + 5, y + 27, ML + CW - 5, GRIS_LINEA);
    vline(ML + CW / 2, y + 5, y + 38, GRIS_LINEA);
    y += 42;

    // Segunda fila: escuela + ciudad/país
    filledRect(ML, y, CW, 14, [248, 250, 253], GRIS_LINEA, 0.3);
    labelValue("Institución", escuela, c1x, y + 4, 8.5, NEGRO, 82);
    labelValue("Procedencia", `${ciudad}, ${pais}`, c2x, y + 4, 8.5, NEGRO, 80);
    vline(ML + CW / 2, y + 2, y + 14, GRIS_LINEA);
    y += 17;

    // ═══════════════════════════════════════════════════════════════════
    //  SECCIÓN: CONCEPTOS (tabla institucional)
    // ═══════════════════════════════════════════════════════════════════
    y += 3;
    filledRect(ML, y, CW, 6, AZUL_MED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(BLANCO);
    doc.text("CONCEPTOS", ML + 3, y + 4.3);
    y += 6;

    // Cabecera de tabla
    const colClave = ML;
    const colConc = ML + 16;
    const colDet = ML + 112;
    const colImport = ML + CW;
    const rowH = 6.5;

    filledRect(ML, y, CW, rowH, [235, 241, 250]);
    hline(ML, y, ML + CW, GRIS_LINEA, 0.25);
    hline(ML, y + rowH, ML + CW, GRIS_LINEA, 0.25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(AZUL_OSCURO);
    doc.text("Clave", colClave + 3, y + 4.2);
    doc.text("Concepto", colConc + 2, y + 4.2);
    doc.text("Detalle", colDet + 2, y + 4.2);
    doc.text("Importe", colImport - 2, y + 4.2, { align: "right" });
    y += rowH;

    // Filas
    conceptos.forEach((c, i) => {
      const bg = i % 2 === 0 ? BLANCO : [246, 248, 252];
      filledRect(ML, y, CW, rowH, bg);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(NEGRO);
      doc.text(c.clave, colClave + 3, y + 4.3);
      doc.text(c.concepto.substring(0, 40), colConc + 2, y + 4.3);
      doc.text(c.detalle.substring(0, 28), colDet + 2, y + 4.3);
      doc.setFont("helvetica", "bold");
      doc.text(
        `$${c.importe.toLocaleString("es-MX")}`,
        colImport - 2,
        y + 4.3,
        { align: "right" },
      );
      hline(ML, y + rowH, ML + CW, GRIS_LINEA, 0.2);
      y += rowH;
    });

    // Fila TOTAL
    filledRect(ML, y, CW, 9, AZUL_OSCURO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    setColor(BLANCO);
    doc.text("TOTAL", colConc + 2, y + 6);
    doc.setFontSize(11);
    doc.text(`$${total.toLocaleString("es-MX")} MXN`, colImport - 2, y + 6.3, {
      align: "right",
    });
    y += 12;

    // ═══════════════════════════════════════════════════════════════════
    //  DETALLE ROBÓTICA (si aplica)
    // ═══════════════════════════════════════════════════════════════════
    if (robotics && robotsData.length > 0) {
      y += 4;
      filledRect(ML, y, CW, 6, [210, 140, 0]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setColor(BLANCO);
      doc.text("DETALLE DE ROBÓTICA Y EQUIPO", ML + 3, y + 4.3);
      y += 6;

      const halfW = (CW - 6) / 2;

      // Sub-tabla robots
      filledRect(ML, y, halfW, 6, [245, 240, 220]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      setColor([130, 90, 0]);
      doc.text("Robot", ML + 3, y + 4.2);
      doc.text("Categoría", ML + halfW - 2, y + 4.2, { align: "right" });
      hline(ML, y + 6, ML + halfW, GRIS_LINEA, 0.25);
      let ry = y + 6;
      robotsData.forEach((r, i) => {
        const rb = i % 2 === 0 ? BLANCO : [250, 250, 248];
        filledRect(ML, ry, halfW, 6, rb);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setColor(NEGRO);
        doc.text(`${i + 1}. ${r.name.substring(0, 22)}`, ML + 3, ry + 4.2);
        doc.setFont("helvetica", "bold");
        setColor([130, 90, 0]);
        doc.text(r.cat.substring(0, 22), ML + halfW - 2, ry + 4.2, {
          align: "right",
        });
        hline(ML, ry + 6, ML + halfW, GRIS_LINEA, 0.2);
        ry += 6;
      });

      // Sub-tabla integrantes
      const ex = ML + halfW + 6;
      filledRect(ex, y, halfW, 6, [220, 240, 225]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      setColor([20, 100, 40]);
      doc.text("Integrante", ex + 3, y + 4.2);
      doc.text("Rol", ex + halfW - 2, y + 4.2, { align: "right" });
      hline(ex, y + 6, ex + halfW, GRIS_LINEA, 0.25);
      let my = y + 6;
      teamMembers.forEach((m, i) => {
        const mb = i % 2 === 0 ? BLANCO : [248, 252, 249];
        filledRect(ex, my, halfW, 6, mb);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setColor(NEGRO);
        doc.text(m.substring(0, 28), ex + 3, my + 4.2);
        doc.setFont("helvetica", "bold");
        setColor([20, 100, 40]);
        doc.text(i === 0 ? "Capitán" : "Integrante", ex + halfW - 2, my + 4.2, {
          align: "right",
        });
        hline(ex, my + 6, ex + halfW, GRIS_LINEA, 0.2);
        my += 6;
      });

      lw(0.3);
      setDraw(GRIS_LINEA);
      doc.rect(ML, y, halfW, ry - y, "S");
      doc.rect(ex, y, halfW, my - y, "S");
      y = Math.max(ry, my) + 6;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DATOS BANCARIOS + QR
    // ═══════════════════════════════════════════════════════════════════
    if (H - 20 - y < 72) {
      doc.addPage();
      filledRect(0, 0, W, H, BLANCO);
      filledRect(0, 0, W, 8, AZUL_OSCURO);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setColor(BLANCO);
      doc.text(`RENOVATEC 2026 · Folio: ${folio}`, ML, 5.5);
      y = 14;
    } else {
      y += 4;
    }

    filledRect(ML, y, CW, 6, AZUL_MED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(BLANCO);
    doc.text("DATOS PARA TRANSFERENCIA / DEPÓSITO", ML + 3, y + 4.3);
    y += 6;

    const bankW = 118;
    const qrColW = CW - bankW - 4;
    const bankCardH = 58;

    filledRect(ML, y, bankW, bankCardH, [248, 251, 255], GRIS_LINEA, 0.3);
    filledRect(
      ML + bankW + 4,
      y,
      qrColW,
      bankCardH,
      [248, 251, 255],
      GRIS_LINEA,
      0.3,
    );
    filledRect(ML, y, 3, bankCardH, VERDE_ACC);

    const bankRows = [
      {
        label: "Beneficiario",
        value: window.tramiteBankSettings
          ? window.tramiteBankSettings.bank_beneficiary
          : "Jimena Morelos Valladares",
        color: NEGRO,
      },
      {
        label: "Institución / Banco",
        value: window.tramiteBankSettings
          ? window.tramiteBankSettings.bank_name
          : "Mercado Pago",
        color: NEGRO,
      },
      {
        label: "CLABE Interbancaria",
        value: window.tramiteBankSettings
          ? window.tramiteBankSettings.bank_clabe
          : "722969040860863730",
        color: AZUL_MED,
      },
      {
        label: "Número de tarjeta",
        value: window.tramiteBankSettings
          ? window.tramiteBankSettings.bank_card_number
          : "5428 7851 0720 9107",
        color: AZUL_MED,
      },
      { label: "Referencia de pago", value: folio, color: [180, 100, 0] },
    ];

    bankRows.forEach(({ label, value, color }, i) => {
      const by = y + 7 + i * 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(GRIS_TEXTO);
      doc.text(label, ML + 7, by);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(color);
      doc.text(value, ML + 7, by + 5);
      if (i < bankRows.length - 1)
        hline(ML + 6, by + 7.5, ML + bankW - 4, GRIS_LINEA, 0.2);
    });

    // QR
    const qrX = ML + bankW + 4;
    const qrMM = qrColW - 6;
    const qrImgX = qrX + (qrColW - qrMM) / 2;
    const qrImgY = y + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(AZUL_OSCURO);
    doc.text("Escanea para verificar", qrX + qrColW / 2, y + 6, {
      align: "center",
    });
    if (qrBase64) {
      filledRect(qrImgX - 1, qrImgY - 1, qrMM + 2, qrMM + 2, BLANCO);
      doc.addImage(qrBase64, "PNG", qrImgX, qrImgY, qrMM, qrMM);
    } else {
      filledRect(qrImgX, qrImgY, qrMM, qrMM, [230, 235, 240]);
      doc.setFontSize(7);
      setColor(GRIS_TEXTO);
      doc.text("QR no disponible", qrX + qrColW / 2, y + bankCardH / 2, {
        align: "center",
      });
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setColor(GRIS_TEXTO);
    doc.text(folio, qrX + qrColW / 2, y + bankCardH - 3, { align: "center" });

    y += bankCardH + 5;

    // ═══════════════════════════════════════════════════════════════════
    //  INSTRUCCIONES DE PAGO (estilo aviso institucional)
    // ═══════════════════════════════════════════════════════════════════
    filledRect(ML, y, CW, 36, AMARILLO_BG, AMARILLO_BD, 0.35);
    filledRect(ML, y, 3, 36, AMARILLO_BD);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setColor([100, 70, 0]);
    doc.text("Opciones para realizar el pago:", ML + 7, y + 7);

    const pasos = [
      "1.  Realiza la transferencia bancaria a la CLABE o número de tarjeta indicados arriba.",
      "     Anota tu Folio como referencia de pago.",
      "2.  Guarda el comprobante de transferencia (captura de pantalla o PDF de tu banco).",
      "3.  Inicia sesión en el sistema con tus credenciales de acceso.",
      "4.  Dirígete a Mi Perfil → Mis Inscripciones y sube el comprobante.",
      '     También puedes usar el botón "Editar solicitud" para adjuntarlo.',
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor([80, 55, 0]);
    pasos.forEach((p, i) => {
      doc.text(p, ML + 7, y + 14 + i * 4.5);
    });

    y += 40;

    // ═══════════════════════════════════════════════════════════════════
    //  PIE DE PÁGINA
    // ═══════════════════════════════════════════════════════════════════
    filledRect(0, H - 14, W, 14, AZUL_OSCURO);
    hline(0, H - 14, W, AZUL_MED, 0.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor([180, 210, 245]);
    doc.text(
      "RENOVATEC 2026 · Instituto Tecnológico Superior de Uruapan · Capítulo Estudiantil IEEE · Ingeniería Electrónica",
      W / 2,
      H - 8.5,
      { align: "center" },
    );
    doc.setFontSize(6.5);
    setColor([140, 175, 220]);
    doc.text(
      `Documento generado el ${new Date().toLocaleString("es-MX")} · Folio: ${folio}`,
      W / 2,
      H - 4.5,
      { align: "center" },
    );

    // ── Guardar ───────────────────────────────────────────────────────
    doc.save(`RENOVATEC2026_${folio}.pdf`);
    toast("PDF generado correctamente.", "success");
  } catch (err) {
    console.error("Error generando PDF:", err);
    toast("No se pudo generar el PDF. Intenta de nuevo.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-download"></i> Descargar PDF';
    }
  }
}

function drawPdfPkgRow(
  doc,
  x,
  y,
  title,
  subtitle,
  price,
  titleColor,
  textColor,
  subColor,
) {
  // Mantenida por compatibilidad
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...titleColor);
  doc.text(title, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...subColor);
  doc.text(subtitle, x + 4, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text(price, 210 - 16, y, { align: "right" });
}

async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    const timeout = setTimeout(() => reject(new Error("timeout")), 8000);
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => {
      clearTimeout(timeout);
      reject(e);
    };
    // Forzar recarga sin caché para CORS
    img.src = url + (url.includes("?") ? "&" : "?") + "_t=" + Date.now();
  });
}

// ================================================
// PASO 5 — COMPROBANTE
// ================================================
function initDropZone() {
  const zone = document.getElementById("receiptDropZone");
  if (!zone) return;

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = document.getElementById("receiptFile");
      if (input) {
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
        } catch (err) {
          input.files = e.dataTransfer.files;
        }
      }
      if (processReceiptFile(file) === false && input) {
        input.value = "";
      }
    }
  });
}

function handleReceiptFile(input) {
  const file = input.files?.[0];
  if (file) {
    if (processReceiptFile(file) === false) {
      input.value = "";
    }
  }
}

function processReceiptFile(file) {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png"];
  const fileName = String(file.name || "").toLowerCase();
  const hasValidExt = allowedExts.some((ext) => fileName.endsWith(ext));

  if (!allowedTypes.includes(file.type) && !hasValidExt) {
    toast("Solo se aceptan PDF, JPG o PNG.", "error");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast("El archivo no debe superar 5MB.", "error");
    return false;
  }

  const preview = document.getElementById("receiptFilePreview");
  const zone = document.getElementById("receiptDropZone");
  const icon = document.getElementById("receiptUploadIcon");
  const title = document.getElementById("receiptUploadTitle");
  const name = document.getElementById("receiptFileName");

  if (name) name.textContent = file.name;
  if (preview) preview.classList.remove("hidden");
  if (icon) icon.style.display = "none";
  if (title) title.textContent = "¡Archivo listo!";
  if (zone) zone.classList.add("has-file");

  // Mostrar aviso de estado
  const statusEl = document.getElementById("step5UploadStatus");
  if (statusEl) statusEl.classList.remove("hidden");

  return true;
}

function removeReceiptFile(event) {
  event.stopPropagation();
  const input = document.getElementById("receiptFile");
  const preview = document.getElementById("receiptFilePreview");
  const zone = document.getElementById("receiptDropZone");
  const icon = document.getElementById("receiptUploadIcon");
  const title = document.getElementById("receiptUploadTitle");

  if (input) input.value = "";
  if (preview) preview.classList.add("hidden");
  if (zone) zone.classList.remove("has-file");
  if (icon) icon.style.display = "";
  if (title) title.textContent = "Haz clic o arrastra tu comprobante aquí";

  const statusEl = document.getElementById("step5UploadStatus");
  if (statusEl) statusEl.classList.add("hidden");
}

async function handleSaveWithoutReceipt() {
  const result = await submitRequest({ withReceipt: false });
  if (!result) return;

  if (result.request_folio) tramiteCurrentFolio = result.request_folio;
  // Pagar después guarda como "Pendiente de pago" NO como éxito final
  // El usuario debe volver para subir el comprobante
  showSuccessStep(false);
}

async function handleSubmitWithReceipt() {
  const file = document.getElementById("receiptFile")?.files?.[0];
  if (!file) {
    toast("Adjunta tu comprobante de pago.", "error");
    return;
  }

  const result = await submitRequest({ withReceipt: true });
  if (!result) return;

  if (result.request_folio) tramiteCurrentFolio = result.request_folio;
  showSuccessStep(true);
}

async function submitRequest({ withReceipt = false } = {}) {
  const btn = withReceipt
    ? document.getElementById("btnSubmitWithReceipt")
    : document.getElementById("btnSaveWithoutReceipt");

  const originalText = btn?.innerHTML || "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  }

  const blocked = _getBlockedSet();
  const congress =
    document.getElementById("includeCongress")?.checked && !blocked.congress;
  const robotics =
    document.getElementById("includeRobotics")?.checked && !blocked.robotics;
  const camp = document.getElementById("includeCamp")?.checked && !blocked.camp;

  const profile = {
    full_name: document.getElementById("profileFullName")?.value?.trim(),
    email: document.getElementById("profileEmail")?.value?.trim(),
    phone: document.getElementById("profilePhone")?.value?.trim(),
    school: document.getElementById("profileSchool")?.value?.trim(),
    control_number: document
      .getElementById("profileControlNumber")
      ?.value?.trim(),
    career: document.getElementById("profileCareer")?.value?.trim(),
    semester: document.getElementById("profileSemester")?.value?.trim(),
    country: document.getElementById("profileCountry")?.value?.trim(),
    city: document.getElementById("profileCity")?.value?.trim(),
  };

  const robots = [];
  document.querySelectorAll(".robot-entry").forEach((entry) => {
    const idx = entry.id.replace("robotEntry", "");
    robots.push({
      name: document.getElementById(`robotName${idx}`)?.value?.trim(),
      category: normalizeRobotCategory(
        document.getElementById(`robotCategory${idx}`)?.value,
      ),
    });
  });

  const members = [
    document.getElementById("member2")?.value?.trim(),
    document.getElementById("member3")?.value?.trim(),
  ].filter(Boolean);

  const formData = new FormData();
  formData.append(
    "userId",
    tramiteUserSession?.id || tramiteUserSession?.userId || 0,
  );
  formData.append("includes_congress", String(congress));
  formData.append("includes_robotics", String(robotics));
  formData.append("includes_camp", String(camp));
  formData.append("robot_count", String(robots.length));
  formData.append("skip_receipt", String(!withReceipt));
  formData.append("is_resume", tramiteShouldResumeAtStep5 ? "true" : "false");
  formData.append("country", profile.country || "");
  formData.append("city", profile.city || "");
  formData.append("school", profile.school || "");
  formData.append("matricula", profile.control_number || "");
  formData.append("profile", JSON.stringify(profile));
  formData.append("robots", JSON.stringify(robots));
  formData.append("members", JSON.stringify(members));

  if (withReceipt) {
    const file = document.getElementById("receiptFile")?.files?.[0];
    if (file) formData.append("receipt", file);
  }

  try {
    const res = await fetch(getApiUrl("congress-enroll.php"), {
      method: "POST",
      headers: { Authorization: `Bearer ${tramiteUserSession?.token || ""}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.error || "Error al guardar");

    if (data.data?.request_folio) tramiteCurrentFolio = data.data.request_folio;
    return data.data || data;
  } catch (err) {
    const msg =
      err.message ||
      "No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.";
    toast(msg, "error");
    console.error("Error en submitRequest:", err);
    return null;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

function showSuccessStep(withReceipt) {
  const badge = document.getElementById("successStatusBadge");
  const message = document.getElementById("successMessage");
  const note = document.getElementById("successNote");
  const warning = document.getElementById("successWarning");
  const title = document.getElementById("successTitle");
  const circle = document.getElementById("successCircle");
  const circleIcon = document.getElementById("successCircleIcon");
  const primaryBtn = document.getElementById("successPrimaryBtn");
  const secondaryBtn = document.getElementById("successSecondaryBtn");

  if (withReceipt) {
    if (title) title.textContent = "¡Solicitud enviada!";
    if (circle) {
      circle.style.background = "";
      circle.style.borderColor = "";
      circle.style.color = "";
    }
    if (circleIcon) circleIcon.className = "fas fa-check";
    if (badge) {
      badge.innerHTML =
        '<i class="fas fa-hourglass-half"></i> Pendiente de revisión';
      badge.style.background = "";
      badge.style.color = "";
    }
    if (message)
      message.innerHTML =
        "Tu trámite ha sido registrado exitosamente. El equipo de RENOVATEC revisará tu información y comprobante.";
    if (note)
      note.innerHTML =
        "Puedes revisar el estado en cualquier momento desde <strong>Mis Solicitudes</strong>.";
    if (warning) warning.style.display = "none";
    if (primaryBtn) primaryBtn.style.display = "none";
    if (secondaryBtn) {
      secondaryBtn.style.display = "";
      secondaryBtn.innerHTML = '<i class="fas fa-home"></i> Volver al panel';
      secondaryBtn.href = "/usuario";
    }
  } else {
    if (title) title.textContent = "Solicitud guardada";
    if (circle) {
      circle.style.background = "rgba(249,115,22,0.15)";
      circle.style.borderColor = "#f97316";
      circle.style.color = "#f97316";
    }
    if (circleIcon) circleIcon.className = "fas fa-clock";
    if (badge) {
      badge.innerHTML = '<i class="fas fa-clock"></i> Pendiente de pago';
      badge.style.background = "rgba(249,115,22,0.12)";
      badge.style.color = "#f97316";
    }
    if (message)
      message.innerHTML =
        "Tu solicitud quedó guardada con el folio de abajo. <strong>Aún no has subido tu comprobante de pago</strong>, por lo que tu inscripción no está completa.";
    if (note)
      note.innerHTML =
        "Cuando realices el pago, ve a <strong>Mis Solicitudes</strong> y sube tu comprobante para completar tu inscripción.";
    if (warning) warning.style.display = "flex";
    if (primaryBtn) {
      primaryBtn.style.display = "";
      primaryBtn.innerHTML =
        '<i class="fas fa-upload"></i> Ir a Mis Solicitudes';
      primaryBtn.href = "/perfil?section=inscripciones&_cb=" + Date.now();
    }
    if (secondaryBtn) {
      secondaryBtn.style.display = "";
      secondaryBtn.innerHTML = '<i class="fas fa-home"></i> Volver al panel';
      secondaryBtn.href = "/usuario";
    }
  }

  setText("successFolio", tramiteCurrentFolio);
  showStep("success");
  localStorage.removeItem(TRAMITE_PACKAGE_DRAFT_KEY);
}

// ================================================
// NAVEGACIÓN DE PASOS
// ================================================
function updateTotalSteps() {
  const hasRobotics = document.getElementById("includeRobotics")?.checked;
  const total = hasRobotics ? 5 : 4; // simplificado; siempre mostramos 5 en UI
  document
    .querySelectorAll(".totalSteps")
    .forEach((el) => (el.textContent = "5"));
}

function showStep(step, options = {}) {
  const isSuccess = step === "success";
  const stepId = isSuccess ? "stepSuccess" : `step${step}`;

  // Ocultar todos
  document
    .querySelectorAll(".tramite-step")
    .forEach((s) => s.classList.remove("active"));

  // Mostrar target
  const target = document.getElementById(stepId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!isSuccess) {
    tramiteCurrentStep = Number(step);
    updateProgressBar(tramiteCurrentStep);
  } else {
    updateProgressBar(6); // todos completados
  }

  speakInstructions(step);
}

function updateProgressBar(step) {
  // Fill track
  const fills = { 1: "10%", 2: "30%", 3: "50%", 4: "70%", 5: "90%", 6: "100%" };
  const fill = document.getElementById("progressFill");
  if (fill) fill.style.width = fills[step] || "100%";

  // Steps
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`wstep${i}`);
    if (!el) continue;
    el.classList.remove("active", "completed");
    if (i < step) el.classList.add("completed");
    else if (i === step) el.classList.add("active");
  }
}

let voiceEnabled = true;

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const btn = document.getElementById("voiceToggleBtn");
  if (btn) {
    if (voiceEnabled) {
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      btn.style.color = "#60a5fa";
      btn.style.borderColor = "#3b82f6";
      speakInstructions(tramiteCurrentStep);
    } else {
      btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      btn.style.color = "#94a3b8";
      btn.style.borderColor = "#64748b";
      window.speechSynthesis.cancel();
    }
  }
}

function speakInstructions(step) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  let text = "";
  if (step === 1) {
    text =
      "Bienvenido soy tu asistente de voz. Estas son las convocatorias, Por favor selecciona las que deseas agregar para inscribirte. La palomita verde que aparece del lado derecho arriba de cada convocatoria indicara que ya está seleccionada una.Cuando elijas las convocatorias, ve al botón de abajo que dice siguiente. Confirmar mis datos para continuar.";
  } else if (step === 2) {
    text =
      "Por favor, Confirma tus datos personales antes de continuar. Por seguridad no puedes modificarlos aquí. Si necesitas hacer algún cambio, dirígete a tu Perfil para actualizar tus datos y luego regresa. Si todo está correcto, presiona continuar.";
  } else if (step === 3) {
    text =
      "Registra los datos de tus robots. Escribe el nombre y selecciona la categoría para cada uno. También puedes agregar a los integrantes de tu equipo.";
  } else if (step === 4) {
    text =
      "Revisa el resumen de tu solicitud. Aquí puedes ver el total a pagar y las convocatorias seleccionadas, como los datos bancarios de nosotros para el deposito. Notara que se te genero un folio y un QR estos son valiosos para el dia del evento, guardalos bien. Si todo es correcto, elige el boton de continuar.";
  } else if (step === 5) {
    text =
      "Aqui puedes enviar tu comprobante ahora o guardar y pagar después. Elige el botón correspondiente para finalizar o dejarpendiente esta solicitud. Por favor sube tu comprobante de pago en formato PDF, imagen JPG o PNG. Cuando el archivo esté cargado, presiona el botón de Enviar solicitud con comprobante, si aún no tienes tu comprobante, puedes elegir Guardar sin comprobante y subirlo después desde tu perfil en la sección de Mis Inscripciones.";
  } else if (step === "success") {
    text =
      "¡Felicidades! Tu solicitud ha sido procesada. Puedes revisar el estado de tu inscripción desde tu perfil en la seccion de Mis Inscripciones o subir tu comprobante de pago si aún no lo has hecho.";
  }

  if (text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

function injectVoiceAssistantButton() {
  const oldBtn = document.getElementById("voiceAssistantBtn");
  if (oldBtn) oldBtn.remove();

  if (document.getElementById("voiceToggleBtn")) return;

  const btn = document.createElement("button");
  btn.id = "voiceToggleBtn";
  btn.type = "button";
  btn.title = "Activar / Desactivar Asistente de Voz";
  btn.style.cssText =
    "position: fixed; bottom: 30px; left: 30px; z-index: 9999; background: #0b1220; border: 2px solid #3b82f6; color: #60a5fa; border-radius: 50%; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); font-size: 1.2rem; cursor: pointer; transition: all 0.3s ease;";
  btn.innerHTML = '<i class="fas fa-volume-up"></i>';
  btn.onclick = toggleVoice;

  document.body.appendChild(btn);
}

// ================================================
// UTILIDADES
// ================================================
function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = '<i class="fas fa-copy"></i>';
    }, 2000);
  });
}

var tramiteToastTimer = null;
function toast(message, type = "success") {
  const el = document.getElementById("toastNotification");
  const msg = document.getElementById("toastMessage");
  const icon = el?.querySelector(".toast-icon");

  if (!el || !msg) return;

  msg.textContent = message;
  el.className = `toast-notification ${type}`;
  if (icon)
    icon.className = `toast-icon fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`;

  clearTimeout(tramiteToastTimer);
  tramiteToastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 4000);
}

// Escape key — volver al dashboard
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && tramiteCurrentStep === 1) {
    window.location.href = "/usuario";
  }
});
