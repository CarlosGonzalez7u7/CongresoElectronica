// ===== FUNCIONES GLOBALES Y UTILIDADES =====

/**
 * Genera un ID único para folios
 */
function generateFolio() {
  const timestamp = new Date().getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CON-2024-${random}${timestamp}`;
}

/**
 * Valida un email
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Valida un teléfono
 */
function validatePhone(phone) {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(String(phone)) && phone.replace(/\D/g, "").length >= 10;
}

/**
 * Formatea una fecha
 */
function formatDate(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formatea una hora
 */
function formatTime(date) {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Obtiene datos del localStorage
 */
function getFromStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error("Error al obtener del storage:", error);
    return defaultValue;
  }
}

/**
 * Guarda datos en localStorage
 */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error al guardar en storage:", error);
  }
}

/**
 * Limpia el localStorage
 */
function clearStorage(key = null) {
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      localStorage.clear();
    }
  } catch (error) {
    console.error("Error al limpiar storage:", error);
  }
}

/**
 * Descarga un archivo
 */
function downloadFile(content, filename, type = "application/octet-stream") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convierte datos a CSV
 */
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return "";

  // Obtener encabezados
  const headers = Object.keys(data[0]);
  const csv = [];

  // Agregar encabezados
  csv.push(headers.join(","));

  // Agregar datos
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header];
      if (typeof value === "string" && value.includes(",")) {
        return `"${value}"`;
      }
      return value || "";
    });
    csv.push(values.join(","));
  });

  return csv.join("\n");
}

/**
 * Convierte datos a JSON
 */
function convertToJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Muestra una notificación
 */
function showNotification(message, type = "info", duration = 3000) {
  // Implementar según necesidad
  console.log(`[${type.toUpperCase()}] ${message}`);
}

/**
 * Abre un modal
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
  }
}

/**
 * Cierra un modal
 */
function closeModal(modalId = null) {
  if (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("show");
    }
  } else {
    // Cierra todos los modales
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("show");
    });
  }
}

/**
 * Valida un formulario
 */
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;

  let isValid = true;
  const inputs = form.querySelectorAll("[required]");

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      markFieldError(input, "Este campo es obligatorio");
      isValid = false;
    } else {
      clearFieldError(input);

      // Validaciones específicas
      if (input.type === "email" && !validateEmail(input.value)) {
        markFieldError(input, "Email inválido");
        isValid = false;
      }

      if (input.name === "phone" && !validatePhone(input.value)) {
        markFieldError(input, "Teléfono inválido");
        isValid = false;
      }
    }
  });

  return isValid;
}

/**
 * Marca un campo con error
 */
function markFieldError(field, message = "") {
  const group = field.closest(".form-group");
  if (group) {
    group.classList.add("has-error");
    const errorEl = group.querySelector(".error-message");
    if (errorEl) {
      errorEl.textContent = message;
    }
  }
}

/**
 * Limpia errores de un campo
 */
function clearFieldError(field) {
  const group = field.closest(".form-group");
  if (group) {
    group.classList.remove("has-error");
    const errorEl = group.querySelector(".error-message");
    if (errorEl) {
      errorEl.textContent = "";
    }
  }
}

/**
 * Obtiene los datos de un formulario
 */
function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};

  const formData = new FormData(form);
  const data = {};

  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }

  return data;
}

/**
 * Rellena un formulario con datos
 */
function populateForm(formId, data) {
  const form = document.getElementById(formId);
  if (!form) return;

  Object.keys(data).forEach((key) => {
    const field = form.elements[key];
    if (field) {
      field.value = data[key];
    }
  });
}

/**
 * Deshabilita/Habilita un formulario
 */
function setFormDisabled(formId, disabled = true) {
  const form = document.getElementById(formId);
  if (!form) return;

  const inputs = form.querySelectorAll("input, select, textarea, button");
  inputs.forEach((input) => {
    input.disabled = disabled;
  });
}

/**
 * Exporta tabla HTML a Excel (CSV)
 */
function exportTableToExcel(tableId, filename = "export.csv") {
  const table = document.getElementById(tableId);
  if (!table) return;

  const csv = [];
  const rows = table.querySelectorAll("tr");

  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    const rowData = Array.from(cells).map((cell) => cell.textContent.trim());
    csv.push(rowData.join(","));
  });

  downloadFile(csv.join("\n"), filename, "text/csv");
}

/**
 * Lee un archivo como texto
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Lee un archivo como Data URL
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida tamaño de archivo
 */
function validateFileSize(file, maxSizeMB = 5) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

/**
 * Obtiene extensión de archivo
 */
function getFileExtension(filename) {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

/**
 * Valida tipo de archivo
 */
function validateFileType(
  file,
  allowedTypes = ["image/jpeg", "image/png", "application/pdf"],
) {
  return allowedTypes.includes(file.type);
}

/**
 * Genera un QR
 */
function generateQRCode(data, elementId) {
  if (typeof QRCode === "undefined") {
    console.error("QRCode library no loaded");
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) return;

  // Limpiar elemento
  element.innerHTML = "";

  // Generar QR
  new QRCode(element, {
    text: JSON.stringify(data),
    width: 256,
    height: 256,
    colorDark: "#1B396A",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

/**
 * Copia texto al portapapeles
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback para navegadores antiguos
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }
}

/**
 * Formatea moneda
 */
function formatCurrency(amount, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

/**
 * Obtiene nombre de categoría con ícono
 */
function getCategoryLabel(category) {
  const categories = {
    "robot-guerra-1lb": { label: "Robot de guerra 1 lb", icon: "chess-pawn" },
    "robot-guerra-3lb": { label: "Robot de guerra 3lb", icon: "shield-alt" },
    "seguidor-linea-profesional": {
      label: "Seguidor de línea profesional",
      icon: "line-chart",
    },
    "seguidor-linea-amateur": {
      label: "Seguidor de línea amateur",
      icon: "route",
    },
    "carros-rc": { label: "Carros RC", icon: "car-side" },
    "soccer-rc": { label: "Soccer RC", icon: "futbol" },
    "mini-sumo-rc": { label: "Mini sumo RC", icon: "ring" },
    "robot-insecto": { label: "Robot insecto", icon: "bug" },
  };
  return categories[category] || { label: category, icon: "robot" };
}

/**
 * Maneja errores comunes
 */
function handleError(error, context = "") {
  console.error(`Error ${context}:`, error);
  showNotification(`Error ${context}: ${error.message}`, "error");
}

// Inicialización al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  console.log("Script base cargado");

  // Protección básica contra inspección
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  document.addEventListener("keydown", function (e) {
    // Bloquear F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === "F12" ||
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key === "I" || e.key === "J" || e.key === "C")) ||
      (e.ctrlKey && e.key === "U")
    ) {
      e.preventDefault();
      return false;
    }
  });
});
