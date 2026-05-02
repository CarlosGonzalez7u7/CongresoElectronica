const SESSION_KEY = "renovatec_user_session_v1";
let currentUser = null;

const REQUEST_STATE_MAP = {
  approved: { label: "Aceptado", css: "approved" },
  paid: { label: "Aceptado", css: "approved" },
  pending: { label: "Pendiente de revisión", css: "pending" },
  rejected: { label: "Rechazado", css: "rejected" },
  resubmit_requested: { label: "Reenviar comprobante", css: "resubmit" },
};

const REQUEST_ROBOT_CATEGORY_ALIASES = {
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

const PROFILE_RECEIPT_MAX_SIZE = 20 * 1024 * 1024;

document.addEventListener("DOMContentLoaded", () => {
  initSession();
  initTabs();
  initForms();
  initRequestSection();
});

function getProjectBasePath() {
  const marker = "/public/";
  const idx = window.location.pathname.indexOf(marker);
  return idx >= 0 ? window.location.pathname.substring(0, idx) : "";
}

function getApiUrl(endpoint) {
  // En producción (Apache con .htaccess), las APIs están en /app/api/
  // En desarrollo local (php -S con router.php), también en /app/api/
  // Usamos ruta absoluta desde la raíz del dominio para evitar problemas de caché y reescritura
  const base = getProjectBasePath();
  return `${base}/app/api/${endpoint}`;
}

function initSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    window.location.href = "acceso.html";
    return;
  }

  try {
    currentUser = JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "acceso.html";
    return;
  }

  paintUserHeader();
  fillPersonalForm();
}

function paintUserHeader() {
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");

  const fullName =
    currentUser?.full_name ||
    currentUser?.profile?.full_name ||
    currentUser?.username ||
    "Participante";

  const email = currentUser?.email || currentUser?.profile?.email || "";

  if (nameEl) nameEl.textContent = fullName;
  if (emailEl) emailEl.textContent = email || "Sin correo";
}

function fillPersonalForm() {
  const profile = currentUser?.profile || {};

  setValue("fullName", currentUser?.full_name || profile?.full_name || "");
  setValue("email", currentUser?.email || profile?.email || "");
  setValue("phone", profile?.phone || "");
  setValue("school", profile?.school || "");
  setValue(
    "matricula",
    profile?.matricula ||
      profile?.control_number ||
      currentUser?.username ||
      "",
  );
  setValue("city", profile?.city || "");
  setValue("country", profile?.country || "");
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");

  const activateProfileSection = (target) => {
    if (!target) return;
    const targetSection = document.getElementById(`section-${target}`)
      ? target
      : "personal";
    tabs.forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".profile-section")
      .forEach((s) => s.classList.remove("active"));

    document
      .querySelector(`.nav-tab[data-section="${targetSection}"]`)
      ?.classList.add("active");
    document
      .getElementById(`section-${targetSection}`)
      ?.classList.add("active");

    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("section", targetSection);
      history.replaceState({}, "", currentUrl.toString());
    } catch {}
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-section");
      if (!target) return;
      activateProfileSection(target);
    });
  });

  const fromQuery = new URLSearchParams(window.location.search).get("section");
  const fromHash = window.location.hash.replace("#", "").trim();
  const initialSection = fromQuery || fromHash;
  if (initialSection) {
    activateProfileSection(initialSection);
  }
}

function initForms() {
  document.getElementById("personalForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const updatedProfile = {
      ...(currentUser?.profile || {}),
      full_name: document.getElementById("fullName")?.value.trim() || "",
      phone: document.getElementById("phone")?.value.trim() || "",
      school: document.getElementById("school")?.value.trim() || "",
      matricula: document.getElementById("matricula")?.value.trim() || "",
      // También guardamos como control_number para que tramite.js lo lea correctamente
      control_number: document.getElementById("matricula")?.value.trim() || "",
      city: document.getElementById("city")?.value.trim() || "",
      country: document.getElementById("country")?.value || "",
    };

    currentUser = {
      ...currentUser,
      full_name: updatedProfile.full_name || currentUser.full_name,
      profile: updatedProfile,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    paintUserHeader();
    showToast("Perfil actualizado correctamente", "success");
  });

  document.getElementById("securityForm")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword")?.value;
    const newPassword = document.getElementById("newPassword")?.value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Completa todos los campos de seguridad", "error");
      return;
    }

    if (newPassword.length < 8) {
      showToast(
        "La nueva contrasena debe tener al menos 8 caracteres",
        "error",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("La confirmacion de contrasena no coincide", "error");
      return;
    }

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    showToast(
      "Contrasena validada. Integra el endpoint para persistir el cambio",
      "success",
    );
  });
}

function initRequestSection() {
  const uploadForm = document.getElementById("profileUploadReceiptForm");
  const uploadInput = document.getElementById("profileUploadReceiptFile");
  const clearButton = document.getElementById("profileUploadClearButton");

  uploadForm?.addEventListener("submit", handleProfileUploadReceipt);
  uploadInput?.addEventListener("change", handleProfileReceiptFileChange);
  clearButton?.addEventListener("click", clearProfileSelectedReceipt);

  fetchRequestForProfile();
}

function showProfileRequestPanel(which) {
  const map = {
    loading: "profileRequestLoadingPanel",
    noRequest: "profileNoRequestPanel",
    result: "profileRequestResult",
    // "error" apunta al mismo panel de "noRequest" — muestra el mensaje de error
    // dentro del panel vacío en lugar de quedarse en "loading" para siempre
    error: "profileNoRequestPanel",
  };
  // Si "error" y "noRequest" apuntan al mismo id, solo esconder los demás
  const targetId = map[which];
  Object.entries(map).forEach(([key, id]) => {
    const node = document.getElementById(id);
    if (!node) return;
    // Mostrar si el id coincide con el target (cubre el caso error=noRequest)
    node.style.display = id === targetId ? "" : "none";
  });
}

function setProfileRequestMessage(message, type = "") {
  const node = document.getElementById("profileLookupMessage");
  if (!node) return;
  node.textContent = message;
  node.className = `lookup-message ${type}`;
  node.style.display = message ? "block" : "none";
}

async function fetchRequestForProfile() {
  const userId = currentUser?.id || currentUser?.user_id || currentUser?.userId;

  // Debug: mostrar en consola qué usuario se detectó
  console.log("[perfil] currentUser:", JSON.stringify(currentUser));
  console.log("[perfil] userId resuelto:", userId);
  console.log(
    "[perfil] URL del fetch:",
    getApiUrl("congress-request-status.php") +
      "?userId=" +
      encodeURIComponent(userId),
  );

  if (!userId) {
    console.warn(
      "[perfil] No se encontró userId en la sesión. Revisa el campo en localStorage.",
    );
    showProfileRequestPanel("noRequest");
    setProfileRequestMessage(
      "No se pudo identificar tu sesión. Intenta cerrar sesión y volver a entrar.",
      "error",
    );
    return;
  }

  showProfileRequestPanel("loading");
  setProfileRequestMessage("");

  // Timeout de 12s para no quedarse cargando para siempre
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn("[perfil] fetch abortado por timeout");
  }, 12000);

  try {
    const response = await fetch(
      `${getApiUrl("congress-request-status.php")}?userId=${encodeURIComponent(userId)}`,
      {
        headers: { "X-Requested-With": "XMLHttpRequest" },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    console.log("[perfil] HTTP status:", response.status, response.statusText);

    // Leer el body como texto primero para poder hacer debug si no es JSON válido
    const rawText = await response.text();
    console.log(
      "[perfil] respuesta raw (primeros 400 chars):",
      rawText.slice(0, 400),
    );

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("[perfil] La respuesta no es JSON válido:", parseErr);
      showProfileRequestPanel("noRequest");
      setProfileRequestMessage(
        `Error del servidor (${response.status}). Contacta al administrador.`,
        "error",
      );
      return;
    }

    if (!response.ok) {
      console.warn("[perfil] HTTP no-ok:", response.status, result);
      showProfileRequestPanel("noRequest");
      setProfileRequestMessage(
        result?.error || `Error ${response.status}. Intenta recargar.`,
        "error",
      );
      return;
    }

    if (result.success && result.data) {
      showProfileRequestPanel("result");
      renderProfileRequest(result.data);
    } else if (result.success && result.data === null) {
      // Sin solicitud registrada todavía — estado normal
      showProfileRequestPanel("noRequest");
    } else {
      console.warn("[perfil] Respuesta inesperada:", result);
      showProfileRequestPanel("noRequest");
      setProfileRequestMessage(
        result?.error || "No se pudo cargar tu solicitud.",
        "error",
      );
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[perfil] Error en fetch:", error.name, error.message);

    const isTimeout = error.name === "AbortError";
    const isNetwork = error.name === "TypeError";

    showProfileRequestPanel("noRequest");
    setProfileRequestMessage(
      isTimeout
        ? "La solicitud tardó demasiado. Verifica tu conexión y recarga."
        : isNetwork
          ? "No se pudo conectar al servidor. Verifica tu red y recarga."
          : "Error inesperado. Abre la consola del navegador (F12) para más detalles.",
      "error",
    );
  }
}

function renderProfileRequest(data) {
  const profile =
    data.profile_snapshot && typeof data.profile_snapshot === "object"
      ? data.profile_snapshot
      : {};
  const members = Array.isArray(data.members_snapshot)
    ? data.members_snapshot
    : [];
  const robots = Array.isArray(data.robots_snapshot)
    ? data.robots_snapshot
    : [];
  const status = String(data.status || "pending").toLowerCase();

  const statusMeta = (status === "pending" && !data.has_receipt
    ? { label: "Pendiente de pago", css: "resubmit" }
    : REQUEST_STATE_MAP[status]) || { label: "Pendiente", css: "pending" };

  const statusNode = document.getElementById("profileResultStatus");
  if (statusNode) {
    statusNode.textContent = statusMeta.label;
    statusNode.className = `status-badge ${statusMeta.css}`;
  }

  const contextBanner = document.getElementById("profileResultContextBanner");
  if (contextBanner) {
    const bannerMessages = {
      "pending-no-receipt": {
        icon: "fa-clock",
        color: "#f97316",
        text: "Tu solicitud está guardada. Cuando realices el pago, sube tu comprobante aquí para enviarla a revisión.",
      },
      pending: {
        icon: "fa-hourglass-half",
        color: "#f2a900",
        text: "Tu comprobante fue recibido. El equipo de RENOVATEC lo está revisando.",
      },
      approved: {
        icon: "fa-check-circle",
        color: "#22c55e",
        text: "¡Tu solicitud fue aceptada! Estás inscrito en RENOVATEC 2026.",
      },
      rejected: {
        icon: "fa-times-circle",
        color: "#ef4444",
        text: "Tu solicitud fue rechazada. Revisa el motivo abajo y edita o reenvía tu comprobante.",
      },
      resubmit_requested: {
        icon: "fa-arrow-rotate-left",
        color: "#38bdf8",
        text: "El equipo solicitó un nuevo comprobante. Sube el correcto para continuar.",
      },
    };

    const key =
      status === "pending" && !data.has_receipt ? "pending-no-receipt" : status;
    const info = bannerMessages[key];

    if (info) {
      contextBanner.style.display = "flex";
      contextBanner.style.borderColor = info.color;
      contextBanner.style.color = info.color;
      contextBanner.innerHTML = `<i class="fas ${info.icon}" style="flex-shrink:0;margin-top:2px"></i><span>${info.text}</span>`;
    } else {
      contextBanner.style.display = "none";
    }
  }

  setProfileText("profileResultFolio", data.request_folio || "-");
  setProfileText("profileResultYear", data.congress_year || "-");
  setProfileText("profileResultTeamFolio", data.team_folio || "No asignado");
  setProfileText("profileResultPackages", getProfilePackageLabel(data));
  setProfileText(
    "profileResultCongressFee",
    formatProfileCurrency(data.congress_fee),
  );
  setProfileText(
    "profileResultRoboticsFee",
    formatProfileCurrency(data.robotics_fee),
  );
  setProfileText("profileResultCampFee", formatProfileCurrency(data.camp_fee));
  setProfileText("profileResultTotal", formatProfileCurrency(data.total_fee));
  setProfileText(
    "profileResultReceipt",
    data.receipt_filename || "Aún no subido",
  );
  setProfileText("profileResultCreated", formatProfileDate(data.created_at));
  setProfileText("profileResultReviewed", formatProfileDate(data.reviewed_at));

  setProfileText("profileResultProfileName", profile.full_name || "-");
  setProfileText(
    "profileResultProfileEmail",
    profile.email || currentUser?.email || "-",
  );
  setProfileText("profileResultProfilePhone", profile.phone || "-");
  setProfileText("profileResultProfileSchool", profile.school || "-");
  setProfileText("profileResultProfileCareer", profile.career || "-");
  setProfileText("profileResultProfileSemester", profile.semester || "-");
  setProfileText(
    "profileResultProfileControlNumber",
    profile.control_number || "-",
  );
  setProfileText("profileResultProfileCountry", profile.country || "-");
  setProfileText("profileResultProfileCity", profile.city || "-");

  renderProfileMembers(members);
  renderProfileRobots(robots);
  renderProfileReceiptActions(data.receipt_filename);

  const qr = document.getElementById("profileResultQrImage");
  if (qr && data.request_folio) {
    const text = `RENOVATEC|SOLICITUD|${data.request_folio}|TOTAL:${data.total_fee}`;
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=0c1222&margin=6`;
  }

  const note = document.getElementById("profileResultAdminNote");
  if (note) {
    const content = data.rejection_reason || data.admin_notes;
    note.style.display = content ? "block" : "none";
    note.textContent = content || "";
  }

  // perfil.js — dentro de renderProfileRequest(), al final
  const editLink = document.getElementById("profileEditRequestLink");
  if (editLink) {
    const canEdit =
      status !== "approved" &&
      status !== "paid" &&
      (!data.has_receipt ||
        status === "rejected" ||
        status === "resubmit_requested");
    editLink.style.display = canEdit ? "inline-flex" : "none";
    // ← CAMBIO: llevar al paso 5 cuando hay solicitud existente
    editLink.href = "tramite.html?resume=5";
  }

  const uploadForm = document.getElementById("profileUploadReceiptForm");
  if (uploadForm) {
    const canUpload = status !== "approved" && status !== "paid";
    uploadForm.style.display = canUpload ? "grid" : "none";
    uploadForm.dataset.requestFolio = data.request_folio || "";
  }
}

async function handleProfileUploadReceipt(event) {
  event.preventDefault();

  const form = document.getElementById("profileUploadReceiptForm");
  const requestFolio = form?.dataset.requestFolio || "";
  const file = document.getElementById("profileUploadReceiptFile")?.files?.[0];
  const userId = currentUser?.id || currentUser?.user_id || currentUser?.userId;

  if (!userId) {
    setProfileRequestMessage(
      "Necesitas iniciar sesión para subir comprobantes.",
      "error",
    );
    return;
  }
  if (!requestFolio) {
    setProfileRequestMessage(
      "No hay folio de solicitud para actualizar.",
      "error",
    );
    return;
  }
  if (!file) {
    setProfileRequestMessage(
      "Selecciona un comprobante antes de enviar.",
      "error",
    );
    return;
  }

  if (file.size > PROFILE_RECEIPT_MAX_SIZE) {
    setProfileRequestMessage(
      "El archivo es demasiado grande. Usa un comprobante de hasta 20MB.",
      "error",
    );
    return;
  }

  setProfileUploadProgress(true);

  const formData = new FormData();
  formData.append("userId", String(userId));
  formData.append("request_folio", requestFolio);
  formData.append("receipt", file);

  const submitBtn = document.getElementById("profileUploadReceiptSubmitButton");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
  }

  try {
    setProfileRequestMessage("Subiendo comprobante...", "info");
    const response = await fetch(getApiUrl("congress-upload-receipt.php"), {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "No se pudo subir el comprobante");
    }

    setProfileRequestMessage(
      "¡Comprobante enviado! Tu solicitud está en revisión.",
      "success",
    );
    clearProfileSelectedReceipt();
    await fetchRequestForProfile();
  } catch (error) {
    setProfileRequestMessage(
      error.message || "No se pudo subir el comprobante.",
      "error",
    );
  } finally {
    setProfileUploadProgress(false);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<i class="fas fa-paper-plane"></i> Enviar comprobante';
    }
  }
}

function handleProfileReceiptFileChange(event) {
  const file = event?.target?.files?.[0];
  const fileNameNode = document.getElementById("profileUploadReceiptFileName");
  const dropzone = document.getElementById("profileUploadDropzone");
  const preview = document.getElementById("profileUploadPreview");
  const previewName = document.getElementById("profileUploadPreviewName");
  if (!fileNameNode || !dropzone || !preview || !previewName) return;

  if (!file) {
    fileNameNode.textContent = "Ningún archivo seleccionado";
    dropzone.classList.remove("has-file");
    preview.classList.add("hidden");
    previewName.textContent = "-";
    setProfileRequestMessage("");
    return;
  }

  if (file.size > PROFILE_RECEIPT_MAX_SIZE) {
    fileNameNode.textContent = "Ningún archivo seleccionado";
    dropzone.classList.remove("has-file");
    preview.classList.add("hidden");
    previewName.textContent = "-";
    event.target.value = "";
    setProfileRequestMessage(
      "Archivo demasiado grande. El máximo permitido es 20MB.",
      "error",
    );
    return;
  }

  fileNameNode.textContent = `Archivo seleccionado: ${file.name}`;
  dropzone.classList.add("has-file");
  preview.classList.remove("hidden");
  previewName.textContent = `${file.name} (${formatProfileBytes(file.size)})`;
  setProfileRequestMessage("");
}

function clearProfileSelectedReceipt() {
  const input = document.getElementById("profileUploadReceiptFile");
  if (input) input.value = "";

  const fileNameNode = document.getElementById("profileUploadReceiptFileName");
  const dropzone = document.getElementById("profileUploadDropzone");
  const preview = document.getElementById("profileUploadPreview");
  const previewName = document.getElementById("profileUploadPreviewName");

  if (fileNameNode) fileNameNode.textContent = "Ningún archivo seleccionado";
  if (dropzone) dropzone.classList.remove("has-file");
  if (preview) preview.classList.add("hidden");
  if (previewName) previewName.textContent = "-";
}

function setProfileUploadProgress(isUploading) {
  const bar = document.getElementById("profileUploadProgress");
  if (!bar) return;
  bar.classList.toggle("hidden", !isUploading);
}

function formatProfileBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function setProfileText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function formatProfileCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`;
}

function formatProfileDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX");
}

function getProfilePackageLabel(data) {
  const labels = [];
  if (data.includes_congress) labels.push("Congreso");
  if (data.includes_robotics) labels.push("Robótica");
  if (data.includes_camp) labels.push("Campamento");
  return labels.length ? labels.join(" + ") : "Sin paquetes";
}

function renderProfileMembers(members) {
  const list = document.getElementById("profileResultMembersList");
  if (!list) return;

  const cleaned = members
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  if (!cleaned.length) {
    list.innerHTML = "<li>Sin integrantes adicionales registrados</li>";
    return;
  }

  list.innerHTML = cleaned
    .map((name) => `<li>${escapeProfileHtml(name)}</li>`)
    .join("");
}

function renderProfileRobots(robots) {
  const list = document.getElementById("profileResultRobotsList");
  if (!list) return;

  if (!robots.length) {
    list.innerHTML = "<li>Sin robots registrados</li>";
    return;
  }

  list.innerHTML = robots
    .map((robot, index) => {
      const name = String(
        robot?.name || robot?.robot_name || `Robot ${index + 1}`,
      );
      const category = normalizeProfileRobotCategory(
        robot?.category || robot?.cat,
      );
      return `<li><strong>${escapeProfileHtml(name)}</strong><span>${escapeProfileHtml(category)}</span></li>`;
    })
    .join("");
}

function normalizeProfileRobotCategory(category) {
  const raw = String(category || "").trim();
  if (!raw) return "Sin categoría";
  return REQUEST_ROBOT_CATEGORY_ALIASES[raw.toLowerCase()] || raw;
}

function renderProfileReceiptActions(filename) {
  const wrap = document.getElementById("profileResultReceiptActions");
  const viewLink = document.getElementById("profileViewReceiptLink");
  const downloadLink = document.getElementById("profileDownloadReceiptLink");
  if (!wrap || !viewLink || !downloadLink) return;

  const safeFilename = String(filename || "").trim();
  if (!safeFilename) {
    wrap.style.display = "none";
    viewLink.href = "#";
    downloadLink.href = "#";
    return;
  }

  const receiptUrl = `${getApiUrl("get-receipt.php")}?filename=${encodeURIComponent(safeFilename)}`;
  wrap.style.display = "flex";
  viewLink.href = receiptUrl;
  downloadLink.href = receiptUrl;
  downloadLink.setAttribute("download", safeFilename);
}

function escapeProfileHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cambiarAvatar(input) {
  const file = input?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Selecciona una imagen valida", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const avatar = document.getElementById("avatarDisplay");
    if (!avatar) return;
    avatar.innerHTML = `<img src="${e.target.result}" alt="Avatar de usuario" />`;
    showToast("Foto de perfil actualizada", "success");
  };
  reader.readAsDataURL(file);
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const willShow = input.type === "password";
  input.type = willShow ? "text" : "password";

  const button = input
    .closest(".password-input")
    ?.querySelector(".toggle-password");
  if (!button) return;

  const eyeOpen = button.querySelector(".eye-open");
  const eyeClosed = button.querySelector(".eye-closed");

  if (eyeOpen) eyeOpen.classList.toggle("hidden", willShow);
  if (eyeClosed) eyeClosed.classList.toggle("hidden", !willShow);
}

function cerrarSesion() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "acceso.html";
}

function showToast(message, type = "success") {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
