const ROBOTICA_CROQUIS_PDF = "Horario y croquis .pdf";
const CAMPAMENTO_GUIA_PDF = "Campamento .pdf";
const FALLBACK_COVER_IMAGE = "/public/assets/images/electro.png";

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
  const userSession = localStorage.getItem("renovatec_user_session_v1");
  const adminSession = localStorage.getItem("adminUser");

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
  cargarProgramaAcademico();
});

function getProjectBasePath() {
  const path = window.location.pathname || "/";
  if (path.endsWith("/index.html")) {
    return path.slice(0, -"/index.html".length);
  }
  if (path === "/") {
    return "";
  }
  return "";
}

function getApiUrl(endpoint) {
  return `${getProjectBasePath()}/app/api/${endpoint}`;
}

function getDocUrl(fileName) {
  return `${getProjectBasePath()}/public/assets/docs/${encodeURIComponent(fileName)}`;
}

function resolveMediaUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return FALLBACK_COVER_IMAGE;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/app/uploads/") || url.startsWith("/public/")) {
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

async function cargarProgramaAcademico() {
  const container = document.getElementById("talleresContainer");
  const vacios = document.getElementById("talleresVacios");
  if (!container) return;

  container.innerHTML =
    '<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-mute);"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 1rem;">Cargando programa académico...</p></div>';
  container.classList.remove("hidden");
  if (vacios) vacios.classList.add("hidden");

  try {
    const [resWs, resConf] = await Promise.all([
      fetch(getApiUrl("admin-workshops.php?action=list")).then((r) => r.json()),
      fetch(getApiUrl("admin-workshops.php?action=list_conferences")).then(
        (r) => r.json(),
      ),
    ]);

    const workshops = (resWs?.data || [])
      .filter((w) => w.status === "published" || w.status === "full")
      .sort(
        (a, b) =>
          new Date(a.schedule_date || "2099-12-31") -
          new Date(b.schedule_date || "2099-12-31"),
      );

    const conferences = (resConf?.data || [])
      .filter((c) => c.status === "published" || c.status === "full")
      .sort(
        (a, b) =>
          new Date(a.conference_date || "2099-12-31") -
          new Date(b.conference_date || "2099-12-31"),
      );

    let count = 0;
    let html = "";

    if (workshops.length > 0) {
      html +=
        '<h3 style="width:100%; grid-column:1/-1; margin-bottom:1rem; color:var(--primary-blue); border-bottom:2px solid var(--border-light); padding-bottom:8px;"><i class="fas fa-chalkboard"></i> Talleres Disponibles</h3>';
      html += workshops
        .map((t) => {
          count += 1;

          const cover = resolveMediaUrl(t.cover_image_url);

          const badge =
            t.status === "full" ||
            Number(t.enrolled_count || 0) >= Number(t.max_capacity || 0)
              ? '<span class="taller-tag" style="background:var(--danger); color:white; border:none;"><i class="fas fa-ban"></i> Lleno</span>'
              : "";

          return `
            <div class="taller-card" style="border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
              <div style="height:160px; background:var(--bg-surface); position:relative;">
                <img src="${cover}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${FALLBACK_COVER_IMAGE}'">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6));"></div>
                ${badge ? `<div style="position:absolute; top:12px; right:12px; z-index: 2;">${badge}</div>` : ""}
                <div style="position:absolute; bottom:12px; left:12px; right:12px; z-index: 2;">
                  <span style="color:#fff; font-size:0.8rem; font-weight:600;"><i class="fas fa-user-tie"></i> ${escapeHtml(t.instructor_name || "Por definir")}</span>
                </div>
              </div>
              <div style="padding: 1.1rem; flex: 1; display: flex; flex-direction: column;">
                <h4 style="margin:0 0 0.5rem 0; font-size:1.05rem; color:var(--primary-blue); font-weight:700; line-height:1.3;">${escapeHtml(t.name || "")}</h4>
                <p style="font-size:0.9rem; color:var(--text-mute); margin-bottom:1rem; line-height:1.5;">${escapeHtml(t.description || "Sin descripción")}</p>
                <div style="margin-top:auto; padding-top:0.8rem; border-top: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 0.8rem; color: var(--text-mute); font-weight: 600;"><i class="fas fa-calendar-alt"></i> ${escapeHtml(t.schedule_date || "Fecha pendiente")}</span>
                  <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;"><i class="fas fa-users"></i> ${Number(t.enrolled_count || 0)}/${Number(t.max_capacity || 0)} inscritos</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }

    if (conferences.length > 0) {
      html +=
        '<h3 style="width:100%; grid-column:1/-1; margin-top:2rem; margin-bottom:1rem; color:var(--primary-blue); border-bottom:2px solid var(--border-light); padding-bottom:8px;"><i class="fas fa-microphone-alt"></i> Conferencias</h3>';
      html += conferences
        .map((c) => {
          count += 1;

          const cover = resolveMediaUrl(c.cover_image_url);

          const badge =
            c.status === "full"
              ? '<span class="taller-tag" style="background:var(--danger); color:white; border:none;"><i class="fas fa-ban"></i> Lleno</span>'
              : "";

          return `
            <div class="taller-card" style="border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid var(--border-light);">
              <div style="height:160px; background:var(--bg-surface); position:relative;">
                <img src="${cover}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${FALLBACK_COVER_IMAGE}'">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6));"></div>
                ${badge ? `<div style="position:absolute; top:12px; right:12px; z-index: 2;">${badge}</div>` : ""}
                <div style="position:absolute; bottom:12px; left:12px; right:12px; z-index: 2;">
                  <span style="color:#fff; font-size:0.8rem; font-weight:600;"><i class="fas fa-microphone"></i> ${escapeHtml(c.speaker_name || "Por definir")}</span>
                </div>
              </div>
              <div style="padding: 1.1rem; flex: 1; display: flex; flex-direction: column;">
                <h4 style="margin:0 0 0.5rem 0; font-size:1.05rem; color:var(--primary-blue); font-weight:700; line-height:1.3;">${escapeHtml(c.name || "")}</h4>
                <p style="font-size:0.9rem; color:var(--text-mute); margin-bottom:1rem; line-height:1.5;">${escapeHtml(c.description || "Sin descripción")}</p>
                <div style="margin-top:auto; padding-top:0.8rem; border-top: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 4px;">
                  <span style="font-size: 0.8rem; color: var(--text-mute); font-weight: 600;"><i class="fas fa-calendar-alt"></i> ${escapeHtml(c.conference_date || "Sin fecha")}</span>
                  <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;"><i class="fas fa-clock"></i> ${escapeHtml(c.time_start || "--:--")}</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }

    if (count === 0) {
      container.classList.add("hidden");
      if (vacios) vacios.classList.remove("hidden");
      return;
    }

    container.innerHTML = html;
    container.classList.remove("hidden");
    if (vacios) vacios.classList.add("hidden");
  } catch (error) {
    console.error("Error cargando programa académico:", error);
    container.classList.add("hidden");
    if (vacios) vacios.classList.remove("hidden");
  }
}
