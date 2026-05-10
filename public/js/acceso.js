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

window.pendingVerificationEmail_V2 = "";
window.pendingRecoveryIdentifier_V2 = "";

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", () => {
  if (window._accesoDOMBound) return;
  window._accesoDOMBound = true;

  const session = sessionStorage.getItem(window.AUTH_SESSION_KEY_V2);
  const admin = sessionStorage.getItem("adminUser");
  const tallerista = sessionStorage.getItem("talleristaUser");
  if (admin) {
    window.location.replace("admin.html");
    return;
  }
  if (tallerista) {
    window.location.replace("tallerista.html");
    return;
  }
  if (session) {
    window.location.replace("usuario.html");
    return;
  }

  bindForms();
  bindModalControls();
  bindPasswordToggle();
  bindPasswordStrength();
  loadCountryOptions();
  applySecurityNotice();
  applyEntryMode();
  applyMobileRobotBackgroundFix();
  checkExistingIpBlock();
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
}

function openRegisterModal() {
  clearStatus();
  showModalForms({ register: true });
  openModal();
}

function openRecoverModal() {
  clearStatus();
  showModalForms({ recoverReq: true });
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
  window.pendingVerificationEmail_V2 = "";
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
        window.location.href = "admin.html";
      }, 800);
      return;
    }

    if (user.scope === "tallerista") {
      sessionStorage.setItem("talleristaUser", JSON.stringify(user));
      if (typeof window.showLoginSuccessOverlay === "function") {
        window.showLoginSuccessOverlay(
          false,
          user.full_name || user.username || "Profesor",
        );
      }
      setTimeout(() => {
        window.location.href = "tallerista.html";
      }, 800);
      return;
    }

    sessionStorage.setItem(window.AUTH_SESSION_KEY_V2, JSON.stringify(user));
    // Mostrar overlay de bienvenida antes de redirigir
    if (typeof window.showLoginSuccessOverlay === "function") {
      window.showLoginSuccessOverlay(
        false,
        user.full_name || user.username || "",
      );
    }
    setTimeout(() => {
      window.location.href = "usuario.html";
    }, 800);
  } catch (error) {
    if (handleIpBlockRequirement(error, "loginForm", "authStatus")) {
      return; // Bloqueo aplicado visualmente (campos deshabilitados)
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
    password: document.getElementById("regPassword").value,
    confirmPassword: document.getElementById("regPasswordConfirm").value,
  };

  if (payload.password !== payload.confirmPassword) {
    showStatus(
      "La contraseña y su confirmación no coinciden.",
      "error",
      "registerStatus",
    );
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Creando cuenta...");

  try {
    const result = await apiJson("auth-register.php", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    window.pendingVerificationEmail_V2 = payload.email;
    showModalForms({ verify: true });

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
        "Cuenta creada. Revisa tu correo para verificarla.",
        "success",
        "registerStatus",
      );
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
  } finally {
    setButtonLoading(
      btn,
      false,
      '<i class="fas fa-user-plus"></i> Crear mi cuenta',
    );
  }
}

/* ==================== VERIFICACIÓN ==================== */
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
    setTimeout(() => {
      closeRegisterModal();
      document.getElementById("registerForm")?.reset();
    }, 1500);
    window.pendingVerificationEmail_V2 = "";
  } catch (error) {
    showStatus(
      error.message || "No se pudo verificar el correo.",
      "error",
      "registerStatus",
    );
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
