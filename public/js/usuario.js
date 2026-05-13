// Guard: si el script ya fue cargado (fallback reinsertion), no re-declarar
if (typeof window._usuarioJsLoaded === "undefined") {
  window._usuarioJsLoaded = true;
}
// Usamos window para evitar SyntaxError por doble declaración con const
window.SESSION_KEY = window.SESSION_KEY || "renovatec_user_session_v1";
window.PACKAGE_DRAFT_KEY =
  window.PACKAGE_DRAFT_KEY || "renovatec_package_draft_v1";
const SESSION_KEY = window.SESSION_KEY;
const PACKAGE_DRAFT_KEY = window.PACKAGE_DRAFT_KEY;

// Precios por etapa (fecha: 1 abril - 30 junio Etapa1, 1 jul-31 ago Etapa2, 1 sep-23 oct Etapa3)
const PRECIO_CONGRESO = 400;
const PRECIO_CAMPAMENTO = 200;
const ROBOTICA_CROQUIS_PDF = "Horario y croquis .pdf";
const CAMPAMENTO_GUIA_PDF = "Campamento .pdf";
const FALLBACK_COVER_IMAGE = "/assets/images/electro.png";

const FALLBACK_PDF_SUMMARIES = {
  robotica: [
    "Revisa tu categoría y hora de llegada recomendada.",
    "Ubica zona de pits, área de combate/pista y mesa de jueces.",
    "Lleva tu robot listo para inspección técnica previa.",
  ],
  campamento: [
    "Confirma horario de registro y punto de reunión.",
    "Consulta lista de artículos personales recomendados.",
    "Revisa reglas de convivencia y seguridad del campamento.",
  ],
};
const ETAPAS_ROBOTICA = [
  {
    precio: 130,
    inicio: new Date("2026-04-01"),
    fin: new Date("2026-06-30T23:59:59"),
  },
  {
    precio: 200,
    inicio: new Date("2026-07-01"),
    fin: new Date("2026-08-31T23:59:59"),
  },
  {
    precio: 350,
    inicio: new Date("2026-09-01"),
    fin: new Date("2026-10-23T23:59:59"),
  },
];

const userSession = JSON.parse(sessionStorage.getItem(SESSION_KEY));
let currentRequestFolio = "";

let userCanEnrollWorkshop = false;
let userEnrolledWorkshopId = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!userSession) {
    window.location.href = "/acceso";
    return;
  }

  checkExistingIpBlock();
  cargarDatosPerfil();
  initWizardProfileFields();
  restorePackageDraft();
  syncPackageControls();
  attachWizardEvents();
  goWizardStep(1);
  cargarEstadoSolicitud();
  cargarTalleres();
  renderDocumentResources();
  marcarEtapaActiva();
});

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

function getProjectBasePath() {
  return "";
}

function getApiUrl(endpoint) {
  return `/app/api/${endpoint}`;
}

function getDocUrl(fileName) {
  return `/assets/docs/${encodeURIComponent(fileName)}`;
}

function resolveMediaUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return FALLBACK_COVER_IMAGE;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/app/uploads/") || url.startsWith("/public/")) {
    if (url.startsWith("/public/")) return url.replace("/public/", "/");
    return url;
  }
  if (url.startsWith("/uploads/")) {
    return `/app${url}`;
  }
  if (url.startsWith("assets/")) {
    return `/public/${url}`;
  }
  if (url.startsWith("/")) {
    return url;
  }

  return `/public/${url}`;
}

function renderListInto(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const safeItems = Array.isArray(items)
    ? items.filter((item) => String(item || "").trim() !== "")
    : [];
  el.innerHTML = safeItems.length
    ? safeItems.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")
    : "<li>Consulta el PDF para ver todos los detalles.</li>";
}

async function loadPdfSummaryJson(fileName, fallbackItems) {
  const fallback = Array.isArray(fallbackItems) ? fallbackItems : [];
  try {
    const res = await fetch(getDocUrl(fileName), { cache: "no-store" });
    if (!res.ok) return fallback;
    const json = await res.json();
    const points = Array.isArray(json?.points) ? json.points : [];
    return points.length ? points : fallback;
  } catch {
    return fallback;
  }
}

async function renderDocumentResources() {
  const roboticaLinks = document.querySelectorAll(
    'a[href="assets/docs/Horario%20y%20croquis%20.pdf"]',
  );
  const campLinks = document.querySelectorAll(
    'a[href="assets/docs/Campamento%20.pdf"]',
  );

  const roboticaUrl = getDocUrl(ROBOTICA_CROQUIS_PDF);
  const campamentoUrl = getDocUrl(CAMPAMENTO_GUIA_PDF);

  roboticaLinks.forEach((a) => {
    a.href = roboticaUrl;
  });
  campLinks.forEach((a) => {
    a.href = campamentoUrl;
  });

  const robotIframe = document.querySelector(
    'iframe[title="Croquis y horarios del torneo"]',
  );
  if (robotIframe) robotIframe.src = `${roboticaUrl}#view=FitH`;

  const campIframe = document.querySelector(
    'iframe[title="Guía del campamento"]',
  );
  if (campIframe) campIframe.src = `${campamentoUrl}#view=FitH`;

  const [roboticaResumen, campamentoResumen] = await Promise.all([
    loadPdfSummaryJson(
      "robotica-croquis-horarios-info.json",
      FALLBACK_PDF_SUMMARIES.robotica,
    ),
    loadPdfSummaryJson(
      "campamento-info.json",
      FALLBACK_PDF_SUMMARIES.campamento,
    ),
  ]);

  renderListInto("roboticaPdfResumen", roboticaResumen);
  renderListInto("campamentoPdfResumen", campamentoResumen);
}

// ===== ETAPA ACTIVA =====
function getPrecioRobotActual() {
  const hoy = new Date();
  for (const etapa of ETAPAS_ROBOTICA) {
    if (hoy >= etapa.inicio && hoy <= etapa.fin) return etapa.precio;
  }
  // Si estamos fuera de rango, devolvemos el último precio
  return ETAPAS_ROBOTICA[ETAPAS_ROBOTICA.length - 1].precio;
}

function marcarEtapaActiva() {
  const hoy = new Date();
  ETAPAS_ROBOTICA.forEach((etapa, i) => {
    const num = i + 1;
    const card = document.getElementById(`etapaCard${num}`);
    const estado = document.getElementById(`etapaEstado${num}`);
    if (!card || !estado) return;

    if (hoy >= etapa.inicio && hoy <= etapa.fin) {
      card.classList.add("etapa-destacada");
      estado.textContent = "● Etapa en curso";
      estado.className = "etapa-estado etapa-activa";
    } else if (hoy < etapa.inicio) {
      estado.textContent = "Próximamente";
      estado.className = "etapa-estado";
    } else {
      estado.textContent = "Periodo cerrado";
      estado.className = "etapa-estado";
      card.style.opacity = "0.6";
    }
  });
}

// ===== CARGA DINÁMICA DE TALLERES Y CONFERENCIAS =====
async function cargarTalleres() {
  const container = document.getElementById("talleresContainer");
  const vacios = document.getElementById("talleresVacios");
  if (!container) return;

  container.innerHTML = `<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-mute);"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 1rem;">Cargando programa académico...</p></div>`;
  container.classList.remove("hidden");
  if (vacios) vacios.classList.add("hidden");

  try {
    const userId =
      userSession?.id || userSession?.userId || userSession?.user_id;

    const [resWs, resConf, resEnroll] = await Promise.all([
      fetch(getApiUrl("admin-workshops.php?action=list"), {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(getApiUrl("admin-workshops.php?action=list_conferences"), {
        credentials: "include",
      }).then((r) => r.json()),
      userId
        ? fetch(getApiUrl(`workshop-enroll.php?userId=${userId}`), {
            credentials: "include",
          })
            .then((r) => r.json())
            .catch(() => ({}))
        : Promise.resolve({}),
    ]);

    userCanEnrollWorkshop = userCanEnrollWorkshop || !!resEnroll?.can_enroll;
    userEnrolledWorkshopId = resEnroll?.enrolled_workshop_id || null;

    let html = "";
    let count = 0;

    window.workshopDataCache = resWs.data || [];
    window.conferenceDataCache = resConf.data || [];

    const workshops = (resWs.data || [])
      .filter((w) => w.status === "published" || w.status === "full")
      .sort(
        (a, b) =>
          new Date(a.schedule_date || "2099") -
          new Date(b.schedule_date || "2099"),
      );

    const conferences = (resConf.data || [])
      .filter((c) => c.status === "published" || c.status === "full")
      .sort(
        (a, b) =>
          new Date(a.conference_date || "2099") -
          new Date(b.conference_date || "2099"),
      );

    if (workshops.length > 0) {
      html += `<h3 style="width:100%; grid-column:1/-1; margin-bottom:1rem; color:var(--primary-blue); border-bottom:2px solid var(--border-light); padding-bottom:8px;"><i class="fas fa-chalkboard"></i> Talleres Disponibles</h3>`;
      html += workshops
        .map((t) => {
          count++;
          const cover = resolveMediaUrl(t.cover_image_url);

          const isEnrolled = userEnrolledWorkshopId === t.id;
          let statusBadge = "";

          if (isEnrolled) {
            statusBadge = `<span class="taller-tag" style="background:var(--success); color:white; border:none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><i class="fas fa-check-circle"></i> Tu Taller</span>`;
          } else if (
            t.status === "full" ||
            t.enrolled_count >= t.max_capacity
          ) {
            statusBadge = `<span class="taller-tag" style="background:var(--danger); color:white; border:none;"><i class="fas fa-ban"></i> Lleno</span>`;
          }

          return `
        <div class="taller-card ${isEnrolled ? "is-enrolled" : ""}" style="cursor:pointer; transition:all 0.3s ease; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: rgba(255,255,255,0.03); box-shadow: 0 4px 6px rgba(0,0,0,0.2); border: ${isEnrolled ? "2px solid #34d399" : "1px solid rgba(255,255,255,0.09)"};" onclick="mostrarDetalleTaller(${t.id})" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 15px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.2)';">
          <div style="height:160px; background:rgba(0,0,0,0.3); position:relative;">
            <img src="${cover}" style="width:100%; height:100%; object-fit:cover; transition: transform 0.5s;" onerror="this.src='${FALLBACK_COVER_IMAGE}'">
            <div style="position:absolute; top:0; left:0; right:0; bottom:0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6));"></div>
            ${statusBadge ? `<div style="position:absolute; top:12px; right:12px; z-index: 2;">${statusBadge}</div>` : ""}
            <div style="position:absolute; bottom:12px; left:12px; right:12px; z-index: 2;">
                <span style="color:#fff; font-size:0.8rem; font-weight:600; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"><i class="fas fa-user-tie"></i> ${escapeHtml(t.instructor_name || "Por definir")}</span>
            </div>
          </div>
          <div style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column;">
            <h4 style="margin:0 0 0.5rem 0; font-size:1.15rem; color:#eef4ff; font-weight:700; line-height:1.3;">${escapeHtml(t.name || "")}</h4>
            <p style="font-size:0.9rem; color:rgba(237,242,255,0.6); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:1rem; line-height:1.5;">${escapeHtml(t.description || "Sin descripción")}</p>
            
            <div style="margin-top:auto; padding-top:1rem; border-top: 1px solid rgba(255,255,255,0.09); display: flex; justify-content: space-between; align-items: center;">
              <div style="display:flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.8rem; color: rgba(237,242,255,0.6); font-weight: 600;"><i class="fas fa-calendar-alt"></i> ${t.schedule_date ? escapeHtml(t.schedule_date) : "Fecha pendiente"}</span>
                <span style="font-size: 0.8rem; color: ${t.enrolled_count >= t.max_capacity ? "#ef4444" : "#38bdf8"}; font-weight: 600;"><i class="fas fa-users"></i> ${t.enrolled_count}/${t.max_capacity} inscritos</span>
              </div>
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
                <i class="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>`;
        })
        .join("");
    }

    if (conferences.length > 0) {
      html += `<h3 style="width:100%; grid-column:1/-1; margin-top:2rem; margin-bottom:1rem; color:var(--primary-blue); border-bottom:2px solid var(--border-light); padding-bottom:8px;"><i class="fas fa-microphone-alt"></i> Conferencias</h3>`;
      html += conferences
        .map((c) => {
          count++;
          const cover = resolveMediaUrl(c.cover_image_url);
          const statusBadge =
            c.status === "full"
              ? `<span class="taller-tag" style="background:var(--danger); color:white; border:none;"><i class="fas fa-ban"></i> Lleno</span>`
              : "";
          return `
        <div class="taller-card" style="cursor:pointer; transition:all 0.3s ease; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: rgba(255,255,255,0.03); box-shadow: 0 4px 6px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.09);" onclick="mostrarDetalleConferencia(${c.id})" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 15px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.2)';">
          <div style="height:160px; background:rgba(0,0,0,0.3); position:relative;">
            <img src="${cover}" style="width:100%; height:100%; object-fit:cover; transition: transform 0.5s;" onerror="this.src='${FALLBACK_COVER_IMAGE}'">
            <div style="position:absolute; top:0; left:0; right:0; bottom:0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6));"></div>
            ${statusBadge ? `<div style="position:absolute; top:12px; right:12px; z-index: 2;">${statusBadge}</div>` : ""}
            <div style="position:absolute; bottom:12px; left:12px; right:12px; z-index: 2;">
                <span style="color:#fff; font-size:0.8rem; font-weight:600; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"><i class="fas fa-microphone"></i> Ponente: ${escapeHtml(c.speaker_name || "Por definir")}</span>
            </div>
          </div>
          <div style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column;">
            <h4 style="margin:0 0 0.5rem 0; font-size:1.15rem; color:#eef4ff; font-weight:700; line-height:1.3;">${escapeHtml(c.name || "")}</h4>
            <p style="font-size:0.9rem; color:rgba(237,242,255,0.6); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-bottom:1rem; line-height:1.5;">${escapeHtml(c.description || "Sin descripción")}</p>
            
            <div style="margin-top:auto; padding-top:1rem; border-top: 1px solid rgba(255,255,255,0.09); display: flex; justify-content: space-between; align-items: center;">
              <div style="display:flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.8rem; color: rgba(237,242,255,0.6); font-weight: 600;"><i class="fas fa-calendar-alt"></i> ${c.conference_date ? escapeHtml(c.conference_date) : "Sin fecha"}</span>
                <span style="font-size: 0.8rem; color: #38bdf8; font-weight: 600;"><i class="fas fa-clock"></i> ${c.time_start ? escapeHtml(c.time_start) : "--:--"}</span>
              </div>
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
                <i class="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>`;
        })
        .join("");
    }

    if (count === 0) {
      container.classList.add("hidden");
      vacios?.classList.remove("hidden");
    } else {
      container.innerHTML = html;
      container.classList.remove("hidden");
      vacios?.classList.add("hidden");
    }

    // Renderizar paneles de taller inscrito y conferencias cuando ya
    // existe catálogo cargado en memoria.
    renderPanelMiTaller(workshops, conferences);
  } catch (error) {
    console.error("Error cargando programa académico:", error);
    container.classList.add("hidden");
    vacios?.classList.remove("hidden");
  }
}

window.mostrarDetalleTaller = function (id) {
  const t = window.workshopDataCache?.find((w) => w.id === id);
  if (!t) return;

  const topics = t.topics || [];
  const materials = t.materials || [];
  const cover = t.cover_image_url
    ? t.cover_image_url.startsWith("/uploads/")
      ? "/app" + t.cover_image_url
      : t.cover_image_url
    : "";

  const isEnrolled = userEnrolledWorkshopId === t.id;
  const isFull = t.enrolled_count >= t.max_capacity;

  let enrollmentHtml = "";

  if (isEnrolled) {
    enrollmentHtml = `
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; text-align: center;">
        <p style="color: var(--success); font-weight: bold; margin: 0;"><i class="fas fa-check-circle"></i> ¡Estás inscrito en este taller!</p>
      </div>`;
  } else if (userEnrolledWorkshopId) {
    enrollmentHtml = `
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; text-align: center;">
        <p style="color: #d97706; font-weight: bold; margin: 0;"><i class="fas fa-exclamation-triangle"></i> Ya estás inscrito en otro taller. Solo puedes tomar uno.</p>
      </div>`;
  } else if (!userCanEnrollWorkshop) {
    enrollmentHtml = `
      <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; text-align: center;">
        <p style="color: var(--text-mute); font-size: 0.9rem; margin: 0;"><i class="fas fa-lock"></i> Para inscribirte a un taller, primero debes registrarte al Congreso y tu pago debe estar verificado.</p>
      </div>`;
  } else if (isFull) {
    enrollmentHtml = `
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; text-align: center;">
        <p style="color: var(--danger); font-weight: bold; margin: 0;"><i class="fas fa-ban"></i> Este taller ya no tiene cupo.</p>
      </div>`;
  } else {
    enrollmentHtml = `
      <div style="margin-top: 1.5rem; text-align: center;">
        <button id="btnEnrollWorkshop" class="btn btn-primary" style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 8px;" onclick="inscribirTaller(${t.id})">
          <i class="fas fa-user-plus"></i> Inscribirme a este taller
        </button>
        <p style="color: var(--text-mute); font-size: 0.8rem; margin-top: 8px;">Solo puedes elegir 1 taller. Esta acción no se puede deshacer.</p>
      </div>`;
  }

  let html = `
    <div style="text-align:left; color:#eef4ff;">
      ${cover ? `<img src="${cover}" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">` : ""}
      
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h3 style="margin: 0 0 0.5rem 0; color:#eef4ff; font-size: 1.5rem; font-weight: 800;">${escapeHtml(t.name)}</h3>
      </div>
      
      <p style="color:rgba(237,242,255,0.6); font-size:1rem; margin-bottom:1.5rem; border-bottom: 1px solid rgba(255,255,255,0.09); padding-bottom: 1rem;">
        <i class="fas fa-user-tie" style="color: #f2a900;"></i> Impartido por: <strong style="color: #fff;">${escapeHtml(t.instructor_name || "Por definir")}</strong>
      </p>
      
      <p style="margin-bottom:2rem; line-height:1.6; color:rgba(237,242,255,0.85); font-size: 1.05rem;">${escapeHtml(t.description || "Sin descripción.")}</p>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:1rem; margin-bottom:2rem; background:rgba(255,255,255,0.03); padding:1.25rem; border-radius:12px; border: 1px solid rgba(255,255,255,0.09);">
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-calendar" style="color:#f2a900;"></i> Fecha</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(t.schedule_date ? (t.schedule_date_end && t.schedule_date !== t.schedule_date_end ? t.schedule_date + " al " + t.schedule_date_end : t.schedule_date) : "Por definir")}</span>
        </div>
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-clock" style="color:#f2a900;"></i> Horario</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(t.schedule_start || "--:--")} a ${escapeHtml(t.schedule_end || "--:--")}</span>
        </div>
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-map-marker-alt" style="color:#f2a900;"></i> Ubicación</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(t.location || "Por definir")}</span>
        </div>
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-users" style="color:#f2a900;"></i> Cupo</strong>
          <span style="font-weight: 600; color: ${isFull ? "#ef4444" : "#34d399"};">${t.enrolled_count}/${t.max_capacity} inscritos</span>
        </div>
      </div>
      
      ${
        topics.length
          ? `
        <div style="margin-bottom:2rem;">
            <h4 style="font-size:1.1rem; margin-bottom:0.75rem; color: #eef4ff; display:flex; align-items:center; gap:8px;"><i class="fas fa-list-ul"></i> Temas a tratar</h4>
            <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${topics.map((topic) => `<span class="badge badge-accent" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 20px;">${escapeHtml(topic)}</span>`).join("")}
            </div>
        </div>
      `
          : ""
      }
      
      ${
        materials.length
          ? `
        <div style="margin-bottom:2rem;">
            <h4 style="font-size:1.1rem; margin-bottom:0.75rem; color: #eef4ff; display:flex; align-items:center; gap:8px;"><i class="fas fa-toolbox"></i> Materiales requeridos</h4>
            <ul style="margin:0; padding-left:1.5rem; color:rgba(237,242,255,0.85); line-height: 1.6;">
            ${materials.map((m) => `<li style="margin-bottom: 4px;">${escapeHtml(m)}</li>`).join("")}
            </ul>
        </div>
      `
          : ""
      }
      
      ${
        t.requirements
          ? `
        <div style="margin-bottom:1rem; padding: 1rem; border-left: 4px solid var(--accent); background: var(--bg-surface); border-radius: 0 8px 8px 0;">
            <h4 style="font-size:1rem; margin-bottom:0.5rem; color: #eef4ff;">Requisitos adicionales</h4>
            <p style="margin:0; color:rgba(237,242,255,0.85); font-size: 0.95rem;">${escapeHtml(t.requirements)}</p>
        </div>
      `
          : ""
      }

      ${enrollmentHtml}
    </div>
  `;

  mostrarModalDinamico("Detalles del Taller", html);
};

window.inscribirTaller = async function (workshopId) {
  const btn = document.getElementById("btnEnrollWorkshop");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscribiendo...';
  }

  try {
    const userId =
      userSession?.id || userSession?.userId || userSession?.user_id;
    const res = await fetch(getApiUrl("workshop-enroll.php"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, workshopId }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      mostrarNotificacion("¡Inscripción exitosa al taller!", "success");
      document.getElementById("dynamicDetailsModal").classList.add("hidden");
      cargarTalleres();
    } else {
      throw new Error(
        data.error || "Ocurrió un error al intentar inscribirte.",
      );
    }
  } catch (error) {
    mostrarNotificacion(error.message, "error");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="fas fa-user-plus"></i> Inscribirme a este taller';
    }
  }
};

window.mostrarDetalleConferencia = function (id) {
  const c = window.conferenceDataCache?.find((conf) => conf.id === id);
  if (!c) return;

  const tags = c.tags || [];
  const cover = c.cover_image_url
    ? c.cover_image_url.startsWith("/uploads/")
      ? "/app" + c.cover_image_url
      : c.cover_image_url
    : "";

  let html = `
    <div style="text-align:left; color:#eef4ff;">
      ${cover ? `<img src="${cover}" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">` : ""}
      
      <h3 style="margin: 0 0 1rem 0; color:#eef4ff; font-size: 1.5rem; font-weight: 800;">${escapeHtml(c.name)}</h3>
      
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.09);">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8; font-size: 1.5rem; flex-shrink: 0;">
            <i class="fas fa-microphone-alt"></i>
        </div>
        <div style="flex:1;">
          <p style="color:#fff; font-weight:bold; font-size: 1.1rem; margin:0;">${escapeHtml(c.speaker_name || "Por definir")}</p>
          ${c.speaker_title || c.speaker_org ? `<p style="color:rgba(237,242,255,0.6); font-size:0.9rem; margin:4px 0 0 0;">${escapeHtml(c.speaker_title)} ${c.speaker_org ? " - " + escapeHtml(c.speaker_org) : ""}</p>` : ""}
        </div>
      </div>
      
      <p style="margin-bottom:2rem; line-height:1.6; color:rgba(237,242,255,0.85); font-size: 1.05rem;">${escapeHtml(c.description || "Sin descripción.")}</p>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:1rem; margin-bottom:2rem; background:rgba(255,255,255,0.03); padding:1.25rem; border-radius:12px; border: 1px solid rgba(255,255,255,0.09);">
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-calendar" style="color:#f2a900;"></i> Fecha</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(c.conference_date || "Por definir")}</span>
        </div>
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-clock" style="color:#f2a900;"></i> Horario</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(c.time_start || "--:--")} a ${escapeHtml(c.time_end || "--:--")}</span>
        </div>
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-map-marker-alt" style="color:#f2a900;"></i> Lugar</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(c.location || "Por definir")}</span>
        </div>
        <div>
          <strong style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:rgba(237,242,255,0.6); margin-bottom:4px; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-language" style="color:#f2a900;"></i> Idioma</strong>
          <span style="font-weight: 600; color: var(--text-body);">${escapeHtml(c.language || "Español")}</span>
        </div>
      </div>
      
      ${
        tags.length
          ? `
        <div>
            <h4 style="font-size:1.1rem; margin-bottom:0.75rem; color: var(--primary-blue); display:flex; align-items:center; gap:8px;"><i class="fas fa-tags"></i> Etiquetas</h4>
            <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            ${tags.map((tag) => `<span class="badge badge-accent" style="font-size: 0.85rem; padding: 6px 12px; border-radius: 20px;">${escapeHtml(tag)}</span>`).join("")}
            </div>
        </div>
      `
          : ""
      }
    </div>
  `;

  mostrarModalDinamico("Detalles de Conferencia", html);
};

function mostrarModalDinamico(title, contentHtml) {
  let modal = document.getElementById("dynamicDetailsModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "dynamicDetailsModal";
    modal.className = "modal-overlay hidden";
    modal.style.zIndex = "10000";
    modal.innerHTML = `
      <div class="modal-card" style="background: #0b1220; border: 1px solid rgba(255,255,255,0.12); max-width: 600px; width: 90%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
        <div class="modal-head" style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.09); padding-bottom: 1rem; margin-bottom: 1rem;">
          <h3 id="dynamicModalTitle" style="margin: 0; font-size: 1.25rem; color:#eef4ff;"></h3>
          <button class="modal-close-btn" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8;" onclick="document.getElementById('dynamicDetailsModal').classList.add('hidden')">&times;</button>
        </div>
        <div id="dynamicModalBody" class="modal-body" style="flex: 1; overflow-y: auto; padding-right: 0.5rem; color: #eef4ff;">
        </div>
        <div class="modal-foot" style="flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.09); padding-top: 1rem; margin-top: 1rem; text-align: right;">
          <button style="background: rgba(255,255,255,0.07); color: #edf2ff; border: 1px solid rgba(255,255,255,0.12); padding: 8px 16px; border-radius: 8px; cursor:pointer;" onclick="document.getElementById('dynamicDetailsModal').classList.add('hidden')">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  document.getElementById("dynamicModalTitle").textContent = title;
  document.getElementById("dynamicModalBody").innerHTML = contentHtml;

  void modal.offsetWidth;
  modal.classList.remove("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== PERFIL =====
function cargarDatosPerfil() {
  const userName = document.getElementById("userName");
  if (userName) {
    userName.textContent = userSession.full_name || "Participante";
  }
}

function initWizardProfileFields() {
  const profile = userSession.profile || {};
  setInputValue(
    "profileFullName",
    profile.full_name || userSession.full_name || "",
  );
  setInputValue("profileSchool", profile.school || "");
  setInputValue("profileControlNumber", profile.control_number || "");
  setInputValue("profileCareer", profile.career || "");
  setInputValue("profileSemester", profile.semester || "");
  setInputValue("profileCountry", profile.country || "");
  setInputValue("profileCity", profile.city || "");
  setInputValue("profilePhone", profile.phone || userSession.phone || "");
  setInputValue("profileEmail", userSession.email || "");
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value || "";
}

// ===== MODAL =====
function abrirInscripcionCongreso(options = {}) {
  const modal = document.getElementById("modalInscripcion");
  if (!modal) return;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (typeof options.congress === "boolean")
    setCheckboxValue("includeCongress", options.congress);
  if (typeof options.robotics === "boolean")
    setCheckboxValue("includeRobotics", options.robotics);
  if (typeof options.camp === "boolean")
    setCheckboxValue("includeCamp", options.camp);

  const robotCount = document.getElementById("robotCount");
  if (robotCount && options.robotCount) {
    robotCount.value = String(
      Math.max(1, Number.parseInt(options.robotCount, 10) || 1),
    );
  }

  goWizardStep(1);
  syncPackageControls();
}

function cerrarModal() {
  const modal = document.getElementById("modalInscripcion");
  if (modal) modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function actualizarNombreArchivo(input) {
  const fileName = input.files[0]?.name || "Haz clic para seleccionar archivo";
  const label = document.getElementById("fileName");
  if (label) label.textContent = fileName;
}

function setCheckboxValue(id, checked) {
  const input = document.getElementById(id);
  if (input && typeof checked === "boolean") input.checked = checked;
}

// ===== CALCULO TOTAL PAQUETE =====
function calcularTotal(congress, robotics, camp, robotCount) {
  let total = 0;
  if (congress) total += PRECIO_CONGRESO;
  if (robotics) total += getPrecioRobotActual() * Math.max(1, robotCount);
  if (camp) total += PRECIO_CAMPAMENTO;
  return total;
}

function getPackageSelection() {
  const cEl = document.getElementById("includeCongress");
  const rEl = document.getElementById("includeRobotics");
  const caEl = document.getElementById("includeCamp");

  return {
    includeCongress: cEl ? cEl.checked && !cEl.disabled : false,
    includeRobotics: rEl ? rEl.checked && !rEl.disabled : false,
    includeCamp: caEl ? caEl.checked && !caEl.disabled : false,
    robotCount: Math.max(
      1,
      Number.parseInt(
        document.getElementById("robotCount")?.value || "1",
        10,
      ) || 1,
    ),
  };
}

function syncPackageControls() {
  const congressToggle = document.getElementById("includeCongress");
  const roboticsToggle = document.getElementById("includeRobotics");
  const campToggle = document.getElementById("includeCamp");
  const robotCount = document.getElementById("robotCount");
  const goRoboticsBtn = document.getElementById("btnGoRobotRegistration");
  const helper = document.getElementById("submitHelper");
  const totalDisplay = document.getElementById("packageTotalDisplay");

  if (!congressToggle || !roboticsToggle || !campToggle || !robotCount) return;

  const updateState = () => {
    // Forzar desmarcado si el input está bloqueado
    if (congressToggle.disabled) congressToggle.checked = false;
    if (campToggle.disabled) campToggle.checked = false;
    if (roboticsToggle.disabled) roboticsToggle.disabled = false;

    const hasAnySelection =
      (congressToggle.checked && !congressToggle.disabled) ||
      (roboticsToggle.checked && !roboticsToggle.disabled) ||
      (campToggle.checked && !campToggle.disabled);
    robotCount.disabled = !roboticsToggle.checked;
    if (!roboticsToggle.checked) robotCount.value = "1";

    goRoboticsBtn?.classList.toggle("hidden", !roboticsToggle.checked);

    if (helper) {
      helper.textContent = hasAnySelection
        ? "Puedes continuar al siguiente paso."
        : "Selecciona al menos una convocatoria para continuar.";
    }

    // Actualizar total
    if (totalDisplay) {
      const count = Math.max(
        1,
        Number.parseInt(robotCount.value || "1", 10) || 1,
      );
      const total = calcularTotal(
        congressToggle.checked && !congressToggle.disabled,
        roboticsToggle.checked && !roboticsToggle.disabled,
        campToggle.checked && !campToggle.disabled,
        count,
      );
      totalDisplay.textContent =
        total > 0 ? `$${total.toLocaleString("es-MX")} MXN` : "$0 MXN";
    }

    localStorage.setItem(
      PACKAGE_DRAFT_KEY,
      JSON.stringify({
        congress: congressToggle.checked,
        robotics: roboticsToggle.checked,
        camp: campToggle.checked,
        robotCount: Math.max(
          1,
          Number.parseInt(robotCount.value || "1", 10) || 1,
        ),
      }),
    );
  };

  congressToggle.onchange = updateState;
  roboticsToggle.onchange = updateState;
  campToggle.onchange = updateState;
  robotCount.oninput = updateState;
  updateState();
}

function restorePackageDraft() {
  const raw = localStorage.getItem(PACKAGE_DRAFT_KEY);
  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    setCheckboxValue("includeCongress", draft.congress);
    setCheckboxValue("includeRobotics", draft.robotics);
    setCheckboxValue("includeCamp", draft.camp);
    const robotCount = document.getElementById("robotCount");
    if (robotCount && draft.robotCount) {
      robotCount.value = String(
        Math.max(1, Number.parseInt(draft.robotCount, 10) || 1),
      );
    }
  } catch (error) {
    console.error("No se pudo restaurar borrador", error);
  }
}

// ===== WIZARD =====
function attachWizardEvents() {
  document.getElementById("btnGoStep2")?.addEventListener("click", () => {
    const selection = getPackageSelection();
    if (
      !selection.includeCongress &&
      !selection.includeRobotics &&
      !selection.includeCamp
    ) {
      mostrarNotificacion("Selecciona al menos una convocatoria.", "error");
      return;
    }
    goWizardStep(2);
  });

  document
    .getElementById("btnBackStep1")
    ?.addEventListener("click", () => goWizardStep(1));
  document
    .getElementById("btnBackStep2")
    ?.addEventListener("click", () => goWizardStep(2));
  document
    .getElementById("btnBackStep3")
    ?.addEventListener("click", () => goWizardStep(3));

  document.getElementById("btnGoStep3")?.addEventListener("click", async () => {
    const ok = await persistProfileStep();
    if (!ok) return;

    const draft = await submitRequest({ withReceipt: false, silent: true });
    if (!draft) return;

    renderWizardSummary(draft);
    goWizardStep(3);
  });

  document
    .getElementById("btnGoStep4")
    ?.addEventListener("click", () => goWizardStep(4));

  document
    .getElementById("btnSaveWithoutReceipt")
    ?.addEventListener("click", async () => {
      const result = await submitRequest({ withReceipt: false });
      if (!result) return;

      mostrarNotificacion(
        "Solicitud guardada. Puedes pagar y subir comprobante en Mi solicitud.",
        "success",
      );
      cerrarModal();
      cargarEstadoSolicitud();
    });

  document
    .getElementById("enrollForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const file = document.getElementById("receiptFile")?.files?.[0];
      if (!file) {
        mostrarNotificacion(
          "Sube comprobante o usa Guardar y pagar después.",
          "error",
        );
        return;
      }

      const result = await submitRequest({ withReceipt: true });
      if (!result) return;

      mostrarNotificacion(
        "Solicitud enviada con comprobante. Estado: pendiente de revisión.",
        "success",
      );
      cerrarModal();
      cargarEstadoSolicitud();
      localStorage.removeItem(PACKAGE_DRAFT_KEY);
    });
}

function goWizardStep(step) {
  [1, 2, 3, 4].forEach((id) => {
    const section = document.getElementById(`wizardStep${id}`);
    if (section) section.classList.toggle("hidden", id !== step);
  });

  document.querySelectorAll("#wizardMini span").forEach((item) => {
    const current = Number.parseInt(item.getAttribute("data-step") || "0", 10);
    item.classList.toggle("active", current === step);
  });
}

async function persistProfileStep() {
  const fullName = document.getElementById("profileFullName")?.value?.trim();
  if (!fullName) {
    mostrarNotificacion("El nombre completo es requerido.", "error");
    return false;
  }
  return true;
}

async function submitRequest({ withReceipt = false, silent = false } = {}) {
  const selection = getPackageSelection();
  const profile = {
    full_name: document.getElementById("profileFullName")?.value?.trim(),
    school: document.getElementById("profileSchool")?.value?.trim(),
    control_number: document
      .getElementById("profileControlNumber")
      ?.value?.trim(),
    career: document.getElementById("profileCareer")?.value?.trim(),
    semester: document.getElementById("profileSemester")?.value?.trim(),
    country: document.getElementById("profileCountry")?.value?.trim(),
    city: document.getElementById("profileCity")?.value?.trim(),
    phone: document.getElementById("profilePhone")?.value?.trim(),
    email: document.getElementById("profileEmail")?.value?.trim(),
  };

  const userId = userSession?.id || userSession?.userId || userSession?.user_id;
  const formData = new FormData();
  formData.append("userId", String(userId || ""));
  formData.append("includes_congress", String(selection.includeCongress));
  formData.append("includes_robotics", String(selection.includeRobotics));
  formData.append("includes_camp", String(selection.includeCamp));
  formData.append("robot_count", String(selection.robotCount));
  formData.append("country", profile.country || "");
  formData.append("city", profile.city || "");
  formData.append("school", profile.school || "");
  formData.append("matricula", profile.control_number || "");
  formData.append("profile", JSON.stringify(profile));
  formData.append("skip_receipt", withReceipt ? "false" : "true");

  if (withReceipt) {
    const file = document.getElementById("receiptFile")?.files?.[0];
    if (file) formData.append("receipt", file);
  }

  try {
    const res = await fetch(getApiUrl("congress-enroll.php"), {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.error || "Error al guardar solicitud");

    currentRequestFolio =
      data.request_folio || data.data?.request_folio || currentRequestFolio;
    return data.data || data;
  } catch (error) {
    if (!silent)
      mostrarNotificacion(
        "No se pudo guardar la solicitud: " + error.message,
        "error",
      );
    // En desarrollo, simulamos respuesta para no bloquear el wizard
    const folio =
      "REN-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      request_folio: folio,
      total_fee: calcularTotal(
        selection.includeCongress,
        selection.includeRobotics,
        selection.includeCamp,
        selection.robotCount,
      ),
      ...selection,
    };
  }
}

function renderWizardSummary(data) {
  const packages = [];
  if (data.includeCongress || data.includes_congress)
    packages.push("Congreso ($400)");
  if (data.includeRobotics || data.includes_robotics) {
    const count = data.robotCount || data.robot_count || 1;
    const precio = getPrecioRobotActual();
    packages.push(`Robótica – ${count} robot(s) × $${precio}`);
  }
  if (data.includeCamp || data.includes_camp)
    packages.push("Campamento ($200)");

  const selection = getPackageSelection();
  const total =
    data.total_fee ||
    calcularTotal(
      selection.includeCongress,
      selection.includeRobotics,
      selection.includeCamp,
      selection.robotCount,
    );

  setElement("wizardSummaryPackages", packages.join(" + ") || "-");
  setElement("wizardSummaryTotal", formatCurrency(total));
  setElement("wizardSummaryFolio", data.request_folio || "-");

  const qr = document.getElementById("wizardSummaryQr");
  if (qr && data.request_folio) {
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.request_folio)}`;
    qr.alt = data.request_folio;
  }
}

function setElement(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ===== ESTADO SOLICITUD =====
async function cargarEstadoSolicitud() {
  try {
    const userId =
      userSession?.id || userSession?.userId || userSession?.user_id;
    if (!userId) return;

    const res = await fetch(
      getApiUrl(`congress-request-status.php?userId=${userId}`),
      { credentials: "include" },
    );
    if (!res.ok) throw new Error("Error al cargar estado");
    const json = await res.json();
    if (json.success && json.data) {
      renderEstadoSolicitud(json.data);

      // Bloquear convocatorias que ya tiene activas (pagadas, pendientes o en revisión)
      const activeStatuses = [
        "approved",
        "paid",
        "pending",
        "resubmit_requested",
      ];
      const isActive = activeStatuses.includes(
        String(json.data.status || "").toLowerCase(),
      );
      if (isActive) {
        aplicarRestriccionesConvocatorias(json.data);
      }

      // Actualizar capacidad de inscripción a talleres
      const isApproved =
        json.data.status === "approved" || json.data.status === "paid";
      if (isApproved && json.data.includes_congress) {
        userCanEnrollWorkshop = true;
        if (window.workshopDataCache || window.conferenceDataCache) {
          renderPanelMiTaller(
            window.workshopDataCache || [],
            window.conferenceDataCache || [],
          );
        }
      }
    }
  } catch {
    // Sin solicitud activa — estado por defecto ya está en el HTML
  }
}

/**
 * Deshabilita los checkboxes del wizard para las convocatorias que el usuario
 * ya tiene inscritas, en proceso de revisión o pendientes de pago.
 * Así no puede volver a pagar algo que ya solicitó.
 */
function aplicarRestriccionesConvocatorias(data) {
  const status = String(data.status || "").toLowerCase();
  // Solo restringimos si la solicitud no fue rechazada (si fue rechazada puede reintentar)
  if (status === "rejected") return;

  const lockCongress = !!data.includes_congress;
  const lockRobotics = false; // Robótica permite inscripciones múltiples
  const lockCamp = !!data.includes_camp;

  const statusLabel =
    {
      approved: "ya aprobado",
      paid: "ya pagado",
      pending: "en revisión / pendiente de pago",
      resubmit_requested: "pendiente de reenvío",
    }[status] || "en proceso";

  function bloquearCheckbox(id, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = false;
    el.disabled = true;
    // Marcar visualmente el package-option si existe
    const wrapper = el.closest(".package-option");
    if (wrapper) {
      wrapper.style.opacity = "0.6";
      wrapper.style.cursor = "not-allowed";
      wrapper.classList.remove("selected", "active", "checked");
      wrapper.title = `${label} — ${statusLabel}. No puedes volver a inscribirte.`;
      // Añadir badge de estado si no existe ya
      if (!wrapper.querySelector(".pkg-lock-badge")) {
        const badge = document.createElement("span");
        badge.className = "pkg-lock-badge";
        badge.textContent = "Ya inscrito";
        badge.style.cssText =
          "font-size:0.7rem; font-weight:700; color:#0b1220; background:var(--accent-gold,#f2a900);" +
          "padding:2px 8px; border-radius:20px; margin-left:auto; white-space:nowrap;";
        wrapper.appendChild(badge);
      }
    }
  }

  if (lockCongress) bloquearCheckbox("includeCongress", "Congreso");
  if (lockRobotics) bloquearCheckbox("includeRobotics", "Robótica");
  if (lockCamp) bloquearCheckbox("includeCamp", "Campamento");

  // También mostrar aviso en el wizard si alguno está bloqueado
  if (lockCongress || lockRobotics || lockCamp) {
    const helper = document.getElementById("submitHelper");
    if (helper) {
      const locked = [
        lockCongress && "Congreso",
        lockRobotics && "Robótica",
        lockCamp && "Campamento",
      ]
        .filter(Boolean)
        .join(", ");
      helper.innerHTML =
        `<span style="color:#f2a900;">ℹ️ Ya tienes una solicitud ${statusLabel} para: <strong>${locked}</strong>. ` +
        `No puedes volver a inscribirte en esas convocatorias.</span>`;
    }
  }
}

function renderEstadoSolicitud(data) {
  if (!data) return;

  const badge = document.getElementById("requestStatusBadge");
  const packages = document.getElementById("requestSummaryPackages");
  const total = document.getElementById("requestSummaryTotal");
  const folio = document.getElementById("requestSummaryFolio");
  const receipt = document.getElementById("requestSummaryReceipt");
  const created = document.getElementById("requestSummaryCreated");
  const adminMessage = document.getElementById("requestAdminMessage");
  const btnResubmit = document.getElementById("btnResubmitRequest");

  if (!data || !data.status) return;

  currentRequestFolio = data.request_folio || currentRequestFolio;

  const state = mapRequestStatus(data.status, data.has_receipt);
  if (badge) {
    badge.textContent = state.label;
    badge.className = `request-status-badge ${state.css}`;
  }
  if (packages) packages.textContent = buildPackageLabel(data);
  if (total) total.textContent = formatCurrency(data.total_fee);
  if (folio) folio.textContent = data.request_folio || "-";
  if (receipt) receipt.textContent = data.receipt_filename || "Aún no subido";
  if (created) created.textContent = formatDateTime(data.created_at);

  if (btnResubmit) {
    const show =
      data.status === "rejected" || data.status === "resubmit_requested";
    btnResubmit.classList.toggle("hidden", !show);
  }

  if (adminMessage) {
    const note = data.rejection_reason || data.admin_notes;
    if (note) {
      adminMessage.classList.remove("hidden");
      adminMessage.textContent = note;
    } else {
      adminMessage.classList.add("hidden");
      adminMessage.textContent = "";
    }
  }
}

function mapRequestStatus(status, hasReceipt) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "paid")
    return { label: "Aceptado", css: "approved" };
  if (s === "rejected") return { label: "Rechazado", css: "rejected" };
  if (s === "resubmit_requested")
    return { label: "Reenviar comprobante", css: "resubmit" };
  if (s === "pending" && !hasReceipt)
    return { label: "Pendiente de pago", css: "resubmit" };
  if (s === "pending")
    return { label: "Pendiente de revisión", css: "pending" };
  return { label: "Sin solicitud", css: "empty" };
}

function buildPackageLabel(data) {
  const labels = [];
  if (data.includes_congress) labels.push("Congreso");
  if (data.includes_robotics) labels.push("Robótica");
  if (data.includes_camp) labels.push("Campamento");
  return labels.length ? labels.join(" + ") : "Sin paquetes";
}

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===== NOTIFICACIONES =====
function mostrarNotificacion(mensaje, tipo) {
  document.querySelector(".notificacion")?.remove();

  const notificacion = document.createElement("div");
  notificacion.className = `notificacion ${tipo}`;
  notificacion.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${
        tipo === "success"
          ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
          : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
      }
    </svg>
    <span>${mensaje}</span>`;

  notificacion.style.cssText = `
    position: fixed; bottom: 30px; right: 30px;
    display: flex; align-items: center; gap: 12px;
    padding: 16px 24px; border-radius: 16px; font-weight: 600;
    box-shadow: 0 8px 20px rgba(0,0,0,0.22); z-index: 2000;
    animation: slideIn 0.3s ease;
    background: ${tipo === "success" ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)"};
    color: ${tipo === "success" ? "#d1fae5" : "#ffe4e6"};
    border: 1px solid ${tipo === "success" ? "rgba(52,211,153,0.2)" : "rgba(251,113,133,0.2)"};`;

  document.body.appendChild(notificacion);
  setTimeout(() => {
    notificacion.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notificacion.remove(), 300);
  }, 4000);
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);

// ===== EVENTOS GLOBALES =====
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarModal();
});

document.getElementById("modalInscripcion")?.addEventListener("click", (e) => {
  if (e.target.id === "modalInscripcion") cerrarModal();
});

// ===== PANEL: MI TALLER / MIS CONFERENCIAS =====
function renderPanelMiTaller(workshops, conferences) {
  const panelTaller = document.getElementById("panelMiTaller");
  const panelConf = document.getElementById("panelConferencias");

  // ── Mi Taller ──────────────────────────────────────────────────
  if (panelTaller) {
    if (userEnrolledWorkshopId) {
      const t = workshops.find((w) => w.id === userEnrolledWorkshopId);
      if (t) {
        const cover = t.cover_image_url
          ? t.cover_image_url.startsWith("/uploads/")
            ? "/app" + t.cover_image_url
            : t.cover_image_url
          : "assets/images/electro.png";

        document.getElementById("miTallerContent").innerHTML = `
          <div class="enrolled-taller-card">
            <img class="enrolled-taller-img" src="${cover}" onerror="this.src='assets/images/electro.png'" alt="${escapeHtml(t.name)}">
            <div class="enrolled-taller-info">
              <p class="enrolled-taller-name">${escapeHtml(t.name)}</p>
              <p class="enrolled-taller-instructor"><i class="fas fa-user-tie"></i> ${escapeHtml(t.instructor_name || "Por definir")}</p>
              <div class="enrolled-taller-meta">
                <span><i class="fas fa-calendar-alt"></i> ${escapeHtml(t.schedule_date || "Fecha por confirmar")}</span>
                <span><i class="fas fa-clock"></i> ${escapeHtml(t.schedule_start || "--:--")} – ${escapeHtml(t.schedule_end || "--:--")}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(t.location || "Por confirmar")}</span>
                <span><i class="fas fa-users"></i> ${t.enrolled_count}/${t.max_capacity} inscritos</span>
              </div>
              <span class="enrolled-badge"><i class="fas fa-check-circle"></i> Inscrito</span>
              <div style="margin-top:10px;">
                <button class="btn-primary-hero" style="font-size:0.85rem; padding:8px 18px;" onclick="mostrarDetalleTaller(${t.id})">
                  <i class="fas fa-eye"></i> Ver detalles del taller
                </button>
              </div>
            </div>
          </div>`;
        panelTaller.classList.remove("hidden");
      }
    } else if (userCanEnrollWorkshop) {
      // Aprobado pero sin taller aún — mostrar panel con CTA de inscripción
      document.getElementById("miTallerContent").innerHTML = `
        <div style="text-align:center; padding:24px 0;">
          <div style="font-size:2.5rem; color:rgba(0,212,255,0.4); margin-bottom:12px;"><i class="fas fa-chalkboard"></i></div>
          <p style="color:#eef4ff; font-weight:700; font-size:1rem; margin-bottom:6px;">¡Ya puedes inscribirte a un taller!</p>
          <p style="color:rgba(237,242,255,0.6); font-size:0.85rem; margin-bottom:16px;">Tu inscripción al Congreso fue aprobada. Elige uno de los talleres disponibles abajo. Solo puedes elegir uno.</p>
          <a href="#talleresContainer" class="btn-primary-hero" style="font-size:0.85rem; padding:9px 20px;">
            <i class="fas fa-arrow-down"></i> Ver talleres disponibles
          </a>
        </div>`;
      panelTaller.classList.remove("hidden");
    }
  }

  // ── Mis Conferencias ───────────────────────────────────────────
  if (panelConf && userCanEnrollWorkshop && conferences.length > 0) {
    const confHtml = conferences
      .map(
        (c) => `
      <div class="conf-item" onclick="mostrarDetalleConferencia(${c.id})">
        <div class="conf-item-icon"><i class="fas fa-microphone-alt"></i></div>
        <div class="conf-item-body">
          <p class="conf-item-name">${escapeHtml(c.name || "Conferencia")}</p>
          <div class="conf-item-meta">
            <span><i class="fas fa-user"></i> ${escapeHtml(c.speaker_name || "Por confirmar")}</span>
            <span><i class="fas fa-calendar-alt"></i> ${escapeHtml(c.conference_date || "Fecha por confirmar")}</span>
            <span><i class="fas fa-clock"></i> ${escapeHtml(c.time_start || "--:--")}</span>
            ${c.location ? `<span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(c.location)}</span>` : ""}
          </div>
        </div>
        <i class="fas fa-chevron-right" style="color:rgba(237,242,255,0.3); flex-shrink:0;"></i>
      </div>`,
      )
      .join("");
    document.getElementById("misConferenciasContent").innerHTML =
      `<div class="conf-list">${confHtml}</div>`;
    panelConf.classList.remove("hidden");
  }
}

function cerrarSesion() {
  fetch("/app/api/auth-logout.php", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  })
    .catch((err) => console.error("Error al cerrar sesión en servidor:", err))
    .finally(() => {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(PACKAGE_DRAFT_KEY);
      window.location.href = "/acceso";
    });
}

function irRegistroRobotica() {
  window.location.href = "/tramite";
}
