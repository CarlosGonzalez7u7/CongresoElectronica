const ROBOTICA_CROQUIS_PDF = "Horario y croquis .pdf";
const CAMPAMENTO_GUIA_PDF = "Campamento .pdf";
const FALLBACK_COVER_IMAGE = "/assets/images/electro.png";

const FALLBACK_PDF_SUMMARIES = {
  robotica: [
    "Revisa tu categoría y horario de participación.",
    "Ubica accesos, pits y zonas de competencia.",
    "Confirma la logística de llegada y registro técnico.",
  ],
  campamento: [
    "Confirma punto y horario de reunión.",
    "Revisa recomendaciones y artículos sugeridos.",
    "Consulta lineamientos de convivencia y seguridad.",
  ],
};

const ETAPAS_ROBOTICA = [
  {
    inicio: new Date("2026-04-01"),
    fin: new Date("2026-06-30T23:59:59"),
  },
  {
    inicio: new Date("2026-07-01"),
    fin: new Date("2026-08-31T23:59:59"),
  },
  {
    inicio: new Date("2026-09-01"),
    fin: new Date("2026-10-23T23:59:59"),
  },
];

document.addEventListener("DOMContentLoaded", () => {
  // 1. Verificamos si hay alguna sesión activa en el navegador
  const userSession = sessionStorage.getItem("renovatec_user_session_v1");
  const adminSession = sessionStorage.getItem("adminUser");

  // 2. Si el usuario YA tiene sesión, cambiamos los botones
  if (userSession || adminSession) {
    const navActions = document.querySelector(".guest-nav-actions");
    const ctaRow = document.querySelector(".hero-showcase .landing-cta-row");
    const finalCta = document.querySelector(
      ".final-cta-section .landing-cta-row",
    );

    // Detectamos a qué panel debe ir
    const dashUrl = adminSession ? "/admin" : "/usuario";

    if (navActions) {
      navActions.innerHTML = `
        <a class="guest-nav-btn register" href="${dashUrl}">
          <i class="fas fa-home"></i> Ir a mi panel
        </a>
      `;
    }

    if (ctaRow) {
      ctaRow.innerHTML = `
        <a class="btn-primary-hero" href="${dashUrl}"><i class="fas fa-home"></i> Entrar a mi cuenta</a>
        <a class="btn-secondary-hero" href="#convocatoria-congreso"><i class="fas fa-eye"></i> Ver convocatorias</a>
      `;
    }

    if (finalCta) {
      finalCta.innerHTML = `
        <a class="btn-primary-hero btn-cta-grande" href="${dashUrl}"><i class="fas fa-home"></i> Entrar a mi panel</a>
      `;
    }
  }

  renderDocumentResources();
  marcarEtapaActiva();
  cargarAvisoPonentes();
  checkExistingIpBlock();
  cargarConvocatoriasDinamicas();
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderListInto(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const safeItems = Array.isArray(items)
    ? items.filter((item) => String(item || "").trim() !== "")
    : [];

  el.innerHTML = safeItems.length
    ? safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
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
  const roboticaUrl = getDocUrl(ROBOTICA_CROQUIS_PDF);
  const campamentoUrl = getDocUrl(CAMPAMENTO_GUIA_PDF);

  const robotOpen = document.getElementById("roboticaPdfOpen");
  const robotDownload = document.getElementById("roboticaPdfDownload");
  const robotFrame = document.getElementById("roboticaPdfFrame");
  const campOpen = document.getElementById("campamentoPdfOpen");
  const campDownload = document.getElementById("campamentoPdfDownload");
  const campFrame = document.getElementById("campamentoPdfFrame");

  if (robotOpen) robotOpen.href = roboticaUrl;
  if (robotDownload) robotDownload.href = roboticaUrl;
  if (robotFrame) robotFrame.src = `${roboticaUrl}#view=FitH`;

  if (campOpen) campOpen.href = campamentoUrl;
  if (campDownload) campDownload.href = campamentoUrl;
  if (campFrame) campFrame.src = `${campamentoUrl}#view=FitH`;

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

function marcarEtapaActiva() {
  const hoy = new Date();

  ETAPAS_ROBOTICA.forEach((etapa, idx) => {
    const num = idx + 1;
    const card = document.getElementById(`etapaCard${num}`);
    const estado = document.getElementById(`etapaEstado${num}`);

    if (!card || !estado) return;

    card.style.opacity = "";

    if (hoy >= etapa.inicio && hoy <= etapa.fin) {
      card.classList.add("etapa-destacada");
      estado.textContent = "● Etapa en curso";
      estado.className = "etapa-estado etapa-activa";
      return;
    }

    if (hoy < etapa.inicio) {
      card.classList.remove("etapa-destacada");
      estado.textContent = "Próximamente";
      estado.className = "etapa-estado";
      return;
    }

    card.classList.remove("etapa-destacada");
    card.style.opacity = "0.6";
    estado.textContent = "Periodo cerrado";
    estado.className = "etapa-estado";
  });
}

async function cargarAvisoPonentes() {
  try {
    const res = await fetch(
      getApiUrl("admin-workshops.php?action=get_call_for_speakers"),
    );
    const json = await res.json();
    if (json.success && json.data && json.data.active) {
      const cfs = json.data;
      const banner = document.getElementById("callForSpeakersBanner");
      if (!banner) return;

      let docsHtml = "";
      if (cfs.docs && cfs.docs.length > 0) {
        docsHtml = `<div style="margin-top:20px; display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">
              ${cfs.docs
                .map(
                  (doc) => `
                <div style="display:flex; align-items:stretch; border-radius:10px; overflow:hidden; box-shadow:0 6px 20px rgba(239,68,68,0.25); transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
                    <a href="${escapeHtml(doc.url)}#view=FitH" target="_blank" style="display:inline-flex; align-items:center; gap:8px; padding:12px 20px; background:linear-gradient(135deg, #ef4444, #dc2626); color:#fff; font-size:0.95rem; font-weight:700; text-decoration:none;"><i class="fas fa-file-pdf"></i> ${escapeHtml(doc.name)}</a>
                    <a href="${escapeHtml(doc.url)}" download style="display:inline-flex; align-items:center; padding:12px 16px; background:#b91c1c; color:#fff; text-decoration:none; border-left:1px solid rgba(0,0,0,0.1);" title="Descargar PDF"><i class="fas fa-download"></i></a>
                </div>
              `,
                )
                .join("")}
          </div>`;
      }
      let contactHtml = "";
      if (cfs.email || cfs.phone) {
        contactHtml = `<div style="margin-top:25px; font-size:0.95rem; color:var(--text); background:rgba(255,255,255,0.08); padding:16px 24px; border-radius:14px; border:1px solid rgba(255,255,255,0.15); display:inline-block; backdrop-filter: blur(10px);">
              <strong style="display:block; margin-bottom:10px; color:#fff; font-size:1.05rem;"><i class="fas fa-address-book" style="color:#38bdf8;"></i> Información de Contacto</strong>
              <div style="display:flex; gap: 24px; flex-wrap: wrap; justify-content:center;">
                  ${cfs.email ? `<span style="display:flex; align-items:center; gap:8px;"><i class="fas fa-envelope" style="color:#94a3b8; font-size:1.1rem;"></i> <a href="mailto:${escapeHtml(cfs.email)}" style="color:#60a5fa; text-decoration:none; font-weight:600;">${escapeHtml(cfs.email)}</a></span>` : ""}
                  ${cfs.phone ? `<span style="display:flex; align-items:center; gap:8px;"><i class="fab fa-whatsapp" style="color:#34d399; font-size:1.1rem;"></i> <a href="https://wa.me/${escapeHtml(cfs.phone).replace(/\D/g, "")}" target="_blank" style="color:#34d399; text-decoration:none; font-weight:600;">${escapeHtml(cfs.phone)}</a></span>` : ""}
              </div>
          </div>`;
      }
      banner.innerHTML = `
          <div style="max-width:1200px; margin: 0 auto; width:100%; position:relative; background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.95)); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 24px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.1); overflow:hidden;">
              <div style="position:absolute; top:-50%; left:-10%; width:300px; height:300px; background:radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>
              <div style="position:absolute; bottom:-50%; right:-10%; width:300px; height:300px; background:radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>
              <div style="position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; text-align:center;">
                  <div style="display:inline-flex; align-items:center; justify-content:center; width:72px; height:72px; border-radius:18px; background:rgba(56,189,248,0.15); color:#38bdf8; font-size:32px; margin-bottom:20px; border:1px solid rgba(56,189,248,0.3); box-shadow: 0 0 25px rgba(56,189,248,0.25);"><i class="fas fa-bullhorn"></i></div>
                  <h3 style="color: #f8fbff; font-size: 2.4rem; margin: 0 0 15px; font-family:'Syne', sans-serif; font-weight:800; letter-spacing:-0.5px; line-height:1.2;">${escapeHtml(cfs.title || "¿Quieres ser ponente?")}</h3>
                  <p style="color: #cbd5e1; font-size: 1.15rem; margin: 0 0 20px; line-height: 1.7; max-width:800px;">${escapeHtml(cfs.description || "").replace(/\n/g, "<br>")}</p>
                  ${docsHtml}
                  ${contactHtml}
              </div>
          </div>`;
      banner.style.display = "block";
    }
  } catch (error) {
    console.error("Error cargando aviso de ponentes:", error);
  }
}
