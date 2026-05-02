/**
 * CONFIRMACIÓN DE REGISTRO - LÓGICA
 * Carga datos desde API y genera QR
 */

document.addEventListener("DOMContentLoaded", () => {
  setupRecoveryForm();
  loadConfirmationData();
  setupPrintButtons();
});

let currentTeamData = null;
let emailDispatchInProgress = false;

function getProjectBasePath() {
  const marker = "/public/";
  const idx = window.location.pathname.indexOf(marker);
  return idx >= 0 ? window.location.pathname.substring(0, idx) : "";
}

function getApiUrl(endpoint) {
  return `${getProjectBasePath()}/app/api/${endpoint}`;
}

/**
 * Obtiene el folio de la URL o localStorage
 */
function getFolio() {
  const urlParams = new URLSearchParams(window.location.search);
  const folioFromUrl = urlParams.get("folio");

  if (folioFromUrl) {
    return folioFromUrl;
  }

  // Fallback a localStorage
  return localStorage.getItem("registroFolio") || null;
}

function normalizeFolio(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function setRecoveryStatus(message, type = "info") {
  const statusEl = document.getElementById("recoverFolioStatus");
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.classList.remove("success", "error", "info");
  statusEl.classList.add(type);
}

function setupRecoveryForm() {
  const form = document.getElementById("recoverFolioForm");
  const input = document.getElementById("recoverFolioInput");

  if (!form || !input) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const folio = normalizeFolio(input.value);
    if (!folio) {
      setRecoveryStatus("Ingresa un folio para buscar tu pase.", "error");
      return;
    }

    setRecoveryStatus("Buscando registro...", "info");
    await loadConfirmationData(folio);
  });
}

/**
 * Carga los datos del equipo desde la API
 */
async function loadConfirmationData(overrideFolio = null) {
  const folio = normalizeFolio(overrideFolio || getFolio());

  if (!folio) {
    setRecoveryStatus(
      "Escribe tu folio para recuperar tu pase y código QR.",
      "info",
    );
    return;
  }

  try {
    // Mostrar loading
    document.getElementById("folioNumber").textContent = folio;
    document.getElementById("folioNumber").classList.add("loading");

    // Obtener datos del equipo
    const response = await fetch(
      `${getApiUrl("get-team.php")}?folio=${encodeURIComponent(folio)}`,
      {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );

    const result = await response.json();

    if (result.success) {
      const teamData = result.data;
      populateConfirmationData(teamData, folio);
      generateQRCode(teamData);
      setRecoveryStatus("Pase recuperado correctamente.", "success");

      if (!overrideFolio) {
        setTimeout(() => {
          autoSendRegistrationEmail(teamData);
        }, 1400);
      }

      const url = new URL(window.location.href);
      url.searchParams.set("folio", folio);
      window.history.replaceState({}, "", url.toString());
    } else {
      showError(result.error || "No se encontró el registro");
    }
  } catch (error) {
    console.error("Error cargar datos:", error);
    showError("Error al cargar los datos del registro: " + error.message);
  }
}

/**
 * Llena campos con datos del equipo
 */
function populateConfirmationData(teamData, folio) {
  currentTeamData = teamData;

  const team = teamData.team;
  const robots = teamData.robots;
  const members = teamData.members;
  const summary = teamData.summary;

  // Folio
  document.getElementById("folioNumber").textContent = team.folio;
  document.getElementById("folioNumber").classList.remove("loading");

  // Capitán
  document.getElementById("captainDisplay").textContent = team.captain_name;

  // Escuela
  document.getElementById("schoolDisplay").textContent = team.school_name;

  // Categoría (si hay robots)
  if (robots.length > 0) {
    document.getElementById("categoryDisplay").textContent =
      robots[0].category || "N/A";
  }

  // Mostrar resumen
  let summaryHTML = `
    <div class="pass-details">
      <div class="detail-row">
        <label>Número de Folio:</label>
        <span class="folio">${team.folio}</span>
      </div>
      <div class="detail-row">
        <label>Capitán del Equipo:</label>
        <span class="captain">${team.captain_name}</span>
      </div>
      <div class="detail-row">
        <label>Email:</label>
        <span class="email">${team.captain_email}</span>
      </div>
      <div class="detail-row">
        <label>Teléfono:</label>
        <span class="phone">${team.captain_phone}</span>
      </div>
      <div class="detail-row">
        <label>Escuela:</label>
        <span class="school">${team.school_name}</span>
      </div>
      <div class="detail-row">
        <label>Etapa de Registro:</label>
        <span class="stage">${team.registration_stage}</span>
      </div>
      <div class="detail-row">
        <label>Monto a Pagar:</label>
        <span class="amount">$${(summary.total_cost || 0).toLocaleString("es-MX")} MXN</span>
      </div>
    </div>
  `;

  // Agregar información de robots
  if (robots.length > 0) {
    summaryHTML += `<div class="robots-section"><h3>Robots Registrados:</h3><ul>`;
    robots.forEach((robot, index) => {
      summaryHTML += `<li><strong>${robot.robot_name}</strong> - ${robot.category}</li>`;
    });
    summaryHTML += `</ul></div>`;
  }

  // Agregar información de miembros
  if (members.length > 0) {
    summaryHTML += `<div class="members-section"><h3>Tripulación:</h3><ul>`;
    members.forEach((member) => {
      const role = member.is_captain ? "👨‍💼 Capitán" : "👤 Miembro";
      summaryHTML += `<li>${role}: ${member.member_name}</li>`;
    });
    summaryHTML += `</ul></div>`;
  }

  // Reemplazar contenido de pase-details
  const passDetailsContainer = document.querySelector(".pass-details");
  if (passDetailsContainer) {
    passDetailsContainer.innerHTML = summaryHTML;
  }

  // Guardar folio en localStorage para referencia
  localStorage.setItem("registroFolio", team.folio);
  sessionStorage.setItem("teamData", JSON.stringify(teamData));

  const recoverInput = document.getElementById("recoverFolioInput");
  if (recoverInput) {
    recoverInput.value = folio;
  }
}

/**
 * Genera código QR con los datos del equipo
 */
function generateQRCode(teamData) {
  const team = teamData.team;

  // Datos a codificar en QR
  const qrData = {
    folio: team.folio,
    captain: team.captain_name,
    email: team.captain_email,
    school: team.school_name,
    robots: teamData.robots.length,
    stage: team.registration_stage,
    date: new Date().toISOString(),
  };

  // Contenido del QR (simple y legible)
  const qrContent = `RENOVATEC
Folio: ${team.folio}
Capitán: ${team.captain_name}
Escuela: ${team.school_name}
Robots: ${teamData.robots.length}
Total: $${teamData.summary.total_cost}`;

  // Si la librería no está disponible, usar fallback del servidor sin romper el flujo.
  if (
    typeof window.QRCode === "undefined" ||
    typeof window.QRCode.toCanvas !== "function"
  ) {
    generateQRServerSide(team.folio);
    return;
  }

  try {
    // Generar QR con QRCode.js
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = ""; // Limpiar QR anterior

    window.QRCode.toCanvas(
      qrContainer,
      qrContent,
      {
        errorCorrectionLevel: "H",
        type: "image/png",
        quality: 0.95,
        margin: 1,
        width: 250,
        color: {
          dark: "#0C1B33",
          light: "#ffffff",
        },
      },
      function (error) {
        if (error) {
          console.error("Error generando QR local:", error);
          generateQRServerSide(team.folio);
        }
      },
    );
  } catch (error) {
    console.error("Error en generación local:", error);
    generateQRServerSide(team.folio);
  }
}

/**
 * Fallback: Generar QR en servidor
 */
function generateQRServerSide(folio) {
  const qrContainer = document.getElementById("qrcode");
  const img = document.createElement("img");

  img.src = `${getApiUrl("get-qr.php")}?folio=${encodeURIComponent(folio)}&size=250`;
  img.alt = "QR Code";
  img.style.maxWidth = "250px";
  img.onerror = function () {
    qrContainer.innerHTML = `<p style="color:red;">No se pudo cargar el QR automáticamente.</p><p style="font-size:0.9rem;">Folio: <strong>${folio}</strong></p>`;
  };

  qrContainer.innerHTML = "";
  qrContainer.appendChild(img);
}

/**
 * Configura botones de descargar
 */
function setupPrintButtons() {
  // Botón Descargar PDF
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", downloadPassPdf);
  }

  // Botón Descargar QR
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadQR);
  }
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getQrImageDataUrl() {
  const qrCanvas = document.querySelector("#qrcode canvas");
  if (qrCanvas) {
    return qrCanvas.toDataURL("image/png");
  }

  const qrImg = document.querySelector("#qrcode img");
  if (qrImg && qrImg.src) {
    return qrImg.src;
  }

  return null;
}

function loadImageAsDataUrl(src, options = {}) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Limpia pixeles casi blancos para evitar fondos blancos visibles en logos.
        if (options.removeNearWhite) {
          const threshold = Number(options.whiteThreshold || 240);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            if (
              data[i] >= threshold &&
              data[i + 1] >= threshold &&
              data[i + 2] >= threshold
            ) {
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }

        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function buildPassPdfDocument() {
  if (!currentTeamData || !currentTeamData.team) {
    showError("Primero debes cargar un folio válido para generar el PDF.");
    return null;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showError("No se pudo cargar el generador PDF. Intenta nuevamente.");
    return null;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    unit: "mm",
    format: "letter",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const team = currentTeamData.team;
  const robots = currentTeamData.robots || [];
  const members = currentTeamData.members || [];
  const summary = currentTeamData.summary || {};

  const [tecLogo, electroLogo, ieeeLogo, mascotLogo, qrDataUrl] =
    await Promise.all([
      loadImageAsDataUrl("assets/images/tec.png"),
      loadImageAsDataUrl("assets/images/electro.png"),
      loadImageAsDataUrl("assets/images/IEEE.png", {
        removeNearWhite: true,
        whiteThreshold: 238,
      }).then((img) => {
        if (img) {
          return img;
        }
        return loadImageAsDataUrl("assets/images/IEEE.jpeg", {
          removeNearWhite: true,
          whiteThreshold: 238,
        });
      }),
      loadImageAsDataUrl("assets/images/robot-clean-v2.png", {
        removeNearWhite: true,
        whiteThreshold: 246,
      }),
      Promise.resolve(getQrImageDataUrl()),
    ]);

  // ===== ENCABEZADO CON LOGOS Y TÍTULO =====
  doc.setFillColor(12, 27, 51);
  doc.rect(0, 0, pageWidth, 36, "F");

  if (tecLogo) {
    doc.addImage(tecLogo, "PNG", 12, 7, 20, 20);
  }
  if (electroLogo) {
    doc.addImage(electroLogo, "PNG", 36, 7, 20, 20);
  }
  if (ieeeLogo) {
    doc.addImage(ieeeLogo, "PNG", 60, 7, 20, 20);
  }
  if (mascotLogo) {
    doc.addImage(mascotLogo, "PNG", pageWidth - 34, 5, 22, 26);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CONGRESO 2026", 86, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Pase Oficial de Participación", 86, 24);

  // ===== FECHA DEL EVENTO (PROMINENTE) =====
  doc.setFillColor(220, 38, 38);
  doc.rect(12, 40, pageWidth - 24, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    "EVENTO: 23 de Octubre de 2026 | 9:00 AM - 5:00 PM",
    pageWidth / 2,
    50,
    {
      align: "center",
    },
  );

  // ===== DATOS DEL EQUIPO =====
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Datos del Equipo", 14, 60);

  doc.setDrawColor(209, 213, 219);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 64, pageWidth - 24, 62, 3, 3, "FD");

  const rows = [
    ["Folio", escapePdfText(team.folio)],
    ["Capitán", escapePdfText(team.captain_name)],
    ["Correo", escapePdfText(team.captain_email)],
    ["Teléfono", escapePdfText(team.captain_phone)],
    ["Escuela", escapePdfText(team.school_name)],
    [
      "Monto Pagado",
      `$${Number(summary.total_cost || 0).toLocaleString("es-MX")} MXN`,
    ],
    ["Etapa de Registro", `Etapa ${escapePdfText(team.registration_stage)}`],
  ];

  let y = 72;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 50, y);
    y += 7.5;
  });

  // ===== ROBOTS REGISTRADOS =====
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Robots Registrados", 14, 138);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  let robotsY = 145;
  if (!robots.length) {
    doc.text("Sin robots registrados.", 16, robotsY);
    robotsY += 6;
  } else {
    robots.slice(0, 8).forEach((robot, idx) => {
      const categoryLabel =
        typeof getCategoryLabel === "function"
          ? getCategoryLabel(robot.category)?.label || robot.category
          : robot.category;
      doc.text(
        `${idx + 1}. ${escapePdfText(robot.robot_name)} - ${escapePdfText(categoryLabel)}`,
        16,
        robotsY,
      );
      robotsY += 6;
    });
  }

  // ===== TRIPULACIÓN =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Tripulación / Integrantes", 14, robotsY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  let membersY = robotsY + 13;
  if (!members.length) {
    doc.text("Sin integrantes registrados.", 16, membersY);
    membersY += 6;
  } else {
    members.slice(0, 10).forEach((member, idx) => {
      const role = member.is_captain ? "Capitan" : `Integrante ${idx + 1}`;
      doc.text(`${role}: ${escapePdfText(member.member_name)}`, 16, membersY);
      membersY += 6;
    });
  }

  // ===== AVISO DE VALIDACIÓN (IMPORTANTE) =====
  membersY += 4;
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(0.5);
  doc.rect(12, membersY, pageWidth - 24, 30, "FD");

  doc.setTextColor(153, 27, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("IMPORTANTE - VALIDACION DE COMPROBANTE", 14, membersY + 6);

  doc.setTextColor(127, 29, 29);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const warningText = [
    "Revisa cuidadosamente tu solicitud. Tu codigo QR sera valido SOLO",
    "despues de que tu comprobante de pago sea verificado y autorizado.",
    "Si tu comprobante NO es valido o NO esta autorizado, seras",
    "informado por correo electronico.",
  ];

  let warningY = membersY + 12;
  warningText.forEach((line) => {
    doc.text(line, 16, warningY);
    warningY += 5;
  });

  // ===== QR CODE SIDEBAR =====
  if (qrDataUrl) {
    const qrY = membersY + 2;
    const qrBoxSize = 52;
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(pageWidth - 72, qrY, 60, 60, 2, 2, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("QR de Acceso", pageWidth - 67, qrY + 4);
    doc.addImage(
      qrDataUrl,
      "PNG",
      pageWidth - 68,
      qrY + 7,
      qrBoxSize,
      qrBoxSize,
    );
  }

  // ===== PIE DE PÁGINA =====
  const footerY = 270;
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "Documento oficial RENOVATEC. Generado automáticamente desde el sistema de registro.",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );
  doc.text(
    `Fecha de emisión: ${new Date().toLocaleString("es-MX")}`,
    pageWidth / 2,
    footerY + 5,
    { align: "center" },
  );

  // NOMBRE DE ARCHIVO
  const folio = escapePdfText(team.folio || "RENOVATEC").replace(
    /[^A-Z0-9\-_.]/gi,
    "_",
  );

  return {
    doc,
    fileName: `PASE_${folio}.pdf`,
  };
}

async function downloadPassPdf() {
  const pdfBundle = await buildPassPdfDocument();
  if (!pdfBundle) {
    return;
  }

  pdfBundle.doc.save(pdfBundle.fileName);
}

async function autoSendRegistrationEmail(teamData) {
  if (!teamData || !teamData.team) {
    return;
  }

  const folio = normalizeFolio(teamData.team.folio || "");
  if (!folio) {
    return;
  }

  const sentKey = `renov_mail_sent_${folio}`;
  if (localStorage.getItem(sentKey) === "1" || emailDispatchInProgress) {
    return;
  }

  emailDispatchInProgress = true;

  try {
    let qrDataUrl = getQrImageDataUrl();

    if (qrDataUrl && !qrDataUrl.startsWith("data:")) {
      qrDataUrl = await loadImageAsDataUrl(qrDataUrl);
    }

    if (!qrDataUrl || !qrDataUrl.startsWith("data:")) {
      setRecoveryStatus(
        "No se pudo preparar el QR para enviar correo.",
        "info",
      );
      return;
    }

    const pdfBundle = await buildPassPdfDocument();
    if (!pdfBundle) {
      return;
    }

    const pdfDataUri = pdfBundle.doc.output("datauristring");
    const pdfBase64 = String(pdfDataUri).split(",")[1] || "";
    const qrBase64 = String(qrDataUrl).split(",")[1] || "";

    if (!pdfBase64 || !qrBase64) {
      setRecoveryStatus(
        "No se pudieron preparar adjuntos para correo.",
        "info",
      );
      return;
    }

    const response = await fetch(getApiUrl("send-registration-email.php"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        folio,
        pdfBase64,
        qrBase64,
      }),
    });

    let result = null;
    try {
      result = await response.json();
    } catch {
      result = { success: false, error: "Respuesta invalida del servidor" };
    }

    if (response.status === 503) {
      setRecoveryStatus(
        "Correo automatico pendiente de configuracion del servicio de email.",
        "info",
      );
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "No se pudo enviar el correo");
    }

    localStorage.setItem(sentKey, "1");
    setRecoveryStatus(
      "Correo enviado al capitan con folio, pase PDF y QR adjuntos.",
      "success",
    );
  } catch (error) {
    console.error("Error enviando correo de registro:", error);
    setRecoveryStatus(
      "Registro guardado. El correo automatico no pudo enviarse en este intento.",
      "info",
    );
  } finally {
    emailDispatchInProgress = false;
  }
}

/**
 * Descarga el código QR como imagen
 */
function downloadQR() {
  const folio = getFolio();
  const canvas = document.querySelector("#qrcode canvas");

  if (canvas) {
    // Descargar QR local
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `QR_${folio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Descargar desde servidor
    const link = document.createElement("a");
    link.href = `${getApiUrl("get-qr.php")}?folio=${encodeURIComponent(folio)}`;
    link.download = `QR_${folio}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Muestra errores al usuario
 */
function showError(message) {
  const successCard = document.querySelector(".success-card");
  if (successCard) {
    successCard.style.opacity = "0.5";
  }

  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    background: #f8d7da;
    color: #721c24;
    padding: 20px;
    border-radius: 8px;
    margin: 20px;
    border-left: 4px solid #dc3545;
    text-align: center;
  `;
  errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;

  const mainElement = document.querySelector("main");
  if (mainElement) {
    mainElement.insertBefore(errorDiv, mainElement.firstChild);
  }

  console.error("Error confirmación:", message);
}
