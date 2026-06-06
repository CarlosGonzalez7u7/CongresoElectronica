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

async function cargarProgramaAcademico() {
  const container = document.getElementById("talleresContainer");
  const vacios = document.getElementById("talleresVacios");
  if (!container) return;

  container.innerHTML =
    '<div style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-mute);"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 1rem;">Cargando programa académico...</p></div>';
  container.classList.remove("hidden");
  if (vacios) vacios.classList.add("hidden");

  try {
    const [resWs, resConf, resCfs] = await Promise.all([
      fetch(getApiUrl("admin-workshops.php?action=list")).then((r) => r.json()),
      fetch(getApiUrl("admin-workshops.php?action=list_conferences")).then(
        (r) => r.json(),
      ),
      fetch(getApiUrl("admin-workshops.php?action=get_call_for_speakers"))
        .then((r) => r.json())
        .catch(() => ({})),
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

          let reqDocs = [];
          try {
            if (c.requirements_docs) reqDocs = JSON.parse(c.requirements_docs);
          } catch (e) {}
          let docsHtml = "";
          if (reqDocs.length > 0) {
            docsHtml = `<div style="margin-bottom:0.8rem; display:flex; gap:8px; flex-wrap:wrap;">${reqDocs.map((doc) => `<a href="${escapeHtml(doc.url)}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:rgba(239,68,68,0.1); color:#fca5a5; border:1px solid rgba(239,68,68,0.2); border-radius:6px; font-size:0.75rem; text-decoration:none;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'"><i class="fas fa-file-pdf"></i> ${escapeHtml(doc.name)}</a>`).join("")}</div>`;
          }
          let contactHtml = "";
          if (c.contact_email || c.contact_phone) {
            contactHtml = `<div style="margin-bottom:0.8rem; font-size:0.8rem; color:var(--muted); background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <strong style="display:block; margin-bottom:4px; color:#e2e8f0;"><i class="fas fa-address-book" style="color:#38bdf8;"></i> Contacto del Ponente:</strong>
              ${c.contact_email ? `<span style="margin-right:12px;"><i class="fas fa-envelope"></i> <a href="mailto:${escapeHtml(c.contact_email)}" style="color:#38bdf8; text-decoration:none;">${escapeHtml(c.contact_email)}</a></span>` : ""}
              ${c.contact_phone ? `<span><i class="fas fa-phone"></i> <a href="https://wa.me/${escapeHtml(c.contact_phone.replace(/\D/g, ""))}" target="_blank" style="color:#34d399; text-decoration:none;">${escapeHtml(c.contact_phone)}</a></span>` : ""}
            </div>`;
          }

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

      try {
        if (resCfs && resCfs.success && resCfs.data) {
          const cfs = resCfs.data;
          if (cfs.active) {
            let docsHtml = "";
            if (cfs.docs && cfs.docs.length > 0) {
              docsHtml = `<div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                          ${cfs.docs.map((doc) => `<a href="${escapeHtml(doc.url)}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:rgba(239,68,68,0.1); color:#fca5a5; border:1px solid rgba(239,68,68,0.2); border-radius:8px; font-size:0.8rem; text-decoration:none; transition:background 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'"><i class="fas fa-file-pdf"></i> ${escapeHtml(doc.name)}</a>`).join("")}
                      </div>`;
            }
            let contactHtml = "";
            if (cfs.email || cfs.phone) {
              contactHtml = `<div style="margin-top:12px; font-size:0.85rem; color:var(--muted); background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); display:inline-block;">
                          <strong style="display:block; margin-bottom:4px; color:#e2e8f0;"><i class="fas fa-address-book" style="color:#38bdf8;"></i> Contacto para interesados</strong>
                          ${cfs.email ? `<span style="margin-right:12px;"><i class="fas fa-envelope"></i> <a href="mailto:${escapeHtml(cfs.email)}" style="color:#38bdf8; text-decoration:none;">${escapeHtml(cfs.email)}</a></span>` : ""}
                          ${cfs.phone ? `<span><i class="fas fa-phone"></i> <a href="https://wa.me/${escapeHtml(cfs.phone).replace(/\D/g, "")}" target="_blank" style="color:#34d399; text-decoration:none;">${escapeHtml(cfs.phone)}</a></span>` : ""}
                      </div>`;
            }
            html += `
                      <div style="width:100%; grid-column:1/-1; background: linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(14, 165, 233, 0.05)); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                          <h4 style="color: #38bdf8; font-size: 1.2rem; margin: 0 0 10px;"><i class="fas fa-bullhorn"></i> ${escapeHtml(cfs.title || "¿Quieres ser ponente?")}</h4>
                          <p style="color: #e2e8f0; font-size: 0.95rem; margin: 0 0 10px; line-height: 1.5;">${escapeHtml(cfs.description || "").replace(/\n/g, "<br>")}</p>
                          ${docsHtml}
                          ${contactHtml}
                      </div>`;
          }
        }
      } catch (e) {}

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
                <p style="font-size:0.9rem; color:var(--text-mute); margin-bottom:0.5rem; line-height:1.5;">${escapeHtml(c.description || "Sin descripción")}</p>
                ${docsHtml}
                ${contactHtml}
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
