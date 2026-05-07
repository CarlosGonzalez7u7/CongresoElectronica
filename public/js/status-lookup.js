/**
 * Consulta de estatus por folio y escaneo QR en landing.
 */

(function () {
  let scanStream = null;
  let scanTimerId = null;
  let scanDetector = null;
  let uiAudioCtx = null;
  let lastErrorBeepAt = 0;

  document.addEventListener("DOMContentLoaded", () => {
    setupStatusLookup();
  });

  function getProjectBasePath() {
    return "";
  }

  function getApiUrl(endpoint) {
    return `app/api/${endpoint}`;
  }

  function isLocalhostHost() {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  function normalizeFolio(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function extractFolioFromText(text) {
    const normalized = String(text || "").toUpperCase();
    const match = normalized.match(/RENOV-\d{14}-\d{4}/);
    return match ? match[0] : null;
  }

  function setStatusMessage(message, type) {
    const el = document.getElementById("statusLookupMessage");
    if (!el) {
      return;
    }

    el.textContent = message;
    el.classList.remove("info", "success", "error");
    if (type) {
      el.classList.add(type);
    }
  }

  function mapPaymentStatus(value) {
    const status = String(value || "pending").toLowerCase();
    if (status === "verified" || status === "paid" || status === "approved") {
      return { text: "Aceptado", css: "verified" };
    }
    if (status === "rejected") {
      return { text: "Rechazado", css: "rejected" };
    }
    return { text: "Pendiente", css: "pending" };
  }

  function formatCurrency(amount) {
    const value = Number(amount || 0);
    return `$${value.toLocaleString("es-MX")} MXN`;
  }

  function renderList(listId, items, itemLabelBuilder) {
    const listEl = document.getElementById(listId);
    if (!listEl) {
      return;
    }

    listEl.innerHTML = "";
    if (!items || items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Sin datos.";
      listEl.appendChild(li);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = itemLabelBuilder(item);
      listEl.appendChild(li);
    });
  }

  async function fetchTeamData(folio) {
    const response = await fetch(
      `${getApiUrl("get-team.php")}?folio=${encodeURIComponent(folio)}`,
      {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error("El servidor respondió un formato inválido.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Error HTTP ${response.status}`);
    }

    return result.data;
  }

  function renderStatusResult(data) {
    const team = data.team || {};
    const summary = data.summary || {};
    const robots = data.robots || [];
    const members = data.members || [];

    const statusInfo = mapPaymentStatus(team.payment_status);
    const badge = document.getElementById("statusBadge");
    if (badge) {
      badge.textContent = statusInfo.text;
      badge.className = `status-badge ${statusInfo.css}`;
    }

    const assign = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value || "-";
      }
    };

    assign("resultFolio", team.folio);
    assign("resultCaptain", team.captain_name);
    assign("resultEmail", team.captain_email);
    assign("resultPhone", team.captain_phone);
    assign("resultSchool", team.school_name);
    assign("resultStage", team.registration_stage);
    assign("resultTotal", formatCurrency(summary.total_cost));

    const qrImg = document.getElementById("resultQrImage");
    if (qrImg && team.folio) {
      const qrContent = `RENOVATEC\nFolio: ${team.folio}\nCapitán: ${team.captain_name || ""}\nEscuela: ${team.school_name || ""}\nRobots: ${robots.length}\nTotal: ${formatCurrency(summary.total_cost || 0)}`;
      let retriedDirect = false;

      qrImg.onerror = () => {
        if (!retriedDirect) {
          retriedDirect = true;
          qrImg.src = `https://quickchart.io/qr?size=250&text=${encodeURIComponent(qrContent)}&ecLevel=H&margin=1`;
          return;
        }

        const qrWrap = qrImg.parentElement;
        if (qrWrap) {
          qrWrap.innerHTML =
            '<p style="text-align:center;color:#c62828;">No se pudo cargar el QR.<br/>Consulta con tu folio en módulo de registro.</p>';
        }
      };

      qrImg.src = `${getApiUrl("get-qr.php")}?folio=${encodeURIComponent(team.folio)}&size=250`;
    }

    renderList("resultRobotsList", robots, (robot) => {
      const name = robot.robot_name || "Robot";
      const category = robot.category || "Sin categoría";
      return `${name} - ${category}`;
    });

    renderList("resultMembersList", members, (member) => {
      const role = member.is_captain ? "Capitán" : "Miembro";
      return `${role}: ${member.member_name || "Sin nombre"}`;
    });

    const resultCard = document.getElementById("statusResultCard");
    if (resultCard) {
      resultCard.style.display = "block";
    }
  }

  async function lookupByFolio(folio) {
    const normalized = normalizeFolio(folio);
    if (!normalized) {
      setStatusMessage("Escribe un folio válido para consultar.", "error");
      return;
    }

    try {
      setStatusMessage("Consultando estatus...", "info");
      const data = await fetchTeamData(normalized);
      renderStatusResult(data);
      setStatusMessage("Solicitud encontrada. Estatus actualizado.", "success");

      const folioInput = document.getElementById("statusFolioInput");
      if (folioInput) {
        folioInput.value = normalized;
      }
    } catch (error) {
      setStatusMessage(
        error.message || "No se pudo consultar el estatus.",
        "error",
      );
    }
  }

  function ensureAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return null;
    }

    if (!uiAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      uiAudioCtx = new Ctx();
    }

    if (uiAudioCtx.state === "suspended") {
      uiAudioCtx.resume().catch(() => {
        // Ignorar bloqueo de autoplay sin interacción.
      });
    }

    return uiAudioCtx;
  }

  function playBeep(kind = "ok") {
    const ctx = ensureAudioContext();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = kind === "error" ? "sawtooth" : "sine";
    oscillator.frequency.value = kind === "error" ? 210 : 980;

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      kind === "error" ? 0.11 : 0.09,
      now + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + (kind === "error" ? 0.22 : 0.12),
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + (kind === "error" ? 0.23 : 0.13));
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

    const panel = document.getElementById("qrScannerPanel");
    const video = document.getElementById("qrScannerVideo");

    if (panel) {
      panel.style.display = "none";
      panel.classList.remove("overlay-active");
      panel.setAttribute("aria-hidden", "true");
      document.body.classList.remove("scanner-overlay-open");
    }

    if (video) {
      video.srcObject = null;
    }
  }

  async function scanLoop(video) {
    if (!scanDetector) {
      return;
    }

    try {
      const detections = await scanDetector.detect(video);
      if (!detections || detections.length === 0) {
        return;
      }

      const rawValue = detections[0].rawValue || "";
      const folio = extractFolioFromText(rawValue);

      if (!folio) {
        const now = Date.now();
        if (now - lastErrorBeepAt > 900) {
          playBeep("error");
          lastErrorBeepAt = now;
        }
        setStatusMessage(
          "QR leído, pero no contiene un folio RENOV válido.",
          "error",
        );
        return;
      }

      playBeep("ok");
      stopScanner();
      lookupByFolio(folio);
    } catch {
      // Ignorar errores intermitentes de lectura en cuadros vacíos.
    }
  }

  async function startScanner() {
    if (
      !("mediaDevices" in navigator) ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setStatusMessage(
        "Tu navegador no permite abrir cámara. Ingresa tu folio manualmente.",
        "error",
      );
      return;
    }

    if (typeof window.BarcodeDetector === "undefined") {
      setStatusMessage(
        "Escaneo no soportado en este navegador. Ingresa tu folio manualmente.",
        "error",
      );
      return;
    }

    if (!window.isSecureContext && !isLocalhostHost()) {
      setStatusMessage(
        "En celular la camara requiere HTTPS. Abre el sitio con https:// y reintenta.",
        "error",
      );
      return;
    }

    const panel = document.getElementById("qrScannerPanel");
    const video = document.getElementById("qrScannerVideo");

    if (!panel || !video) {
      return;
    }

    try {
      scanDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
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
      panel.style.display = "block";
      panel.classList.add("overlay-active");
      panel.setAttribute("aria-hidden", "false");
      document.body.classList.add("scanner-overlay-open");
      ensureAudioContext();
      setStatusMessage("Escáner activo. Apunta la cámara al QR.", "info");

      if (typeof video.play === "function") {
        video.play().catch(() => {
          // En algunos navegadores móviles puede requerir interacción extra.
        });
      }

      if (scanTimerId) {
        window.clearInterval(scanTimerId);
      }
      scanTimerId = window.setInterval(() => {
        scanLoop(video);
      }, 350);
    } catch (error) {
      stopScanner();
      setStatusMessage(
        error && error.message
          ? `No se pudo iniciar cámara: ${error.message}`
          : "No se pudo iniciar la cámara.",
        "error",
      );
    }
  }

  function setupStatusLookup() {
    const form = document.getElementById("statusLookupForm");
    const scanBtn = document.getElementById("scanQrBtn");
    const stopBtn = document.getElementById("stopScanBtn");

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = document.getElementById("statusFolioInput");
        lookupByFolio(input ? input.value : "");
      });
    }

    if (scanBtn) {
      scanBtn.addEventListener("click", () => {
        startScanner();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        stopScanner();
        setStatusMessage("Escáner detenido.", "info");
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        stopScanner();
      }
    });

    window.addEventListener("beforeunload", () => {
      stopScanner();
    });
  }
})();
