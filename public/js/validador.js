// ===== FUNCIONAMIENTO VALIDADOR QR =====

let cameraStream = null;
let scanHistory = [];
let isScanning = false;

document.addEventListener("DOMContentLoaded", () => {
  initValidador();
});

function initValidador() {
  // Cargar historial
  scanHistory = getFromStorage("scanHistory", []);
  updateHistoryDisplay();

  // Solicitar acceso a cámara
  requestCameraAccess();

  // Event listeners
  document
    .getElementById("clearHistoryBtn")
    .addEventListener("click", clearScanHistory);
  document.getElementById("marcarBtn").addEventListener("click", marcarEntrada);

  const retryBtn = document.getElementById("retryCameraBtn");
  if (retryBtn) {
    retryBtn.addEventListener("click", requestCameraAccess);
  }
}

function isLocalhostHost() {
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function getCameraErrorMessage(error) {
  if (!error) {
    return "No se pudo abrir la camara.";
  }

  if (error.name === "NotAllowedError") {
    return "Permiso denegado. Activa la camara para este sitio en tu navegador.";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No se encontro una camara disponible en este dispositivo.";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "La camara esta siendo usada por otra app. Cierra otras apps y reintenta.";
  }

  if (error.name === "OverconstrainedError") {
    return "No fue posible usar la camara trasera. Reintentando con otra camara.";
  }

  return `No se pudo abrir la camara (${error.name || "error desconocido"}).`;
}

function normalizeFolio(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function extractFieldFromText(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedLabel}\\s*:\\s*(.+)`, "i");
  const match = String(text || "").match(pattern);
  return match ? match[1].trim() : "";
}

function parseQRPayload(qrData) {
  const raw = String(qrData || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const folio = normalizeFolio(parsed.folio || parsed.Folio || "");
    if (!folio) {
      return null;
    }

    return {
      folio,
      robot: parsed.robot || parsed.robot_name || `Equipo ${folio}`,
      category: parsed.category || parsed.categoria || "No especificada",
      captain: parsed.captain || parsed.capitan || "No especificado",
      school: parsed.school || parsed.escuela || "No especificada",
      timestamp: new Date().toISOString(),
    };
  } catch {
    // Si no es JSON, intentar extraer los campos desde texto legible.
  }

  const folioLine = extractFieldFromText(raw, "Folio");
  const folio = normalizeFolio(
    folioLine || raw.match(/RENOV-\d{14}-\d{4}/i)?.[0] || "",
  );
  if (!folio) {
    return null;
  }

  return {
    folio,
    robot: extractFieldFromText(raw, "Robot") || `Equipo ${folio}`,
    category: extractFieldFromText(raw, "Categoria") || "No especificada",
    captain:
      extractFieldFromText(raw, "Capitan") ||
      extractFieldFromText(raw, "Capit\u00e1n") ||
      "No especificado",
    school: extractFieldFromText(raw, "Escuela") || "No especificada",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Solicita acceso a la cámara
 */
async function requestCameraAccess() {
  const permissionAlert = document.getElementById("permissionAlert");
  const permissionText = permissionAlert
    ? permissionAlert.querySelector("p")
    : null;

  try {
    if (!window.isSecureContext && !isLocalhostHost()) {
      if (permissionText) {
        permissionText.textContent =
          "En celular la camara solo funciona con HTTPS. Abre este sitio con https:// o usa localhost en la misma computadora.";
      }
      if (permissionAlert) {
        permissionAlert.style.display = "flex";
      }
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (permissionText) {
        permissionText.textContent =
          "Tu navegador no soporta acceso a camara. Prueba con Chrome o Safari actualizados.";
      }
      if (permissionAlert) {
        permissionAlert.style.display = "flex";
      }
      return;
    }

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }

    const video = document.getElementById("camera");
    video.setAttribute("playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;

    let stream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (primaryError) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      console.warn(getCameraErrorMessage(primaryError));
    }

    cameraStream = stream;
    video.srcObject = stream;

    // Esperar a que el video esté listo
    video.onloadedmetadata = () => {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch((err) => {
          console.warn("No se pudo reproducir video automaticamente:", err);
        });
      }
      startScanning();
    };

    if (permissionAlert) {
      permissionAlert.style.display = "none";
    }
  } catch (error) {
    console.error("Error al acceder a la cámara:", error);
    if (permissionText) {
      permissionText.textContent = getCameraErrorMessage(error);
    }
    if (permissionAlert) {
      permissionAlert.style.display = "flex";
    }
  }
}

/**
 * Inicia el escaneo de QR
 */
function startScanning() {
  if (isScanning) return;
  isScanning = true;

  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  function scan() {
    if (!isScanning) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      handleQRDetected(code.data);
    }

    requestAnimationFrame(scan);
  }

  scan();
}

/**
 * Maneja QR detectado
 */
function handleQRDetected(qrData) {
  try {
    const data = parseQRPayload(qrData);
    if (!data || !data.folio) {
      showResult("invalid");
      logScan("unknown", "error", null);
      return;
    }

    // Verificar si ya fue escaneado
    const existingScan = scanHistory.find((scan) => scan.folio === data.folio);
    if (existingScan && existingScan.status === "marked") {
      showResult("duplicate", data);
      logScan(data.folio, "duplicate", data);
      return;
    }

    // Mostrar resultado válido
    showResult("valid", data);
    logScan(data.folio, "valid", data);
  } catch (error) {
    console.error("Error al procesar QR:", error);
    showResult("invalid");
    logScan("unknown", "error", null);
  }
}

/**
 * Muestra el resultado del escaneo
 */
function showResult(type, data = null) {
  const modal = document.getElementById("resultModal");
  const validResult = document.getElementById("validResult");
  const invalidResult = document.getElementById("invalidResult");
  const duplicateResult = document.getElementById("duplicateResult");

  // Ocultar todos
  validResult.style.display = "none";
  invalidResult.style.display = "none";
  duplicateResult.style.display = "none";

  if (type === "valid") {
    validResult.style.display = "block";
    populateValidResult(data);
  } else if (type === "duplicate") {
    duplicateResult.style.display = "block";
    populateDuplicateResult(data);
  } else {
    invalidResult.style.display = "block";
  }

  modal.classList.add("show");

  // Cerrar automáticamente después de 10 segundos
  setTimeout(() => {
    if (!isMarking) {
      closeResult();
    }
  }, 10000);
}

let isMarking = false;

/**
 * Llena los datos del resultado válido
 */
function populateValidResult(data) {
  document.getElementById("resultFolio").textContent = data.folio;
  document.getElementById("resultRobot").textContent =
    data.robot || `Equipo ${data.folio}`;
  document.getElementById("resultCategory").textContent =
    getCategoryLabel(data.category).label || data.category || "No especificada";
  document.getElementById("resultCaptain").textContent =
    data.captain || "No especificado";
  document.getElementById("resultSchool").textContent =
    data.school || "No especificada";
  document.getElementById("scanTime").textContent =
    formatDate(new Date(data.timestamp)) +
    " " +
    formatTime(new Date(data.timestamp));

  // Guardar referencia para el botón marcar
  document.getElementById("marcarBtn").dataset.folio = data.folio;
}

/**
 * Llena los datos del resultado duplicado
 */
function populateDuplicateResult(data) {
  document.getElementById("dupResultFolio").textContent = data.folio;
  document.getElementById("dupResultRobot").textContent =
    data.robot || `Equipo ${data.folio}`;

  const existingScan = scanHistory.find((scan) => scan.folio === data.folio);
  if (existingScan) {
    document.getElementById("dupResultTime").textContent =
      formatDate(new Date(existingScan.timestamp)) +
      " " +
      formatTime(new Date(existingScan.timestamp));
  }
}

/**
 * Cierra el resultado
 */
function closeResult() {
  document.getElementById("resultModal").classList.remove("show");
}

let markedFolio = null;

/**
 * Marca entrada del equipo
 */
function marcarEntrada() {
  isMarking = true;
  const folio = document.getElementById("marcarBtn").dataset.folio;

  if (!folio) return;

  // Actualizar historial
  const existingScan = scanHistory.find((scan) => scan.folio === folio);
  if (existingScan) {
    existingScan.status = "marked";
    existingScan.markedTime = new Date().toISOString();
  } else {
    const lastScan = scanHistory[scanHistory.length - 1];
    if (lastScan) {
      lastScan.status = "marked";
      lastScan.markedTime = new Date().toISOString();
    }
  }

  saveToStorage("scanHistory", scanHistory);
  updateHistoryDisplay();
  updateStats();

  // Cambiar botón
  const btn = document.getElementById("marcarBtn");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-check"></i> Entrada Marcada';
  btn.disabled = true;

  // Cerrar modal después de 2 segundos
  setTimeout(() => {
    closeResult();
    btn.innerHTML = originalText;
    btn.disabled = false;
    isMarking = false;
  }, 2000);
}

/**
 * Registra un escaneo en el historial
 */
function logScan(folio, status, data) {
  const scan = {
    folio,
    status,
    data,
    timestamp: new Date().toISOString(),
    markedTime: null,
  };

  scanHistory.unshift(scan);

  // Limitar historial a 50 elementos
  if (scanHistory.length > 50) {
    scanHistory.pop();
  }

  saveToStorage("scanHistory", scanHistory);
  updateHistoryDisplay();
  updateStats();
}

/**
 * Actualiza la visualización del historial
 */
function updateHistoryDisplay() {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  if (scanHistory.length === 0) {
    historyList.innerHTML =
      '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">Sin escaneos</p>';
    return;
  }

  scanHistory.slice(0, 10).forEach((scan) => {
    const item = document.createElement("div");
    item.className = `history-item ${scan.status}`;

    const statusText =
      scan.status === "marked"
        ? "Marcado"
        : scan.status === "duplicate"
          ? "Duplicado"
          : scan.status === "valid"
            ? "Válido"
            : "Error";

    item.innerHTML = `
      <div class="history-info">
        <div class="history-folio">${scan.folio}</div>
        <div class="history-time">${formatTime(new Date(scan.timestamp))}</div>
      </div>
      <span class="history-status ${scan.status}">${statusText}</span>
    `;

    historyList.appendChild(item);
  });
}

/**
 * Actualiza estadísticas
 */
function updateStats() {
  const totalScanned = scanHistory.filter((s) => s.status !== "error").length;
  const validCount = scanHistory.filter((s) => s.status === "marked").length;

  document.getElementById("totalScanned").textContent = totalScanned;
  document.getElementById("validCount").textContent = validCount;
}

/**
 * Limpia el historial
 */
async function clearScanHistory() {
  const doConfirm = () => {
    return new Promise((resolve) => {
      if (typeof window.customConfirm === "function") {
        window
          .customConfirm(
            "¿Estás seguro de que deseas limpiar todo el historial de escaneo?",
            "Limpiar Historial",
          )
          .then(resolve);
        return;
      }

      let modal = document.getElementById("confirmModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "confirmModal";
        modal.className = "modal-overlay hidden";
        modal.style.zIndex = "10000";
        modal.innerHTML = `
          <div class="modal-card" style="max-width: 400px; text-align: center; padding: 2rem;">
            <i class="fas fa-exclamation-triangle fa-3x" style="color: #ef4444; margin-bottom: 1rem;"></i>
            <h3 style="margin-bottom: 1rem;">Limpiar Historial</h3>
            <p style="color: #64748b; margin-bottom: 1.5rem;">¿Estás seguro de que deseas limpiar el historial de forma permanente?</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
              <button id="confirmModalCancel" class="btn btn-secondary">Cancelar</button>
              <button id="confirmModalOk" class="btn btn-danger" style="background:#ef4444;color:#fff;border:none;">Confirmar</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }
      const btnOk = document.getElementById("confirmModalOk");
      const btnCancel = document.getElementById("confirmModalCancel");
      const cleanup = () => {
        modal.classList.add("hidden");
        modal.classList.remove("show");
      };
      btnOk.onclick = () => {
        cleanup();
        resolve(true);
      };
      btnCancel.onclick = () => {
        cleanup();
        resolve(false);
      };
      void modal.offsetWidth;
      modal.classList.remove("hidden");
      modal.classList.add("show");
    });
  };

  const isConfirmed = await doConfirm();
  if (isConfirmed) {
    scanHistory = [];
    clearStorage("scanHistory");
    updateHistoryDisplay();
    updateStats();
  }
}

// Actualizar stats al iniciar
window.addEventListener("load", () => {
  updateStats();
});
