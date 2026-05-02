/**
 * acceso.js — RENOVATEC v20260423
 * Lógica de autenticación para acceso.html
 * Compatible con el rediseño profesional y modo debug de backend
 */

const AUTH_SESSION_KEY = "renovatec_user_session_v1";

const COUNTRIES = [
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

let pendingVerificationEmail = "";
let pendingRecoveryIdentifier = "";

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", () => {
  bindForms();
  bindModalControls();
  bindPasswordToggle();
  bindPasswordStrength();
  loadSchoolSuggestions();
  loadCountryOptions();
});

/* ==================== RUTAS ==================== */
function getProjectBasePath() {
  const marker = "/public/";
  const idx = window.location.pathname.indexOf(marker);
  return idx >= 0 ? window.location.pathname.substring(0, idx) : "";
}

function getApiUrl(endpoint) {
  return `${getProjectBasePath()}/app/api/${endpoint}`;
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
  pendingVerificationEmail = "";
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

  try {
    const result = await apiJson("auth-login.php", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const user = result.data;

    if (user.scope === "admin") {
      localStorage.setItem("adminUser", JSON.stringify(user));
      showStatus(
        "Acceso administrativo. Redirigiendo...",
        "success",
        "authStatus",
      );
      setTimeout(() => {
        window.location.href = "/public/admin.html";
      }, 700);
      return;
    }

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    showStatus(
      "Acceso correcto. Redirigiendo a tu panel...",
      "success",
      "authStatus",
    );
    setTimeout(() => {
      window.location.href = "/public/usuario.html";
    }, 700);
  } catch (error) {
    showStatus(
      error.message || "No se pudo iniciar sesión.",
      "error",
      "authStatus",
    );
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

  if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
    showStatus(
      "El número de teléfono parece ser inválido.",
      "error",
      "registerStatus",
    );
    document.getElementById("regPhone").focus();
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

    pendingVerificationEmail = payload.email;
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

  if (!pendingVerificationEmail) {
    showStatus("Primero crea una cuenta.", "error", "registerStatus");
    return;
  }

  const btn = event.target.querySelector("button[type=submit]");
  setButtonLoading(btn, true, "Verificando...");

  try {
    await apiJson("auth-verify-email.php", {
      method: "POST",
      body: JSON.stringify({ email: pendingVerificationEmail, code }),
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
    pendingVerificationEmail = "";
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

    pendingRecoveryIdentifier = identifier;
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

  if (!pendingRecoveryIdentifier) {
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
        identifier: pendingRecoveryIdentifier,
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
    pendingRecoveryIdentifier = "";
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

/* ==================== SUGERENCIAS ==================== */
async function loadSchoolSuggestions() {
  const datalist = document.getElementById("schoolSuggestions");
  if (!datalist) return;
  try {
    const result = await apiJson("auth-schools.php", { method: "GET" });
    const schools = Array.isArray(result.data?.schools)
      ? result.data.schools
      : [];
    datalist.innerHTML = schools
      .map((s) => `<option value="${escapeHtml(s)}"></option>`)
      .join("");
  } catch {
    datalist.innerHTML = "";
  }
}

function loadCountryOptions() {
  const datalist = document.getElementById("countryOptions");
  if (!datalist) return;
  datalist.innerHTML = COUNTRIES.map(
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
    throw new Error(result.error || `Error HTTP ${response.status}`);
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
  return COUNTRIES.map(normalizeText);
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
