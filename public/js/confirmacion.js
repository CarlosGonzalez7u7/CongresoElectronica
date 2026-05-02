// ===== FUNCIONAMIENTO PÁGINA DE CONFIRMACIÓN =====

document.addEventListener("DOMContentLoaded", () => {
  initConfirmacionPage();
});

function initConfirmacionPage() {
  // Obtener datos del registro
  const registroData = getFromStorage("lastRegistro");

  if (!registroData) {
    // Si no hay datos, redirigir a registro
    window.location.href = "/registro";
    return;
  }

  // Llenar datos en la página
  populateConfirmationPage(registroData);

  // Generar código QR
  generateQRCode(registroData, "qrcode");

  // Event listeners para botones
  document.getElementById("printBtn").addEventListener("click", printPass);
  document.getElementById("downloadBtn").addEventListener("click", downloadQR);

  // Event listener para registrar otro robot
  const registerAnotherBtn = document.getElementById("registerAnotherBtn");
  if (registerAnotherBtn) {
    registerAnotherBtn.addEventListener("click", registerAnotherRobot);
  }
}

/**
 * Llena los datos de confirmación en la página
 */
function populateConfirmationPage(data) {
  // Nombre del robot
  document.getElementById("robotNameDisplay").textContent = data.robot;

  // Número de folio
  document.getElementById("folioNumber").textContent = data.folio;

  // Categoría
  const categoryLabel = getCategoryLabel(data.category).label;
  document.getElementById("categoryDisplay").textContent = categoryLabel;

  // Capitán
  document.getElementById("captainDisplay").textContent = data.captain;

  // Escuela
  document.getElementById("schoolDisplay").textContent = data.school;

  // Email
  document.getElementById("emailDisplay").textContent = data.email;

  // Hora de escaneo
  const scanTime = new Date(data.timestamp);
  document.getElementById("scanTime").textContent =
    formatDate(scanTime) + " a las " + formatTime(scanTime);
}

/**
 * Imprime el pase
 */
function printPass() {
  window.print();
}

/**
 * Descarga el código QR
 */
function downloadQR() {
  const canvas = document.querySelector("#qrcode canvas");
  if (!canvas) {
    showNotification("Error al descargar el QR", "error");
    return;
  }

  const registroData = getFromStorage("lastRegistro");
  const folio = registroData.folio;

  // Convertir canvas a imagen
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR_${folio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

/**
 * Muestra notificación
 */
function showNotification(message, type = "info") {
  console.log(`[${type}] ${message}`);
  // Aquí se podría agregar un sistema de notificaciones visual
}

/**
 * Limpia el formulario y redirige para registrar otro robot
 */
function registerAnotherRobot() {
  // Limpiar datos del último registro
  removeFromStorage("lastRegistro");
  removeFromStorage("registroForm");

  // Limpiar el documento de formulario si existe (localStorage)
  localStorage.removeItem("lastRegistro");
  localStorage.removeItem("registroForm");

  // Mostrar mensajeconfirmará al usuario
  if (
    confirm("Se limpiarán los datos del registro anterior. ¿Deseas continuar?")
  ) {
    // Redirigir a formulario de registro limpio
    window.location.href = "/registro";
  }
}
