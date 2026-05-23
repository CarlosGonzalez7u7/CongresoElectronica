/**
 * usuario-convocatorias.js  — Carga dinámica de convocatorias, precios,
 * fechas y feature band en usuario.html desde la configuración del admin.
 *
 * Se ejecuta después de usuario.js. No requiere sesión admin.
 * Endpoint: GET /app/api/public-convocatorias.php
 *
 * RENOVATEC v20260523
 */

(function () {
  "use strict";

  // ─── Códigos "fijos" que ya tienen sección estática en usuario.html ───────
  // Para estos se actualiza el HTML existente. El resto se renderiza dinámicamente.
  const STATIC_CODIGOS = ["congreso", "robotica", "campamento"];

  // ─── Cache del fetch ──────────────────────────────────────────────────────
  let _publicData = null;

  async function fetchPublicData() {
    if (_publicData) return _publicData;
    const res = await fetch("/app/api/public-convocatorias.php", {
      credentials: "include",
    });
    const json = await res.json();
    if (json.success) {
      _publicData = json.data;
      return _publicData;
    }
    throw new Error(json.error || "No se pudieron cargar los datos públicos");
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  FUNCIÓN PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  async function cargarConfiguracionDinamica() {
    try {
      const data = await fetchPublicData();
      const { convocatorias = [], settings = {}, stages = [] } = data;

      aplicarSettings(settings);
      actualizarConvocatoriasEstaticas(convocatorias);
      actualizarEtapasRobotica(stages);
      renderizarConvocatoriasAdicionales(convocatorias);
      actualizarCTAFinal(convocatorias);
    } catch (err) {
      console.warn("[usuario-convocatorias] Error al cargar config dinámica:", err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  1. APLICAR SETTINGS (hero title, lead, feature band, countdown…)
  // ─────────────────────────────────────────────────────────────────────────
  function aplicarSettings(settings) {
    // Hero kicker / título
    if (settings.landing_hero_title) {
      const el = document.getElementById("dynamicHeroTitle");
      if (el) el.textContent = settings.landing_hero_title;
    }

    // Hero lead
    if (settings.landing_hero_lead) {
      const el = document.getElementById("dynamicHeroLead");
      if (el) el.textContent = settings.landing_hero_lead;
    }

    // Pills del hero (mini-pill-tag)
    if (settings.landing_hero_pills) {
      const container = document.getElementById("dynamicHeroPills");
      if (container) {
        const pills = settings.landing_hero_pills
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (pills.length) {
          container.innerHTML = pills
            .map(
              (p) =>
                `<span class="mini-pill-tag"><i class="fas fa-circle-check"></i> ${escHtml(p)}</span>`,
            )
            .join("");
        }
      }
    }

    // Feature band dinámica
    if (settings.landing_feature_band) {
      try {
        const tarjetas = JSON.parse(settings.landing_feature_band);
        const container = document.getElementById("dynamicFeatureBandUser");
        if (container && Array.isArray(tarjetas) && tarjetas.length) {
          container.innerHTML = tarjetas
            .map(
              (t) => `
            <article>
              <i class="${escHtml(t.icon || "fas fa-star")} feature-icon"></i>
              <div>
                <strong>${escHtml(t.title || "")}</strong>
                <span>${escHtml(t.desc || "")}</span>
              </div>
            </article>`,
            )
            .join("");
        }
      } catch (e) {
        console.warn("[usuario-convocatorias] feature_band JSON inválido", e);
      }
    }

    // Countdown
    if (settings.landing_event_date) {
      const eventDate = new Date(settings.landing_event_date.replace(/-/g, "/"));
      if (!isNaN(eventDate.getTime())) {
        iniciarCountdown(
          eventDate,
          settings.landing_event_end_date
            ? new Date(settings.landing_event_end_date.replace(/-/g, "/"))
            : null,
        );
      }
    }
  }

  function iniciarCountdown(eventDate, endDate) {
    const section = document.getElementById("dynamicCountdownSection");
    const label = document.getElementById("dynamicCountdownLabel");
    const timer = document.getElementById("dynamicCountdownTimer");
    if (!section || !timer) return;

    section.style.display = "flex";

    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    if (label) {
      label.textContent = "El evento inicia el " +
        eventDate.toLocaleDateString("es-MX", options);
    }

    const els = {
      d: document.getElementById("cdUserDays"),
      h: document.getElementById("cdUserHours"),
      m: document.getElementById("cdUserMins"),
      s: document.getElementById("cdUserSecs"),
    };

    const tick = () => {
      const now = Date.now();
      const dist = eventDate.getTime() - now;
      if (dist < 0) {
        clearInterval(interval);
        const ended = endDate && now > endDate.getTime();
        timer.innerHTML = ended
          ? `<div style="color:#f87171;font-weight:bold;font-size:1.5rem;padding:15px;">¡El evento ha finalizado!</div>`
          : `<div style="color:#34d399;font-weight:bold;font-size:1.5rem;padding:15px;">¡El evento está en curso!</div>`;
        return;
      }
      if (els.d) els.d.textContent = Math.floor(dist / 86400000).toString().padStart(2, "0");
      if (els.h) els.h.textContent = Math.floor((dist % 86400000) / 3600000).toString().padStart(2, "0");
      if (els.m) els.m.textContent = Math.floor((dist % 3600000) / 60000).toString().padStart(2, "0");
      if (els.s) els.s.textContent = Math.floor((dist % 60000) / 1000).toString().padStart(2, "0");
    };

    tick();
    const interval = setInterval(tick, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  2. ACTUALIZAR SECCIONES ESTÁTICAS (congreso, robotica, campamento)
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarConvocatoriasEstaticas(convocatorias) {
    for (const conv of convocatorias) {
      const codigo = (conv.codigo || "").toLowerCase();

      if (codigo === "congreso") {
        actualizarSeccionCongreso(conv);
      } else if (codigo === "robotica") {
        actualizarSeccionRobotica(conv);
      } else if (codigo === "campamento") {
        actualizarSeccionCampamento(conv);
      }
    }
  }

  function actualizarSeccionCongreso(conv) {
    setText("congresoTitulo", conv.titulo);
    setText("congresoDescripcion", conv.descripcion);
    setText("congresoPrecio", formatPrecio(conv));
    setText("congresoTalleresBadge", `Incluidos en ${formatPrecioCorto(conv)}`);
    setDates("congresoDates", conv);

    // Precio en hero-stats
    setText("statPrecioCongreso", formatPrecioCorto(conv));

    // Pill del wizard
    const pill = document.querySelector('.cta-package-pill .conv-pill-congreso-precio');
    if (pill) pill.textContent = "Congreso " + formatPrecioCorto(conv);

    // Badge de talleres
    const badge = document.getElementById("talleresIncludesBadge");
    if (badge) badge.textContent = `Incluidos en ${formatPrecioCorto(conv)}`;

    // Actualizar PRECIO_CONGRESO global para los cálculos del wizard
    if (typeof window.PRECIO_CONGRESO !== "undefined" && conv.precio_base) {
      window.PRECIO_CONGRESO = parseFloat(conv.precio_base);
    }
  }

  function actualizarSeccionRobotica(conv) {
    setText("roboticaTitulo", conv.titulo);
    setText("roboticaDescripcion", conv.descripcion);
    setDates("roboticaDates", conv);
  }

  function actualizarSeccionCampamento(conv) {
    setText("campamentoTitulo", conv.titulo);
    setText("campamentoDescripcion", conv.descripcion);
    setText("campamentoPrecio", formatPrecio(conv));
    setDates("campamentoDates", conv);

    // Precio en hero-stats
    setText("statPrecioCampamento", formatPrecioCorto(conv));

    // Actualizar global
    if (typeof window.PRECIO_CAMPAMENTO !== "undefined" && conv.precio_base) {
      window.PRECIO_CAMPAMENTO = parseFloat(conv.precio_base);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  3. ACTUALIZAR ETAPAS DE ROBÓTICA
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarEtapasRobotica(stages) {
    if (!stages || !stages.length) return;

    const grid = document.getElementById("etapasGridDynamic");
    if (!grid) return;

    const now = new Date();

    const html = stages.map((s, i) => {
      const inicio = new Date(s.start_date.replace(/-/g, "/"));
      const fin = new Date(s.end_date.replace(/-/g, "/"));
      const activa = now >= inicio && now <= fin;
      const pasada = now > fin;
      const precio = parseFloat(s.price_per_robot || 0);
      const color = s.color || "#f2a900";

      const fechaStr = fmtDate(inicio) + " — " + fmtDate(fin);

      return `
      <div class="etapa-card ${activa ? "etapa-destacada" : ""}" style="opacity:${pasada ? "0.6" : "1"}">
        <div class="etapa-numero" style="color:${escHtml(color)}">Etapa ${i + 1}</div>
        <div class="etapa-precio">$${precio.toLocaleString("es-MX")} MXN</div>
        <div class="etapa-unidad">por robot</div>
        <div class="etapa-fechas"><i class="fas fa-calendar"></i> ${fechaStr}</div>
        <div class="etapa-desc">${escHtml(s.name || "")}</div>
        <div class="etapa-estado ${activa ? "etapa-activa" : ""}">
          ${activa ? "● Etapa en curso" : pasada ? "Periodo cerrado" : "Próximamente"}
        </div>
      </div>`;
    }).join("");

    grid.innerHTML = html;

    // También actualizar el precio dinámico de robótica en hero-stats
    const priceMin = Math.min(...stages.map((s) => parseFloat(s.price_per_robot || 0)).filter(Boolean));
    if (priceMin && priceMin < Infinity) {
      setText("statPrecioRobotica", `$${priceMin.toLocaleString("es-MX")} MXN c/u`);
    }

    // Actualizar ETAPAS_ROBOTICA global
    try {
      window.ETAPAS_ROBOTICA = stages.map((s) => ({
        precio: parseFloat(s.price_per_robot || 0),
        inicio: new Date(s.start_date.replace(/-/g, "/")),
        fin: new Date(s.end_date.replace(/-/g, "/")),
      }));
      // Forzar recalculo
      if (typeof window.syncPackageControls === "function") {
        window.syncPackageControls();
      }
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  4. RENDERIZAR CONVOCATORIAS ADICIONALES (no congreso/robotica/campamento)
  // ─────────────────────────────────────────────────────────────────────────
  function renderizarConvocatoriasAdicionales(convocatorias) {
    const container = document.getElementById("convocatoriasAdicionalesContainer");
    if (!container) return;

    const adicionales = convocatorias.filter((c) => {
      const cod = (c.codigo || "").toLowerCase();
      return !STATIC_CODIGOS.includes(cod);
    });

    if (!adicionales.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = adicionales.map((conv, idx) => {
      const num = idx + 1;
      const color = conv.color || "#f2a900";
      const icon = conv.icon || "fas fa-bullhorn";
      const precio = formatPrecio(conv);
      const precioCorto = formatPrecioCorto(conv);
      const datesHtml = buildDatesHtml(conv);
      const talleres = conv.workshops || [];
      const conferencias = conv.conferences || [];

      const talleresHtml = buildTalleresHtml(talleres, conferencias, conv.id);
      const richContent = conv.rich_content
        ? `<div class="conv-rich-content" style="margin:20px 0; color:rgba(237,242,255,0.85); font-size:0.95rem; line-height:1.7;">${conv.rich_content}</div>`
        : "";

      const imagenHtml = conv.cover_image_url
        ? `<div class="conv-cover-image" style="border-radius:16px; overflow:hidden; margin-bottom:18px; max-height:320px;">
             <img src="${escHtml(conv.cover_image_url)}" alt="${escHtml(conv.titulo)}" style="width:100%;height:320px;object-fit:cover;">
           </div>`
        : "";

      const documentoHtml = conv.documento_url
        ? `<div style="margin:16px 0;">
             <a href="${escHtml(conv.documento_url)}" target="_blank" rel="noopener" class="btn-download" style="width:auto; display:inline-flex; gap:8px; align-items:center;">
               <i class="fas fa-file-pdf"></i> Ver documento oficial
             </a>
           </div>`
        : "";

      return `
      <section class="convocatoria-section conv-adicional-section" id="convocatoria-adicional-${conv.id}" style="--conv-color:${escHtml(color)};">
        <div class="conv-header">
          <div class="conv-badge-num" style="background:${escHtml(color)}; color:#fff;">${String(num).padStart(2, "0")}</div>
          <div class="conv-header-copy">
            <span class="section-eyebrow"><i class="${escHtml(icon)}"></i> ${escHtml(conv.conv_tipo || conv.titulo)}</span>
            <h2>${escHtml(conv.titulo)}</h2>
            ${conv.descripcion ? `<p>${escHtml(conv.descripcion)}</p>` : ""}
          </div>
          <div class="conv-price-block" style="border-color:${escHtml(color)}30;">
            <span class="conv-price-label">Precio</span>
            <strong class="conv-price" style="color:${escHtml(color)};">${precio}</strong>
            ${datesHtml ? `<span class="conv-price-note">${datesHtml}</span>` : ""}
          </div>
        </div>
        <div class="conv-body">
          ${imagenHtml}
          ${richContent}
          ${documentoHtml}
          ${talleresHtml}
          <div class="conv-cta-row">
            <div class="conv-cta-info">
              <i class="fas fa-circle-info"></i>
              <span>Inscríbete desde el trámite en línea. Precio: ${precioCorto}</span>
            </div>
            <button class="btn-primary-hero" style="background:${escHtml(color)};" onclick="window.location.href='tramite.html'">
              <i class="${escHtml(icon)}"></i> Inscribirme
            </button>
          </div>
        </div>
      </section>`;
    }).join("");
  }

  function buildTalleresHtml(talleres, conferencias, convId) {
    if (!talleres.length && !conferencias.length) return "";

    let html = `<div class="talleres-block">
      <div class="talleres-header">
        <div>
          <h3><i class="fas fa-chalkboard-user"></i> Programa incluido</h3>
          <p>Talleres y conferencias asociados a esta convocatoria. Se actualizan en tiempo real.</p>
        </div>
      </div>
      <div class="talleres-grid" id="talleresConv${convId}">`;

    talleres.forEach((t) => {
      const cover = t.cover_image_url
        ? (t.cover_image_url.startsWith("/uploads/") ? "/app" + t.cover_image_url : t.cover_image_url)
        : "/assets/images/electro.png";
      const lleno = parseInt(t.enrolled_count) >= parseInt(t.max_capacity);
      html += `
      <div class="taller-card" style="cursor:pointer; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.09);" onclick="typeof mostrarDetalleTaller==='function' && mostrarDetalleTaller(${t.id})">
        <div style="height:140px; position:relative;">
          <img src="${escHtml(cover)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/assets/images/electro.png'">
          ${lleno ? `<div style="position:absolute;top:10px;right:10px;background:#ef4444;color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;"><i class="fas fa-ban"></i> Lleno</div>` : ""}
        </div>
        <div style="padding:1rem; flex:1; display:flex; flex-direction:column;">
          <h4 style="color:#eef4ff;margin:0 0 6px;">${escHtml(t.name || "")}</h4>
          <p style="font-size:0.85rem;color:rgba(237,242,255,0.6);margin:0 0 auto;">${escHtml(t.instructor_name || "")}</p>
          <span style="font-size:0.8rem;color:#38bdf8;margin-top:10px;"><i class="fas fa-calendar-alt"></i> ${escHtml(t.schedule_date || "Fecha pendiente")}</span>
        </div>
      </div>`;
    });

    conferencias.forEach((c) => {
      const cover = c.cover_image_url
        ? (c.cover_image_url.startsWith("/uploads/") ? "/app" + c.cover_image_url : c.cover_image_url)
        : "/assets/images/electro.png";
      html += `
      <div class="taller-card" style="cursor:pointer; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; background:rgba(255,255,255,0.03); border:1px solid rgba(242,169,0,0.15);" onclick="typeof mostrarDetalleConferencia==='function' && mostrarDetalleConferencia(${c.id})">
        <div style="height:140px; position:relative;">
          <img src="${escHtml(cover)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/assets/images/electro.png'">
          <div style="position:absolute;top:10px;left:10px;background:rgba(242,169,0,0.85);color:#151205;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;">
            <i class="fas fa-microphone"></i> Conferencia
          </div>
        </div>
        <div style="padding:1rem; flex:1; display:flex; flex-direction:column;">
          <h4 style="color:#eef4ff;margin:0 0 6px;">${escHtml(c.name || "")}</h4>
          <p style="font-size:0.85rem;color:rgba(237,242,255,0.6);margin:0 0 auto;"><i class="fas fa-user"></i> ${escHtml(c.speaker_name || "")}</p>
          <span style="font-size:0.8rem;color:#f2a900;margin-top:10px;"><i class="fas fa-calendar-alt"></i> ${escHtml(c.conference_date || "Fecha por confirmar")}</span>
        </div>
      </div>`;
    });

    html += `</div></div>`;
    return html;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  5. ACTUALIZAR CTA FINAL con precios dinámicos
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarCTAFinal(convocatorias) {
    const pillsContainer = document.getElementById("ctaPackagePills");
    if (!pillsContainer) return;

    const pills = convocatorias
      .filter((c) => c.is_active)
      .map((conv) => {
        const icon = conv.icon || "fas fa-bullhorn";
        const precio = formatPrecioCorto(conv);
        return `
        <div class="cta-package-pill ${conv.codigo !== "congreso" ? "cta-pill-optional" : ""}">
          <i class="${escHtml(icon)}"></i>
          <span>${escHtml(conv.titulo)} ${precio}</span>
        </div>`;
      });

    if (pills.length) {
      pillsContainer.innerHTML = pills.join(`<span class="cta-plus">+</span>`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (typeof escapeHtml === "function") return escapeHtml(str);
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatPrecio(conv) {
    if (!conv) return "";
    if (conv.pricing_mode === "staged" && conv.price_stages && conv.price_stages.length) {
      const precios = conv.price_stages
        .map((s) => parseFloat(s.price || s.precio || 0))
        .filter((p) => p > 0);
      if (precios.length) {
        const min = Math.min(...precios);
        return `$${min.toLocaleString("es-MX")} <small>MXN desde</small>`;
      }
    }
    const p = parseFloat(conv.precio_base || 0);
    return p === 0
      ? "Gratis"
      : `$${p.toLocaleString("es-MX")} <small>MXN</small>`;
  }

  function formatPrecioCorto(conv) {
    if (!conv) return "";
    if (conv.pricing_mode === "staged" && conv.price_stages && conv.price_stages.length) {
      const precios = conv.price_stages
        .map((s) => parseFloat(s.price || s.precio || 0))
        .filter((p) => p > 0);
      if (precios.length) {
        return `$${Math.min(...precios).toLocaleString("es-MX")}+`;
      }
    }
    const p = parseFloat(conv.precio_base || 0);
    return p === 0 ? "Gratis" : `$${p.toLocaleString("es-MX")} MXN`;
  }

  function buildDatesHtml(conv) {
    const parts = [];
    if (conv.inscripcion_inicio)
      parts.push(`Inscripciones desde ${fmtDate(new Date(conv.inscripcion_inicio))}`);
    if (conv.inscripcion_fin)
      parts.push(`hasta ${fmtDate(new Date(conv.inscripcion_fin))}`);
    if (conv.evento_inicio)
      parts.push(`Evento: ${fmtDate(new Date(conv.evento_inicio))}`);
    return parts.join(" · ");
  }

  function setDates(containerId, conv) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const html = buildDatesHtml(conv);
    if (html) el.innerHTML = `<span class="conv-date-dynamic"><i class="fas fa-calendar-alt" style="color:var(--accent)"></i> ${html}</span>`;
  }

  function fmtDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return "";
    return d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarConfiguracionDinamica);
  } else {
    cargarConfiguracionDinamica();
  }

  // Exponer para recarga manual si se necesita
  window.cargarConfiguracionDinamica = cargarConfiguracionDinamica;
})();
