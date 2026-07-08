/**
 * acceso.js — RENOVATEC v20260423
 * Lógica de autenticación para acceso.html
 * Compatible con el rediseño profesional y modo debug de backend
 */

// Usamos var para evitar SyntaxError si el script se carga dos veces por el fallback de CSP
if (typeof window._accesoJsLoaded === "undefined") {
  window._accesoJsLoaded = true;
}

// En lugar de declarar variables, usamos el objeto window para evitar SyntaxError
window.AUTH_SESSION_KEY_V2 = "renovatec_user_session_v1";
window.PENDING_VERIFY_EMAIL_KEY_V2 = "renovatec_pending_verify_email";
window.VERIFY_RESEND_STATE_KEY_V2 = "renovatec_verify_resend_state";
window.VERIFY_RESEND_COOLDOWN_MS_V2 = 60 * 1000;
window.VERIFY_RESEND_WAIT_MS_V2 = 15 * 60 * 1000;
window.VERIFY_RESEND_MAX_ATTEMPTS_V2 = 3;
window.COUNTRIES_V2 = [
  "Afganistan",
  "Albania",
  "Alemania",
  "Andorra",
  "Angola",
  "Antigua y Barbuda",
  "Arabia Saudita",
  "Argelia",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaiyan",
  "Bahamas",
  "Banglades",
  "Barbados",
  "Barein",
  "Belgica",
  "Belice",
  "Benin",
  "Bielorrusia",
  "Birmania",
  "Bolivia",
  "Bosnia y Herzegovina",
  "Botsuana",
  "Brasil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Butan",
  "Cabo Verde",
  "Camboya",
  "Camerun",
  "Canada",
  "Catar",
  "Chad",
  "Chile",
  "China",
  "Chipre",
  "Colombia",
  "Comoras",
  "Corea del Norte",
  "Corea del Sur",
  "Costa de Marfil",
  "Costa Rica",
  "Croacia",
  "Cuba",
  "Dinamarca",
  "Dominica",
  "Ecuador",
  "Egipto",
  "El Salvador",
  "Emiratos Arabes Unidos",
  "Eritrea",
  "Eslovaquia",
  "Eslovenia",
  "Espana",
  "Estados Unidos",
  "Estonia",
  "Esuatini",
  "Etiopia",
  "Filipinas",
  "Finlandia",
  "Fiyi",
  "Francia",
  "Gabon",
  "Gambia",
  "Georgia",
  "Ghana",
  "Granada",
  "Grecia",
  "Guatemala",
  "Guinea",
  "Guinea Ecuatorial",
  "Guinea-Bisau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungria",
  "India",
  "Indonesia",
  "Irak",
  "Iran",
  "Irlanda",
  "Islandia",
  "Islas Marshall",
  "Islas Salomon",
  "Israel",
  "Italia",
  "Jamaica",
  "Japon",
  "Jordania",
  "Kazajistan",
  "Kenia",
  "Kirguistan",
  "Kiribati",
  "Kuwait",
  "Laos",
  "Lesoto",
  "Letonia",
  "Libano",
  "Liberia",
  "Libia",
  "Liechtenstein",
  "Lituania",
  "Luxemburgo",
  "Macedonia del Norte",
  "Madagascar",
  "Malasia",
  "Malaui",
  "Maldivas",
  "Mali",
  "Malta",
  "Marruecos",
  "Mauricio",
  "Mauritania",
  "Mexico",
  "Micronesia",
  "Moldavia",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Mozambique",
  "Namibia",
  "Nauru",
  "Nepal",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Noruega",
  "Nueva Zelanda",
  "Oman",
  "Paises Bajos",
  "Pakistan",
  "Palaos",
  "Panama",
  "Papua Nueva Guinea",
  "Paraguay",
  "Peru",
  "Polonia",
  "Portugal",
  "Reino Unido",
  "Republica Centroafricana",
  "Republica Checa",
  "Republica del Congo",
  "Republica Democratica del Congo",
  "Republica Dominicana",
  "Ruanda",
  "Rumania",
  "Rusia",
  "Samoa",
  "San Cristobal y Nieves",
  "San Marino",
  "San Vicente y las Granadinas",
  "Santa Lucia",
  "Santo Tome y Principe",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leona",
  "Singapur",
  "Siria",
  "Somalia",
  "Sri Lanka",
  "Sudafrica",
  "Sudan",
  "Sudan del Sur",
  "Suecia",
  "Suiza",
  "Surinam",
  "Tailandia",
  "Tanzania",
  "Tayikistan",
  "Timor Oriental",
  "Togo",
  "Tonga",
  "Trinidad y Tobago",
  "Tunez",
  "Turkmenistan",
  "Turquia",
  "Tuvalu",
  "Ucrania",
  "Uganda",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vaticano",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Yibuti",
  "Zambia",
  "Zimbabue",
];

window.pendingVerificationEmail_V2 =
  sessionStorage.getItem(window.PENDING_VERIFY_EMAIL_KEY_V2) || "";
window.pendingRecoveryIdentifier_V2 = "";
window.registerAvailability_V2 = {
  email: { checked: false, available: true },
  controlNumber: { checked: false, available: true },
  phone: { checked: false, available: true },
};

/* ==================== PRE-LOAD FIREBASE ==================== */
window._firebaseModules = null;
async function preloadFirebase() {
  try {
    const [appModule, authModule, configResponse] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js"),
      fetch("/app/api/firebase-config.php"),
    ]);
    const firebaseConfig = await configResponse.json();
    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    const provider = new authModule.GoogleAuthProvider();
    window._firebaseModules = {
      auth,
      provider,
      signInWithPopup: authModule.signInWithPopup,
    };
  } catch (error) {
    console.error("Firebase preload failed:", error);
  }
}

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", () => {
  if (window._accesoDOMBound) return;
  window._accesoDOMBound = true;

  const session =
    sessionStorage.getItem(window.AUTH_SESSION_KEY_V2) ||
    localStorage.getItem(window.AUTH_SESSION_KEY_V2);
  const admin = sessionStorage.getItem("adminUser");
  const tallerista = sessionStorage.getItem("talleristaUser");
  if (admin) {
    window.location.replace("/admin");
    return;
  }
  if (tallerista) {
    window.location.replace("/tallerista");
    return;
  }
  if (session) {
    window.location.replace("/usuario");
    return;
  }

  bindForms();
  bindModalControls();
  bindPasswordToggle();
  bindPasswordStrength();
  bindRegisterAvailabilityChecks();
  loadCountryOptions();
  applySecurityNotice();
  applyEntryMode();
  applyMobileRobotBackgroundFix();
  checkExistingIpBlock();
  initSmartAutocomplete();
  preloadFirebase();
});

/* ==================== ESTILOS MOVILES ==================== */
function applyMobileRobotBackgroundFix() {
  if (document.getElementById("mobileRobotCssFix")) return;

  // Inyectar CSS dinámico para que el robot animado aparezca de fondo en celulares
  const style = document.createElement("style");
  style.id = "mobileRobotCssFix";
  style.textContent = `
    @media (max-width: 900px) {
      .auth-visual,
      .login-visual,
      .auth-image-side,
      .hero-visual {
        display: flex !important;
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 0 !important;
        opacity: 0.15 !important; /* Efecto marca de agua semitransparente */
        pointer-events: none !important;
        align-items: center;
        justify-content: center;
      }
      
      .auth-content,
      .login-content,
      .auth-container,
      .login-container {
        position: relative !important;
        z-index: 10 !important;
      }
      
      .auth-card,
      .login-box,
      .auth-box {
        background: rgba(10, 15, 28, 0.85) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(0, 212, 255, 0.15) !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function applySecurityNotice() {
  const params = new URLSearchParams(window.location.search);
  const reason = (params.get("reason") || "").toLowerCase();

  let storedMessage = "";
  try {
    storedMessage = sessionStorage.getItem("session_timeout_message") || "";
    if (storedMessage) {
      sessionStorage.removeItem("session_timeout_message");
    }
  } catch {
    storedMessage = "";
  }

  if (reason !== "timeout" && !storedMessage) {
    return;
  }

  // Limpiar la URL para evitar que el mensaje se repita si la página se recarga
  if (reason === "timeout") {
    try {
      const url = new URL(window.location);
      url.searchParams.delete("reason");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search,
      );
    } catch (e) {}
  }

  showStatus(
    storedMessage ||
      "Tu sesion se cerro por seguridad despues de 15 minutos de inactividad.",
    "error",
    "authStatus",
  );
}

function applyEntryMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = (params.get("mode") || "").toLowerCase();

  if (mode === "register") {
    openRegisterModal();
  }
}

/* ==================== RUTAS ==================== */
function getProjectBasePath() {
  return "";
}

function getApiUrl(endpoint) {
  return `/app/api/${endpoint}`;
}

/* ==================== STATUS ==================== */
function showStatus(message, type = "info", targetId = null) {
  const ids = targetId ? [targetId] : ["authStatus", "registerStatus"];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.classList.remove("success", "error", "info", "show");
    if (message) {
      el.classList.add(type, "show");
    }
  });
}

function clearStatus() {
  showStatus("", "info");
}

function showSupportErrorDialog(
  error,
  fallbackMessage = "Ocurrio un problema.",
  options = {},
) {
  const message =
    typeof error === "string" ? error : error?.message || fallbackMessage;
  const supportCode = error?.support_code || error?.supportCode || "";
  const type = options.type || "error";
  const title =
    options.title ||
    (type === "success" ? "Todo listo" : "No se pudo completar la accion");
  const icon =
    options.icon ||
    (type === "success" ? "fa-circle-check" : "fa-triangle-exclamation");

  let dialog = document.getElementById("supportErrorDialog");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "supportErrorDialog";
    dialog.className = "support-error-dialog";
    dialog.innerHTML = `
      <div class="support-error-backdrop" data-support-close></div>
      <div class="support-error-card" role="alertdialog" aria-modal="true" aria-labelledby="supportErrorTitle">
        <button type="button" class="support-error-close" data-support-close aria-label="Cerrar">
          <i class="fas fa-times"></i>
        </button>
        <div class="support-error-icon"><i id="supportErrorIcon" class="fas fa-triangle-exclamation"></i></div>
        <h3 id="supportErrorTitle"></h3>
        <p id="supportErrorMessage"></p>
        <div id="supportErrorCodeWrap" class="support-error-code" style="display:none">
          <span>Folio para reportar</span>
          <strong id="supportErrorCode"></strong>
        </div>
        <button type="button" class="btn-primary-action btn-green" data-support-close>
          Entendido
        </button>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.querySelectorAll("[data-support-close]").forEach((el) => {
      el.addEventListener("click", () => dialog.classList.remove("show"));
    });
  }

  const messageEl = dialog.querySelector("#supportErrorMessage");
  const titleEl = dialog.querySelector("#supportErrorTitle");
  const iconEl = dialog.querySelector("#supportErrorIcon");
  const codeWrap = dialog.querySelector("#supportErrorCodeWrap");
  const codeEl = dialog.querySelector("#supportErrorCode");
  dialog.classList.remove("success", "error", "info");
  dialog.classList.add(type);
  if (titleEl) titleEl.textContent = title;
  if (iconEl) iconEl.className = `fas ${icon}`;
  if (messageEl) messageEl.textContent = message;
  if (supportCode && codeWrap && codeEl) {
    codeEl.textContent = supportCode;
    codeWrap.style.display = "grid";
  } else if (codeWrap) {
    codeWrap.style.display = "none";
  }

  dialog.classList.add("show");
}

function getPendingVerificationEmail() {
  return (
    window.pendingVerificationEmail_V2 ||
    sessionStorage.getItem(window.PENDING_VERIFY_EMAIL_KEY_V2) ||
    ""
  );
}

function getVerifyResendStates() {
  try {
    return JSON.parse(
      sessionStorage.getItem(window.VERIFY_RESEND_STATE_KEY_V2) || "{}",
    );
  } catch {
    return {};
  }
}

function saveVerifyResendStates(states) {
  sessionStorage.setItem(
    window.VERIFY_RESEND_STATE_KEY_V2,
    JSON.stringify(states),
  );
}

function getVerifyResendState(email) {
  const key = String(email || "").toLowerCase();
  const states = getVerifyResendStates();
  return (
    states[key] || {
      attempts: 0,
      lastSentAt: 0,
      blockedUntil: 0,
    }
  );
}

function saveVerifyResendState(email, state) {
  const key = String(email || "").toLowerCase();
  if (!key) return;
  const states = getVerifyResendStates();
  states[key] = state;
  saveVerifyResendStates(states);
}

function clearVerifyResendState(email) {
  const key = String(email || "").toLowerCase();
  if (!key) return;
  const states = getVerifyResendStates();
  delete states[key];
  saveVerifyResendStates(states);
}

function formatResendCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getVerifyResendWait(email) {
  const state = getVerifyResendState(email);
  const now = Date.now();
  if (state.blockedUntil && state.blockedUntil > now) {
    return {
      type: "blocked",
      seconds: Math.ceil((state.blockedUntil - now) / 1000),
    };
  }

  const cooldownUntil =
    Number(state.lastSentAt || 0) + window.VERIFY_RESEND_COOLDOWN_MS_V2;
  if (cooldownUntil > now) {
    return {
      type: "cooldown",
      seconds: Math.ceil((cooldownUntil - now) / 1000),
    };
  }

  return null;
}

function updateVerifyResendButtonState() {
  const btn = document.getElementById("resendVerifyCodeBtn");
  if (!btn) return;

  if (window.verifyResendTimer_V2) {
    clearTimeout(window.verifyResendTimer_V2);
    window.verifyResendTimer_V2 = null;
  }

  const email = getPendingVerificationEmail();
  const wait = email ? getVerifyResendWait(email) : null;
  const defaultHtml = '<i class="fas fa-paper-plane"></i> Reenviar codigo';

  if (!email) {
    btn.disabled = false;
    btn.innerHTML = defaultHtml;
    return;
  }

  if (!wait) {
    btn.disabled = false;
    btn.innerHTML = defaultHtml;
    return;
  }

  btn.disabled = true;
  const label =
    wait.type === "blocked"
      ? "Intenta de nuevo en"
      : "Reenviar codigo en";
  btn.innerHTML = `<i class="fas fa-clock"></i> ${label} ${formatResendCountdown(wait.seconds)}`;
  window.verifyResendTimer_V2 = setTimeout(updateVerifyResendButtonState, 1000);
}

function startInitialVerificationCooldown(email) {
  saveVerifyResendState(email, {
    attempts: 0,
    lastSentAt: Date.now(),
    blockedUntil: 0,
  });
  updateVerifyResendButtonState();
}

function markVerificationResendSent(email) {
  const state = getVerifyResendState(email);
  const attempts = Number(state.attempts || 0) + 1;
  const nextState = {
    attempts,
    lastSentAt: Date.now(),
    blockedUntil:
      attempts >= window.VERIFY_RESEND_MAX_ATTEMPTS_V2
        ? Date.now() + window.VERIFY_RESEND_WAIT_MS_V2
        : 0,
  };
  saveVerifyResendState(email, nextState);
  updateVerifyResendButtonState();
  return nextState;
}

/* ==================== IP BLOCK HANDLING ==================== */
function handleIpBlockRequirement(error, formId, statusId) {
  if (error.status === 429 || error.is_ip_blocked) {
    // Guardar el tiempo de bloqueo para que persista al recargar la página
    const minutes = error.blocked_minutes || 15;
    const blockedUntil = Date.now() + minutes * 60000;
    localStorage.setItem("renovatec_ip_block_until", blockedUntil.toString());
    localStorage.setItem("renovatec_ip_block_msg", error.message);

    checkExistingIpBlock();
    return true;
  }
  return false;
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

/* ==================== FORMS ==================== */
function bindForms() {
  const map = {
    loginForm: handleLoginSubmit,
    registerForm: handleRegisterSubmit,
    verifyEmailForm: handleVerifyEmailSubmit,
    recoverRequestForm: handleRecoverRequestSubmit,
    recoverResetForm: handleRecoverResetSubmit,
  };
  for (const [id, handler] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("submit", handler);
  }

  const btnGoogle = document.getElementById("btnGoogleLogin");
  if (btnGoogle) {
    btnGoogle.addEventListener("click", function () {
      if (typeof window.handleGoogleAuth === "function")
        window.handleGoogleAuth(this);
    });
  }

  const btnGoogleRegister = document.getElementById("btnGoogleRegister");
  if (btnGoogleRegister) {
    btnGoogleRegister.addEventListener("click", function () {
      if (typeof window.handleGoogleAuth === "function")
        window.handleGoogleAuth(this);
    });
  }

  const resendVerifyBtn = document.getElementById("resendVerifyCodeBtn");
  if (resendVerifyBtn) {
    resendVerifyBtn.addEventListener("click", handleResendVerificationCode);
  }

  const pendingVerifyBtn = document.getElementById("openPendingVerifyBtn");
  if (pendingVerifyBtn) {
    pendingVerifyBtn.addEventListener("click", openPendingVerificationModal);
  }
}

/* ==================== MODAL CONTROLS ==================== */
function bindModalControls() {
  const modal = document.getElementById("registerModal");

  document
    .getElementById("openRegisterBtn")
    ?.addEventListener("click", () => openRegisterModal());
  document
    .getElementById("openRecoverBtn")
    ?.addEventListener("click", () => openRecoverModal());

  document.querySelectorAll("[data-close-register]").forEach((el) => {
    el.addEventListener("click", closeRegisterModal);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRegisterModal();
  });
}

function showModalForms({
  register = false,
  verify = false,
  recoverReq = false,
  recoverReset = false,
}) {
  const ids = {
    registerForm: register,
    verifyEmailForm: verify,
    recoverRequestForm: recoverReq,
    recoverResetForm: recoverReset,
  };
  for (const [id, show] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? "flex" : "none";
  }
  if (verify) {
    updateVerifyResendButtonState();
  }
}

function openRegisterModal() {
  clearStatus();
  resetGoogleRegisterMode();
  showModalForms({ register: true });
  openModal();
}

function openRecoverModal() {
  clearStatus();
  showModalForms({ recoverReq: true });
  openModal();
}

function openPendingVerificationModal() {
  clearStatus();

  const storedEmail =
    window.pendingVerificationEmail_V2 ||
    sessionStorage.getItem(window.PENDING_VERIFY_EMAIL_KEY_V2) ||
    "";
  const typedEmail =
    document.getElementById("loginUsername")?.value?.trim() ||
    document.getElementById("regEmail")?.value?.trim() ||
    "";
  const email = (storedEmail || typedEmail).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showStatus(
      "Escribe tu correo en el campo de inicio de sesion y despues abre la verificacion pendiente.",
      "info",
      "authStatus",
    );
    return;
  }

  window.pendingVerificationEmail_V2 = email;
  sessionStorage.setItem(window.PENDING_VERIFY_EMAIL_KEY_V2, email);
  showModalForms({ verify: true });
  openModal();
}

function openModal() {
  const modal = document.getElementById("registerModal");
  if (!modal) return;

  // Técnica para MIUI/Android Chrome: position:fixed en el body
  // (overflow:hidden solo NO congela el body en Android — permite que el overlay
  //  pierda su scroll porque el navegador lo redirige al body)
  const scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.dataset.scrollY = scrollY;

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  // Siempre arranca desde el tope: el campo "Nombre completo" siempre visible
  modal.scrollTop = 0;
}

function closeRegisterModal() {
  const modal = document.getElementById("registerModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");

  // Restaurar body scroll (par del position:fixed de openModal)
  const scrollY = parseInt(document.body.dataset.scrollY || "0", 10);
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  window.scrollTo(0, scrollY);

  modal.scrollTop = 0;
  showModalForms({ register: true });
  clearStatus();
  if (window.verifyResendTimer_V2) {
    clearTimeout(window.verifyResendTimer_V2);
    window.verifyResendTimer_V2 = null;
  }
  resetGoogleRegisterMode();
}

function resetGoogleRegisterMode() {
  window.tempGoogleIdToken = null;
  window.registerAvailability_V2 = {
    email: { checked: false, available: true },
    controlNumber: { checked: false, available: true },
    phone: { checked: false, available: true },
  };
  setAvailabilityHint("emailAvailabilityHint", null);
  setAvailabilityHint("controlAvailabilityHint", null);
  setAvailabilityHint("phoneHint", null);

  const pwd1 = document.getElementById("regPassword")?.closest(".form-field");
  const pwd2 = document
    .getElementById("regPasswordConfirm")
    ?.closest(".form-field");
  if (pwd1) pwd1.style.display = "";
  if (pwd2) pwd2.style.display = "";
  const emailInput = document.getElementById("regEmail");
  if (emailInput) emailInput.readOnly = false;
  setGoogleRegisterConnectedMode(false);
}

function setGoogleRegisterConnectedMode(isConnected) {
  const btn = document.getElementById("btnGoogleRegister");
  const divider = btn?.nextElementSibling?.classList?.contains("auth-divider")
    ? btn.nextElementSibling
    : null;
  let notice = document.getElementById("googleRegisterConnectedNotice");

  if (!notice && btn) {
    notice = document.createElement("div");
    notice.id = "googleRegisterConnectedNotice";
    notice.className = "google-connected-notice";
    notice.innerHTML = `
      <i class="fab fa-google"></i>
      <div>
        <strong>Google conectado</strong>
        <span>Tu correo ya fue verificado con Google. Solo completa tus datos académicos.</span>
      </div>
    `;
    btn.insertAdjacentElement("afterend", notice);
  }

  if (btn) btn.style.display = isConnected ? "none" : "";
  if (divider) divider.style.display = isConnected ? "none" : "";
  if (notice) notice.style.display = isConnected ? "flex" : "none";
}

/* ==================== PASSWORD TOGGLE ==================== */
function bindPasswordToggle() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
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

/* ==================== PASSWORD STRENGTH ==================== */
function bindPasswordStrength() {
  const passwordInput = document.getElementById("regPassword");
  const hint = document.getElementById("passwordSecurityHint");
  const bar = document.getElementById("strengthBar");
  if (!passwordInput) return;

  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (!val) {
      if (hint) hint.textContent = "Seguridad: —";
      if (hint) hint.className = "field-hint";
      if (bar) bar.className = "strength-fill";
      return;
    }

    const levels =
      score <= 2
        ? { text: "Baja", cls: "low" }
        : score <= 4
          ? { text: "Media", cls: "medium" }
          : { text: "Alta", cls: "high" };

    if (hint) {
      hint.textContent = `Seguridad: ${levels.text}`;
      hint.className = `field-hint sec-${levels.cls}`;
    }
    if (bar) {
      bar.className = `strength-fill ${levels.cls}`;
    }
  });
}

/* ==================== DISPONIBILIDAD EN REGISTRO ==================== */
function bindRegisterAvailabilityChecks() {
  const emailInput = document.getElementById("regEmail");
  const controlInput = document.getElementById("regControlNumber");
  const phoneInput = document.getElementById("regPhone");
  const phoneLocalInput = document.getElementById("regPhoneNumber");
  if (!emailInput && !controlInput && !phoneInput && !phoneLocalInput) return;

  const debouncedCheck = debounce(checkRegisterAvailability, 450);
  emailInput?.addEventListener("input", debouncedCheck);
  emailInput?.addEventListener("blur", () => checkRegisterAvailability());
  controlInput?.addEventListener("input", debouncedCheck);
  controlInput?.addEventListener("blur", () => checkRegisterAvailability());
  phoneInput?.addEventListener("input", debouncedCheck);
  phoneInput?.addEventListener("blur", () => checkRegisterAvailability());
  phoneLocalInput?.addEventListener("input", debouncedCheck);
  phoneLocalInput?.addEventListener("blur", () => checkRegisterAvailability());
}

function setAvailabilityHint(id, result) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("sec-low", "sec-medium", "sec-high");
  if (!result?.checked || !result.message) {
    el.textContent = "";
    return;
  }
  el.textContent = result.message;
  el.classList.add(result.available ? "sec-high" : "sec-low");
}

async function checkRegisterAvailability() {
  const email = document.getElementById("regEmail")?.value.trim() || "";
  const controlNumber =
    document.getElementById("regControlNumber")?.value.trim() || "";
  const phone = document.getElementById("regPhone")?.value.trim() || "";

  if (!email && !controlNumber && !phone) {
    window.registerAvailability_V2 = {
      email: { checked: false, available: true },
      controlNumber: { checked: false, available: true },
      phone: { checked: false, available: true },
    };
    setAvailabilityHint("emailAvailabilityHint", null);
    setAvailabilityHint("controlAvailabilityHint", null);
    setAvailabilityHint("phoneHint", null);
    return window.registerAvailability_V2;
  }

  try {
    const params = new URLSearchParams();
    if (email && !window.tempGoogleIdToken) params.set("email", email);
    if (controlNumber) params.set("controlNumber", controlNumber);
    if (phone) params.set("phone", phone);
    if (![...params.keys()].length) return window.registerAvailability_V2;

    const result = await apiJson(
      `auth-check-availability.php?${params.toString()}`,
    );
    window.registerAvailability_V2 = {
      ...window.registerAvailability_V2,
      ...(result.data || {}),
    };
    setAvailabilityHint(
      "emailAvailabilityHint",
      window.tempGoogleIdToken
        ? { checked: false, available: true, message: "" }
        : window.registerAvailability_V2.email,
    );
    setAvailabilityHint(
      "controlAvailabilityHint",
      window.registerAvailability_V2.controlNumber,
    );
    setAvailabilityHint("phoneHint", window.registerAvailability_V2.phone);
    return window.registerAvailability_V2;
  } catch (error) {
    if (false && error.google_recovery) {
      showStatus(
        "Esta cuenta usa Google. Recupera el acceso directamente desde Google.",
        "info",
        "registerStatus",
      );
      showSupportErrorDialog(
        "Esta cuenta fue creada con Google. RENOVATEC no puede cambiar esa contraseña. Usa la recuperación de cuenta de Google para volver a entrar.",
        "Contraseña administrada por Google",
        {
          type: "info",
          title: "Cuenta con Google",
          icon: "fa-google",
        },
      );
      setTimeout(() => {
        window.open(
          error.google_recovery_url ||
            "https://accounts.google.com/signin/recovery",
          "_blank",
          "noopener",
        );
      }, 450);
      return;
    }
    console.warn("No se pudo validar disponibilidad", error);
    return window.registerAvailability_V2;
  }
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/* ==================== LOGIN ==================== */
async function handleLoginSubmit(event) {
  event.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) {
    showStatus("Completa usuario y contraseña.", "error", "authStatus");
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Verificando...");

  const payload = { username, password };

  try {
    const result = await apiJson("auth-login.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const user = result.data;

    console.log("Scope detectado por el login:", user.scope); // Presiona F12 en tu navegador para ver esto

    if (user.scope === "admin") {
      sessionStorage.setItem("adminUser", JSON.stringify(user));
      // Mostrar overlay de bienvenida antes de redirigir
      if (typeof window.showLoginSuccessOverlay === "function") {
        window.showLoginSuccessOverlay(
          true,
          user.full_name || user.username || "Admin",
        );
      }
      setTimeout(() => {
        window.location.href = "/admin";
      }, 800);
      return;
    }

    if (user.scope === "tallerista") {
      sessionStorage.removeItem(window.AUTH_SESSION_KEY_V2);
      localStorage.removeItem(window.AUTH_SESSION_KEY_V2);
      sessionStorage.setItem("talleristaUser", JSON.stringify(user));
      if (typeof window.showLoginSuccessOverlay === "function") {
        window.showLoginSuccessOverlay(
          false,
          user.full_name || user.username || "Profesor",
        );
      }
      setTimeout(() => {
        window.location.href = "/tallerista";
      }, 800);
      return;
    }

    sessionStorage.setItem(window.AUTH_SESSION_KEY_V2, JSON.stringify(user));
    localStorage.setItem(window.AUTH_SESSION_KEY_V2, JSON.stringify(user));
    // Mostrar overlay de bienvenida antes de redirigir
    if (typeof window.showLoginSuccessOverlay === "function") {
      window.showLoginSuccessOverlay(
        false,
        user.full_name || user.username || "",
      );
    }
    setTimeout(() => {
      window.location.href = "/usuario";
    }, 800);
  } catch (error) {
    if (handleIpBlockRequirement(error, "loginForm", "authStatus")) {
      return; // Bloqueo aplicado visualmente (campos deshabilitados)
    }

    if (error.needs_verification) {
      const pendingEmail =
        error.email || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) ? username : "");
      window.pendingVerificationEmail_V2 = pendingEmail;
      if (pendingEmail) {
        sessionStorage.setItem(window.PENDING_VERIFY_EMAIL_KEY_V2, pendingEmail);
      }
      showModalForms({ verify: true });
      openModal();
      showStatus(
        "Tu cuenta existe, pero falta verificar el correo. Ingresa el codigo que recibiste.",
        "info",
        "registerStatus",
      );
      document.getElementById("verifyCode")?.focus();
      return;
    }

    if (error.failed_attempts) {
      showStatus(
        `${error.message || "Credenciales inválidas."} Intento ${error.failed_attempts} de ${error.max_attempts || 3}.`,
        "error",
        "authStatus",
      );
    } else {
      showStatus(
        error.message || "No se pudo iniciar sesión.",
        "error",
        "authStatus",
      );
    }
    document.getElementById("loginPassword").value = "";
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-sign-in-alt"></i> Iniciar sesión',
    );
  }
}

/* ==================== REGISTRO ==================== */
async function handleRegisterSubmit(event) {
  event.preventDefault();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regPasswordConfirm").value;
  const controlNumber = document
    .getElementById("regControlNumber")
    .value.trim();
  const fullName = document.getElementById("regFullName").value.trim();
  const phone = document.getElementById("regPhone").value.trim();

  // --- NUEVAS VALIDACIONES DE INTERFAZ ---
  if (!window.tempGoogleIdToken) {
    if (password.length < 6) {
      showStatus(
        "La contraseña debe tener al menos 6 caracteres.",
        "error",
        "registerStatus",
      );
      document.getElementById("regPassword").focus();
      return;
    }

    if (password !== confirmPassword) {
      showStatus(
        "La contraseña y su confirmación no coinciden.",
        "error",
        "registerStatus",
      );
      return;
    }
  }

  if (fullName.length < 5) {
    showStatus(
      "Por favor ingresa tu nombre completo.",
      "error",
      "registerStatus",
    );
    document.getElementById("regFullName").focus();
    return;
  }

  // Valida que el número de control no tenga espacios
  if (!/^[a-z0-9_.\-]{4,60}$/i.test(controlNumber)) {
    showStatus(
      "El número de control no debe contener espacios ni caracteres especiales.",
      "error",
      "registerStatus",
    );
    document.getElementById("regControlNumber").focus();
    return;
  }

  if (!phone || !/^[0-9+()\-\s]{7,20}$/.test(phone)) {
    showStatus(
      "El número de teléfono parece ser inválido. Selecciona la lada de tu país e ingresa el número.",
      "error",
      "registerStatus",
    );
    document.getElementById("regPhoneNumber")?.focus();
    return;
  }

  const availability = await checkRegisterAvailability();
  if (!window.tempGoogleIdToken && availability.email?.checked && !availability.email.available) {
    showStatus(
      availability.email.message || "Este correo ya esta en uso.",
      "error",
      "registerStatus",
    );
    document.getElementById("regEmail")?.focus();
    return;
  }
  if (
    availability.controlNumber?.checked &&
    !availability.controlNumber.available
  ) {
    showStatus(
      availability.controlNumber.message ||
        "Este numero de control ya esta en uso.",
      "error",
      "registerStatus",
    );
    document.getElementById("regControlNumber")?.focus();
    return;
  }

  if (availability.phone?.checked && !availability.phone.available) {
    showStatus(
      availability.phone.message || "Este telefono ya esta registrado.",
      "error",
      "registerStatus",
    );
    document.getElementById("regPhoneNumber")?.focus();
    return;
  }

  const selectedCountry = document.getElementById("regCountry").value.trim();

  if (!normalizedCountries().includes(normalizeText(selectedCountry))) {
    showStatus(
      "Selecciona un país válido de la lista.",
      "error",
      "registerStatus",
    );
    return;
  }

  const payload = {
    fullName: document.getElementById("regFullName").value.trim(),
    originSchool: document.getElementById("regOriginSchool").value.trim(),
    controlNumber: document.getElementById("regControlNumber").value.trim(),
    career: document.getElementById("regCareer").value.trim(),
    semester: document.getElementById("regSemester").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    phone: document.getElementById("regPhone").value.trim(),
    country: selectedCountry,
    city: document.getElementById("regCity").value.trim(),
  };

  if (!window.tempGoogleIdToken) {
    payload.password = document.getElementById("regPassword").value;
    payload.confirmPassword =
      document.getElementById("regPasswordConfirm").value;
    if (payload.password !== payload.confirmPassword) {
      showStatus(
        "La contraseña y su confirmación no coinciden.",
        "error",
        "registerStatus",
      );
      return;
    }
  } else {
    payload.idToken = window.tempGoogleIdToken;
    payload.action = "register";
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Creando cuenta...");

  try {
    if (window.tempGoogleIdToken) {
      const result = await apiJson("auth-google.php", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      sessionStorage.setItem(
        window.AUTH_SESSION_KEY_V2,
        JSON.stringify(result.data),
      );
      localStorage.setItem(
        window.AUTH_SESSION_KEY_V2,
        JSON.stringify(result.data),
      );
      showStatus(
        "¡Cuenta creada exitosamente con Google! Redirigiendo...",
        "success",
        "registerStatus",
      );
      if (typeof window.showAccessTransitionOverlay === "function") {
        window.showAccessTransitionOverlay({
          title: "Cuenta creada con Google",
          subtitle: "Preparando tu panel de usuario...",
        });
      }
      setTimeout(
        () => (window.location.href = result.data.redirect || "/usuario"),
        1400,
      );
      return;
    }

    const result = await apiJson("auth-register.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    window.pendingVerificationEmail_V2 = payload.email;
    sessionStorage.setItem(window.PENDING_VERIFY_EMAIL_KEY_V2, payload.email);
    startInitialVerificationCooldown(payload.email);
    showModalForms({ verify: true });

    // --- PROPUESTA DE NUEVA ESCUELA AUTOMÁTICA ---
    if (
      window._knownSchools &&
      !window._knownSchools.some(
        (s) => s.toLowerCase() === payload.originSchool.toLowerCase(),
      )
    ) {
      fetch("/app/api/auth-schools.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.originSchool,
          type: "universidad",
          is_verified: false,
        }),
      }).catch(() => {});
    }

    // --- PROPUESTA DE NUEVA CARRERA AUTOMÁTICA ---
    if (
      window._knownCareers &&
      payload.career &&
      !window._knownCareers.some(
        (c) => c.toLowerCase() === payload.career.toLowerCase(),
      )
    ) {
      fetch("/app/api/auth-careers.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.career, is_verified: false }),
      }).catch(() => {});
    }

    // Modo debug: si el backend devolvió el código directamente, rellenarlo
    if (result.data?.debug_code) {
      const codeInput = document.getElementById("verifyCode");
      if (codeInput) codeInput.value = result.data.debug_code;
      showStatus(
        `[DEBUG] Código: ${result.data.debug_code}. El servidor no pudo enviar correo.`,
        "info",
        "registerStatus",
      );
    } else {
      showStatus(
        result.message || "Cuenta creada. Revisa tu correo para verificarla.",
        "success",
        "registerStatus",
      );
    }
    if (typeof window.showAccessTransitionOverlay === "function") {
      window.showAccessTransitionOverlay({
        title: "Cuenta creada",
        subtitle: "Ahora verifica el codigo que enviamos a tu correo.",
        autoHideMs: 1800,
        onHidden: function () {
          document.getElementById("verifyCode")?.focus();
        },
      });
    }
  } catch (error) {
    if (handleIpBlockRequirement(error, "registerForm", "registerStatus")) {
      return; // Bloqueo aplicado visualmente (campos deshabilitados)
    }

    showStatus(
      error.message || "No se pudo crear la cuenta.",
      "error",
      "registerStatus",
    );
    if (error.support_code) {
      showSupportErrorDialog(error, "No se pudo crear la cuenta.");
    }
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-user-plus"></i> Crear mi cuenta',
    );
  }
}

/* ==================== VERIFICACIÓN ==================== */
async function handleResendVerificationCode(event) {
  const btn = event.currentTarget;
  const email = getPendingVerificationEmail();

  if (!email) {
    showStatus("Primero crea una cuenta.", "error", "registerStatus");
    return;
  }

  const wait = getVerifyResendWait(email);
  if (wait?.type === "blocked") {
    showStatus(
      "No pudimos confirmar el envio del correo. Espera 15 minutos e intenta de nuevo; si sigue sin llegar, comunicate con el equipo organizador.",
      "error",
      "registerStatus",
    );
    updateVerifyResendButtonState();
    return;
  }
  if (wait?.type === "cooldown") {
    showStatus(
      `Espera ${wait.seconds} segundos antes de pedir otro codigo.`,
      "info",
      "registerStatus",
    );
    updateVerifyResendButtonState();
    return;
  }

  setButtonLoading(btn, true, "Reenviando...");

  try {
    const result = await apiJson("auth-register.php", {
      method: "POST",
      body: JSON.stringify({ action: "resend_verification", email }),
    });

    window.pendingVerificationEmail_V2 = email;
    sessionStorage.setItem(window.PENDING_VERIFY_EMAIL_KEY_V2, email);
    const resendState = markVerificationResendSent(email);

    if (result.data?.debug_code) {
      const codeInput = document.getElementById("verifyCode");
      if (codeInput) codeInput.value = result.data.debug_code;
      showStatus(
        `[DEBUG] Codigo reenviado: ${result.data.debug_code}. El servidor no pudo enviar correo.`,
        "info",
        "registerStatus",
      );
      return;
    }

    if (resendState.blockedUntil) {
      showStatus(
        "Codigo reenviado. Si todavia no llega, espera 15 minutos e intenta de nuevo o comunicate con el equipo organizador.",
        "info",
        "registerStatus",
      );
    } else {
      showStatus(
        "Codigo reenviado. Revisa tu correo y la carpeta de spam.",
        "success",
        "registerStatus",
      );
    }
  } catch (error) {
    showStatus(
      error.message || "No se pudo reenviar el codigo.",
      "error",
      "registerStatus",
    );
    if (error.support_code) {
      showSupportErrorDialog(error, "No se pudo reenviar el codigo.");
    }
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-paper-plane"></i> Reenviar codigo',
    );
    updateVerifyResendButtonState();
  }
}

async function handleVerifyEmailSubmit(event) {
  event.preventDefault();

  const code = document.getElementById("verifyCode").value.trim();

  if (!window.pendingVerificationEmail_V2) {
    showStatus("Primero crea una cuenta.", "error", "registerStatus");
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Verificando...");

  try {
    await apiJson("auth-verify-email.php", {
      method: "POST",
      body: JSON.stringify({ email: window.pendingVerificationEmail_V2, code }),
    });

    showStatus(
      "¡Correo verificado! Ya puedes iniciar sesión.",
      "success",
      "registerStatus",
    );
    showSupportErrorDialog(
      "Correo verificado correctamente. Tu cuenta ya esta lista para iniciar sesion.",
      "Correo verificado correctamente.",
      {
        type: "success",
        title: "Cuenta lista",
        icon: "fa-circle-check",
      },
    );
    setTimeout(() => {
      closeRegisterModal();
      document.getElementById("registerForm")?.reset();
    }, 2200);
    clearVerifyResendState(window.pendingVerificationEmail_V2);
    window.pendingVerificationEmail_V2 = "";
    sessionStorage.removeItem(window.PENDING_VERIFY_EMAIL_KEY_V2);
  } catch (error) {
    showStatus(
      error.message || "No se pudo verificar el correo.",
      "error",
      "registerStatus",
    );
    showSupportErrorDialog(error, "No se pudo verificar el correo.", {
      type: "error",
      title: "Codigo no valido",
      icon: "fa-key",
    });
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-check-circle"></i> Verificar código',
    );
  }
}

/* ==================== RECUPERACIÓN — SOLICITAR ==================== */
async function handleRecoverRequestSubmit(event) {
  event.preventDefault();

  const identifier = document.getElementById("recoverIdentifier").value.trim();

  if (!identifier) {
    showStatus(
      "Ingresa tu número de control o correo.",
      "error",
      "registerStatus",
    );
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Enviando...");

  try {
    const result = await apiJson("auth-recover-account.php", {
      method: "POST",
      body: JSON.stringify({ action: "request_code", identifier }),
    });

    window.pendingRecoveryIdentifier_V2 = identifier;
    showModalForms({ recoverReset: true });

    if (result.data?.debug_code) {
      const codeInput = document.getElementById("recoverCode");
      if (codeInput) codeInput.value = result.data.debug_code;
      showStatus(
        `[DEBUG] Código: ${result.data.debug_code}. El servidor no pudo enviar correo.`,
        "info",
        "registerStatus",
      );
    } else {
      showStatus(
        "Código enviado. Revisa tu correo.",
        "success",
        "registerStatus",
      );
    }
  } catch (error) {
    showStatus(
      error.message || "No se pudo iniciar la recuperación.",
      "error",
      "registerStatus",
    );
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-paper-plane"></i> Enviar código de recuperación',
    );
  }
}

/* ==================== RECUPERACIÓN — RESETEAR ==================== */
async function handleRecoverResetSubmit(event) {
  event.preventDefault();

  const code = document.getElementById("recoverCode").value.trim();
  const password = document.getElementById("recoverPassword").value;
  const confirmPassword = document.getElementById(
    "recoverPasswordConfirm",
  ).value;

  if (!window.pendingRecoveryIdentifier_V2) {
    showStatus(
      "Primero solicita el código de recuperación.",
      "error",
      "registerStatus",
    );
    return;
  }

  if (password !== confirmPassword) {
    showStatus(
      "La contraseña y su confirmación no coinciden.",
      "error",
      "registerStatus",
    );
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Actualizando...");

  try {
    await apiJson("auth-recover-account.php", {
      method: "POST",
      body: JSON.stringify({
        action: "reset_password",
        identifier: window.pendingRecoveryIdentifier_V2,
        code,
        password,
        confirmPassword,
      }),
    });

    showStatus(
      "¡Contraseña actualizada! Ya puedes iniciar sesión.",
      "success",
      "registerStatus",
    );
    setTimeout(() => closeRegisterModal(), 1800);
    window.pendingRecoveryIdentifier_V2 = "";
  } catch (error) {
    showStatus(
      error.message || "No se pudo restablecer la contraseña.",
      "error",
      "registerStatus",
    );
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-shield-alt"></i> Cambiar contraseña',
    );
  }
}

function loadCountryOptions() {
  const datalist = document.getElementById("countryOptions");
  if (!datalist) return;
  datalist.innerHTML = window.COUNTRIES_V2.map(
    (c) => `<option value="${escapeHtml(c)}"></option>`,
  ).join("");
}

/* ==================== FETCH HELPER ==================== */
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
    throw new Error("Respuesta inválida del servidor.");
  }

  if (!response.ok || !result.success) {
    if (result.google_recovery) {
      showStatus(
        "Esta cuenta usa Google. Recupera el acceso directamente desde Google.",
        "info",
        "registerStatus",
      );
      showSupportErrorDialog(
        "Esta cuenta fue creada con Google. RENOVATEC no puede cambiar esa contraseña. Usa la recuperación de cuenta de Google para volver a entrar.",
        "Contraseña administrada por Google",
        {
          type: "info",
          title: "Cuenta con Google",
          icon: "fa-google",
        },
      );
      setTimeout(() => {
        window.open(
          result.google_recovery_url ||
            "https://accounts.google.com/signin/recovery",
          "_blank",
          "noopener",
        );
      }, 450);
    }
    const err = new Error(result.error || `Error HTTP ${response.status}`);
    Object.assign(err, result);
    err.status = response.status;
    throw err;
  }

  return result;
}

/* ==================== UTILIDADES ==================== */
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizedCountries() {
  return window.COUNTRIES_V2.map(normalizeText);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setButtonLoading(btn, loading, html) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + html;
  } else {
    btn.innerHTML = btn.dataset.originalHtml || html;
  }
}

/* ==================== GOOGLE AUTH ==================== */
window.handleGoogleAuth = async function (btnElement) {
  const originalHtml = btnElement.innerHTML;
  setButtonLoading(btnElement, true, "Conectando...");

  try {
    if (!window._firebaseModules) {
      throw new Error(
        "Firebase aún se está inicializando, intenta de nuevo en un segundo.",
      );
    }

    const result = await window._firebaseModules.signInWithPopup(
      window._firebaseModules.auth,
      window._firebaseModules.provider,
    );
    const idToken = await result.user.getIdToken();

    const response = await apiJson("auth-google.php", {
      method: "POST",
      body: JSON.stringify({ idToken: idToken, action: "login" }),
    });

    if (response.needs_registration) {
      openRegisterModal();
      window.tempGoogleIdToken = idToken;
      setGoogleRegisterConnectedMode(true);

      const emailInput = document.getElementById("regEmail");
      const nameInput = document.getElementById("regFullName");
      if (emailInput) {
        emailInput.value = response.email;
        emailInput.readOnly = true;
      }
      if (nameInput) {
        nameInput.value = response.full_name;
      }

      const pwd1 = document
        .getElementById("regPassword")
        ?.closest(".form-field");
      const pwd2 = document
        .getElementById("regPasswordConfirm")
        ?.closest(".form-field");
      if (pwd1) pwd1.style.display = "none";
      if (pwd2) pwd2.style.display = "none";

      showStatus(
        "Completa tus datos académicos para finalizar el registro",
        "info",
        "registerStatus",
      );
    } else if (response.success) {
      const user = response.data;

      // Clasificar sesión de Google dependiendo del rol (Admin, Profesor o Alumno)
      if (user.scope === "admin") {
        sessionStorage.setItem("adminUser", JSON.stringify(user));
        if (typeof window.showLoginSuccessOverlay === "function") {
          window.showLoginSuccessOverlay(
            true,
            user.full_name || user.username || "Admin",
          );
        }
        setTimeout(() => {
          window.location.href = "/admin";
        }, 800);
        return;
      }

      if (user.scope === "tallerista") {
        sessionStorage.removeItem(window.AUTH_SESSION_KEY_V2);
        localStorage.removeItem(window.AUTH_SESSION_KEY_V2);
        sessionStorage.setItem("talleristaUser", JSON.stringify(user));
        if (typeof window.showLoginSuccessOverlay === "function") {
          window.showLoginSuccessOverlay(
            false,
            user.full_name || user.username || "Profesor",
          );
        }
        setTimeout(() => {
          window.location.href = "/tallerista";
        }, 800);
        return;
      }

      sessionStorage.setItem(window.AUTH_SESSION_KEY_V2, JSON.stringify(user));
      localStorage.setItem(window.AUTH_SESSION_KEY_V2, JSON.stringify(user));

      if (typeof window.showLoginSuccessOverlay === "function") {
        window.showLoginSuccessOverlay(
          false,
          user.full_name || user.username || "",
        );
      }
      setTimeout(() => {
        window.location.href = user.redirect || "/usuario";
      }, 800);
    }
  } catch (error) {
    if (error.code === "auth/popup-closed-by-user") {
      showStatus(
        "Inicio de sesión con Google cancelado.",
        "info",
        "authStatus",
      );
    } else {
      showStatus(
        error.message || "Error al conectar con Google.",
        "error",
        "authStatus",
      );
    }
  } finally {
    setButtonLoading(btnElement, false, originalHtml);
  }
};

/* ==================== AUTOCOMPLETADO INTELIGENTE (ESCUELAS Y CIUDADES) ==================== */
window._knownSchools = [];
window._knownCities = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
  "Uruapan, Michoacán",
  "Morelia, Michoacán",
  "Pátzcuaro, Michoacán",
  "Zamora, Michoacán",
  "Lázaro Cárdenas, Michoacán",
  "Guadalajara, Jalisco",
  "Monterrey, Nuevo León",
];
window._knownCareers = [
  "Ingeniería Electrónica",
  "Ingeniería en Sistemas Computacionales",
  "Ingeniería Mecatrónica",
  "Ingeniería Industrial",
  "Licenciatura en Informática",
  "Técnico en Programación",
  "Bachillerato General",
];

async function initSmartAutocomplete() {
  try {
    const res = await fetch(getApiUrl("auth-schools.php"));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.schools)) {
        window._knownSchools = json.data.schools.map((s) => s.name);
        json.data.schools.forEach((s) => {
          if (s.state && !window._knownCities.includes(s.state)) {
            window._knownCities.push(s.state);
          }
        });
      }
    }
  } catch (e) {
    console.warn("No se pudieron cargar escuelas", e);
  }

  try {
    const res = await fetch(getApiUrl("auth-careers.php"));
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.careers)) {
        window._knownCareers = json.data.careers.map((c) => c.name);
      }
    }
  } catch (e) {
    console.warn("No se pudieron cargar carreras", e);
  }

  bindAutocomplete("regOriginSchool", window._knownSchools, "fa-school");
  bindAutocomplete("regCity", window._knownCities, "fa-map-marker-alt");
  bindAutocomplete("regCareer", window._knownCareers, "fa-book-open");
}

function bindAutocomplete(inputId, sourceArray, iconClass) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.acBound) return;
  input.dataset.acBound = "1";
  input.setAttribute("autocomplete", "off"); // Bloquear el autocompletado nativo del navegador

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "100%";
  wrapper.style.display = "block";
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const list = document.createElement("ul");
  list.className = "sf-auto-list";
  list.style.cssText =
    "display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:999999; background:#1e293b; border:1px solid rgba(59,130,246,0.5); border-radius:8px; padding:4px 0; max-height:220px; overflow-y:auto; list-style:none; box-shadow:0 10px 30px rgba(0,0,0,0.8); text-align:left; margin:0; box-sizing:border-box;";
  wrapper.appendChild(list);

  if (!document.getElementById("acceso-autocomplete-styles")) {
    const s = document.createElement("style");
    s.id = "acceso-autocomplete-styles";
    s.textContent = `
       .sf-auto-list::-webkit-scrollbar { width: 6px; }
       .sf-auto-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 6px; }
       .sf-auto-item { padding: 10px 14px; cursor: pointer; color: #e2e8f0; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 10px; transition: background 0.15s; }
       .sf-auto-item:last-child { border-bottom: none; }
       .sf-auto-item:hover { background: rgba(59,130,246,0.2); color: #fff; }
     `;
    document.head.appendChild(s);
  }

  // Delegación de eventos (mejor soporte en móviles y PCs)
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest(".sf-auto-item");
    if (li) {
      e.preventDefault();
      input.value = li.dataset.val;
      list.style.display = "none";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  let hideTimeout;
  input.addEventListener("input", function () {
    const val = this.value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!val) {
      list.style.display = "none";
      return;
    }

    const exactMatches = [];
    const partialMatches = [];

    // Respaldo por si la petición a la BD tarda en cargar
    const arr =
      Array.isArray(sourceArray) && sourceArray.length > 0
        ? sourceArray
        : window._knownSchools || [];

    arr.forEach((s) => {
      const rawStr = String(s || ""); // Prevenir que crashee si la BD manda un valor vacío
      const normalized = rawStr
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (!normalized) return;

      if (normalized.startsWith(val)) exactMatches.push(s);
      else if (normalized.includes(val)) partialMatches.push(s);
    });

    const matches = [...new Set([...exactMatches, ...partialMatches])].slice(
      0,
      10,
    );

    if (matches.length > 0) {
      list.innerHTML = matches
        .map((m) => {
          const escaped = m.replace(/"/g, "&quot;");
          return `<li class="sf-auto-item" data-val="${escaped}">
          <i class="fas ${iconClass}" style="color:#3b82f6; font-size: 0.9rem;"></i> ${escaped}
        </li>`;
        })
        .join("");
      list.style.display = "block";
    } else {
      list.innerHTML = `<li style="padding: 10px 14px; color: #f59e0b; font-size: 0.85rem; font-style: italic; display: flex; align-items: center; gap: 10px; text-align:left;">
        <i class="fas fa-plus-circle"></i> Nueva opción. Se guardará para revisión al crear tu cuenta.
      </li>`;
      list.style.display = "block";
    }
  });

  input.addEventListener("blur", () => {
    hideTimeout = setTimeout(() => (list.style.display = "none"), 200);
  });

  input.addEventListener("focus", () => {
    clearTimeout(hideTimeout);
    if (input.value) input.dispatchEvent(new Event("input"));
  });
}
