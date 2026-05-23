(function () {
  "use strict";

  // Códigos con sección estática en usuario.html — solo se actualizan sus IDs
  const STATIC_CODIGOS = ["congreso", "robotica", "campamento"];

  // Cache del fetch
  let _publicData = null;

  async function fetchPublicData() {
    if (_publicData) return _publicData;
    const res = await fetch("/app/api/public-convocatorias.php", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
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
      console.warn(
        "[usuario-convocatorias] Error al cargar config dinámica:",
        err,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  1. APLICAR SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  function aplicarSettings(settings) {
    // Hero title (texto plano — puede tener el nombre del evento)
    if (settings.landing_hero_title) {
      const el = document.getElementById("dynamicHeroTitle");
      // Preservar el <span id="userName"> que está dentro del h1
      if (el) {
        const userSpan = el.querySelector("#userName");
        const userName = userSpan ? userSpan.textContent : "";
        el.textContent = settings.landing_hero_title;
        // Re-insertar el span del usuario si existía
        if (userSpan && userName) {
          const newSpan = document.createElement("span");
          newSpan.id = "userName";
          newSpan.textContent = userName;
          el.appendChild(document.createTextNode(", "));
          el.insertBefore(newSpan, el.firstChild.nextSibling || null);
        }
      }
    }

    // Hero lead — texto plano
    if (settings.landing_hero_lead) {
      setPlainText("dynamicHeroLead", settings.landing_hero_lead);
    }

    // Pills del hero
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

    // Countdown regresivo
    if (settings.landing_event_date) {
      const eventDate = new Date(
        settings.landing_event_date.replace(/-/g, "/"),
      );
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

    if (label) {
      label.textContent =
        "El evento inicia el " +
        eventDate.toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
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
          ? `<div style="color:#f87171;font-weight:700;font-size:1.4rem;padding:14px;">¡El evento ha finalizado!</div>`
          : `<div style="color:#34d399;font-weight:700;font-size:1.4rem;padding:14px;">¡El evento está en curso!</div>`;
        return;
      }
      if (els.d)
        els.d.textContent = String(Math.floor(dist / 86400000)).padStart(
          2,
          "0",
        );
      if (els.h)
        els.h.textContent = String(
          Math.floor((dist % 86400000) / 3600000),
        ).padStart(2, "0");
      if (els.m)
        els.m.textContent = String(
          Math.floor((dist % 3600000) / 60000),
        ).padStart(2, "0");
      if (els.s)
        els.s.textContent = String(Math.floor((dist % 60000) / 1000)).padStart(
          2,
          "0",
        );
    };

    tick();
    const interval = setInterval(tick, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  2. SECCIONES ESTÁTICAS (congreso / robotica / campamento)
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarConvocatoriasEstaticas(convocatorias) {
    for (const conv of convocatorias) {
      const codigo = (conv.codigo || "").toLowerCase();
      if (codigo === "congreso") actualizarSeccionCongreso(conv);
      else if (codigo === "robotica") actualizarSeccionRobotica(conv);
      else if (codigo === "campamento") actualizarSeccionCampamento(conv);
    }
  }

  function actualizarSeccionCongreso(conv) {
    // Título y descripción: texto plano (no confiar en HTML del admin aquí)
    setPlainText("congresoTitulo", conv.titulo);
    setPlainText("congresoDescripcion", conv.descripcion);

    // Precio: HTML seguro (solo contiene <small> generado por nosotros)
    setHtml("congresoPrecio", formatPrecioHtml(conv));

    // Badge y stats
    setPlainText(
      "talleresIncludesBadge",
      `Incluidos en ${formatPrecioCorto(conv)}`,
    );
    setPlainText("statPrecioCongreso", formatPrecioCorto(conv));

    // Fechas
    setDates("congresoDates", conv);

    // Precio global para el wizard
    if (conv.precio_base) {
      window.PRECIO_CONGRESO = parseFloat(conv.precio_base);
    }
  }

  function actualizarSeccionRobotica(conv) {
    setPlainText("roboticaTitulo", conv.titulo);
    setPlainText("roboticaDescripcion", conv.descripcion);
    setDates("roboticaDates", conv);
  }

  function actualizarSeccionCampamento(conv) {
    setPlainText("campamentoTitulo", conv.titulo);
    setPlainText("campamentoDescripcion", conv.descripcion);
    setHtml("campamentoPrecio", formatPrecioHtml(conv));
    setPlainText("statPrecioCampamento", formatPrecioCorto(conv));
    setDates("campamentoDates", conv);

    if (conv.precio_base) {
      window.PRECIO_CAMPAMENTO = parseFloat(conv.precio_base);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  3. ETAPAS DE ROBÓTICA
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarEtapasRobotica(stages) {
    if (!stages || !stages.length) return;

    const grid = document.getElementById("etapasGridDynamic");
    if (!grid) return;

    const now = new Date();

    grid.innerHTML = stages
      .map((s, i) => {
        const inicio = new Date((s.start_date || "").replace(/-/g, "/"));
        const fin = new Date((s.end_date || "").replace(/-/g, "/"));
        const activa = now >= inicio && now <= fin;
        const pasada = now > fin;
        const precio = parseFloat(s.price_per_robot || 0);
        const color = escHtml(s.color || "#f2a900");
        const fechas = fmtDate(inicio) + " — " + fmtDate(fin);

        return `
        <div class="etapa-card ${activa ? "etapa-destacada" : ""}"
             style="opacity:${pasada ? "0.55" : "1"}">
          <div class="etapa-numero" style="color:${color}">Etapa ${i + 1}</div>
          <div class="etapa-precio">$${precio.toLocaleString("es-MX")} MXN</div>
          <div class="etapa-unidad">por robot</div>
          <div class="etapa-fechas">
            <i class="fas fa-calendar"></i> ${fechas}
          </div>
          <div class="etapa-desc">${escHtml(s.name || "")}</div>
          <div class="etapa-estado ${activa ? "etapa-activa" : ""}">
            ${activa ? "● Etapa en curso" : pasada ? "Periodo cerrado" : "Próximamente"}
          </div>
        </div>`;
      })
      .join("");

    // Precio mínimo en hero-stats
    const precios = stages
      .map((s) => parseFloat(s.price_per_robot || 0))
      .filter((p) => p > 0);
    if (precios.length) {
      setPlainText(
        "statPrecioRobotica",
        `$${Math.min(...precios).toLocaleString("es-MX")} MXN c/u`,
      );
    }

    // Exponer etapas al wizard
    try {
      window.ETAPAS_ROBOTICA = stages.map((s) => ({
        precio: parseFloat(s.price_per_robot || 0),
        inicio: new Date((s.start_date || "").replace(/-/g, "/")),
        fin: new Date((s.end_date || "").replace(/-/g, "/")),
      }));
      if (typeof window.syncPackageControls === "function") {
        window.syncPackageControls();
      }
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  4. CONVOCATORIAS ADICIONALES (cualquier código fuera de los 3 fijos)
  // ─────────────────────────────────────────────────────────────────────────
  function renderizarConvocatoriasAdicionales(convocatorias) {
    const container = document.getElementById(
      "convocatoriasAdicionalesContainer",
    );
    if (!container) return;

    const adicionales = convocatorias.filter(
      (c) => !STATIC_CODIGOS.includes((c.codigo || "").toLowerCase()),
    );

    if (!adicionales.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = adicionales
      .map((conv, idx) => {
        const color = escHtml(conv.color || "#f2a900");
        const icon = escHtml(conv.icon || "fas fa-bullhorn");
        const precioHtml = formatPrecioHtml(conv);
        const precioCorto = formatPrecioCorto(conv);
        const datesStr = buildDatesStr(conv);

        const imagenHtml = conv.cover_image_url
          ? `<div style="border-radius:14px;overflow:hidden;margin-bottom:18px;max-height:300px;">
               <img src="${escHtml(conv.cover_image_url)}"
                    alt="${escHtml(conv.titulo)}"
                    style="width:100%;height:300px;object-fit:cover;"
                    onerror="this.parentElement.remove()">
             </div>`
          : "";

        // rich_content: se limpia el <style> de Quill y se inyecta como HTML
        const richHtml = buildRichContent(conv.rich_content);

        const docHtml = conv.documento_url
          ? `<div style="margin:14px 0;">
               <a href="${escHtml(conv.documento_url)}" target="_blank" rel="noopener"
                  class="btn-download" style="width:auto;display:inline-flex;gap:8px;align-items:center;">
                 <i class="fas fa-file-pdf"></i> Ver documento oficial
               </a>
             </div>`
          : "";

        const talleresHtml = buildTalleresHtml(
          conv.workshops || [],
          conv.conferences || [],
          conv.id,
        );

        return `
        <section class="convocatoria-section conv-adicional-section"
                 id="convocatoria-adicional-${conv.id}">
          <div class="conv-header">
            <div class="conv-badge-num" style="background:${color};color:#fff;">
              ${String(idx + 4).padStart(2, "0")}
            </div>
            <div class="conv-header-copy">
              <span class="section-eyebrow">
                <i class="${icon}"></i> ${escHtml(conv.conv_tipo || "Convocatoria adicional")}
              </span>
              <h2>${escHtml(conv.titulo)}</h2>
              ${conv.descripcion ? `<p>${escHtml(conv.descripcion)}</p>` : ""}
            </div>
            <div class="conv-price-block"
                 style="border-color:${color.replace(")", ",0.3)").replace("rgb", "rgba")};">
              <span class="conv-price-label">Precio</span>
              <strong class="conv-price" style="color:${color};">${precioHtml}</strong>
              ${datesStr ? `<span class="conv-price-note">${escHtml(datesStr)}</span>` : ""}
            </div>
          </div>
          <div class="conv-body">
            ${imagenHtml}
            ${richHtml}
            ${docHtml}
            ${talleresHtml}
            <div class="conv-cta-row">
              <div class="conv-cta-info">
                <i class="fas fa-circle-info"></i>
                <span>Precio: ${escHtml(precioCorto)}. Inscríbete desde el trámite en línea.</span>
              </div>
              <button class="btn-primary-hero"
                      style="background:${color};"
                      onclick="window.location.href='tramite.html'">
                <i class="${icon}"></i> Inscribirme
              </button>
            </div>
          </div>
        </section>`;
      })
      .join("");
  }

  /**
   * Limpia el <style> de Quill y el wrapper .ql-editor del rich_content
   * antes de inyectarlo como innerHTML.
   * El contenido viene del admin y puede tener bloques <style>...</style>
   * con CSS de Quill que no deben mostrarse visualmente.
   */
  function buildRichContent(raw) {
    if (!raw || !raw.trim()) return "";

    // 1. Quitar bloques <style>...</style> completos
    let clean = raw.replace(/<style[\s\S]*?<\/style>/gi, "");

    // 2. Quitar el wrapper .ql-editor si el admin lo guardó con él
    clean = clean.replace(
      /<div[^>]*class="[^"]*ql-editor[^"]*"[^>]*>/gi,
      "<div>",
    );

    // 3. Trim resultado
    clean = clean.trim();

    if (!clean) return "";

    return `
    <div class="conv-rich-content ql-editor-display"
         style="margin:18px 0;color:rgba(237,242,255,0.88);font-size:0.95rem;line-height:1.75;">
      ${clean}
    </div>`;
  }

  function buildTalleresHtml(talleres, conferencias, convId) {
    if (!talleres.length && !conferencias.length) return "";

    const cards = [
      ...talleres.map((t) => {
        const cover = resolveImgUrl(
          t.cover_image_url,
          "/assets/images/electro.png",
        );
        const lleno =
          parseInt(t.enrolled_count || 0) >= parseInt(t.max_capacity || 999);
        return `
        <div class="taller-card"
             style="cursor:pointer;border-radius:12px;overflow:hidden;
                    display:flex;flex-direction:column;
                    background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.09);"
             onclick="typeof mostrarDetalleTaller==='function'&&mostrarDetalleTaller(${t.id})">
          <div style="height:140px;position:relative;">
            <img src="${escHtml(cover)}" style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.src='/assets/images/electro.png'">
            ${
              lleno
                ? `<div style="position:absolute;top:8px;right:8px;background:#ef4444;
                        color:#fff;font-size:11px;padding:3px 9px;border-radius:20px;">
                        <i class="fas fa-ban"></i> Lleno</div>`
                : ""
            }
          </div>
          <div style="padding:1rem;flex:1;display:flex;flex-direction:column;">
            <h4 style="color:#eef4ff;margin:0 0 5px;font-size:0.95rem;">${escHtml(t.name || "")}</h4>
            <p style="font-size:0.82rem;color:rgba(237,242,255,0.6);margin:0 0 auto;">
              ${t.instructor_name ? `<i class="fas fa-user" style="color:#f59e0b"></i> ${escHtml(t.instructor_name)}` : ""}
            </p>
            <span style="font-size:0.78rem;color:#38bdf8;margin-top:9px;">
              <i class="fas fa-calendar-alt"></i> ${escHtml(t.schedule_date || "Fecha pendiente")}
            </span>
          </div>
        </div>`;
      }),

      ...conferencias.map((c) => {
        const cover = resolveImgUrl(
          c.cover_image_url,
          "/assets/images/electro.png",
        );
        return `
        <div class="taller-card"
             style="cursor:pointer;border-radius:12px;overflow:hidden;
                    display:flex;flex-direction:column;
                    background:rgba(255,255,255,0.03);
                    border:1px solid rgba(242,169,0,0.15);"
             onclick="typeof mostrarDetalleConferencia==='function'&&mostrarDetalleConferencia(${c.id})">
          <div style="height:140px;position:relative;">
            <img src="${escHtml(cover)}" style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.src='/assets/images/electro.png'">
            <div style="position:absolute;top:8px;left:8px;background:rgba(242,169,0,0.88);
                        color:#151205;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:700;">
              <i class="fas fa-microphone"></i> Conferencia
            </div>
          </div>
          <div style="padding:1rem;flex:1;display:flex;flex-direction:column;">
            <h4 style="color:#eef4ff;margin:0 0 5px;font-size:0.95rem;">${escHtml(c.name || "")}</h4>
            <p style="font-size:0.82rem;color:rgba(237,242,255,0.6);margin:0 0 auto;">
              ${c.speaker_name ? `<i class="fas fa-user" style="color:#f59e0b"></i> ${escHtml(c.speaker_name)}` : ""}
            </p>
            <span style="font-size:0.78rem;color:#f2a900;margin-top:9px;">
              <i class="fas fa-calendar-alt"></i> ${escHtml(c.conference_date || "Fecha por confirmar")}
            </span>
          </div>
        </div>`;
      }),
    ].join("");

    return `
    <div class="talleres-block">
      <div class="talleres-header">
        <div>
          <h3><i class="fas fa-chalkboard-user"></i> Programa incluido</h3>
          <p>Talleres y conferencias de esta convocatoria. Se actualizan en tiempo real.</p>
        </div>
      </div>
      <div class="talleres-grid" id="talleresConv${convId}">
        ${cards}
      </div>
    </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  5. CTA FINAL — pills dinámicas
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarCTAFinal(convocatorias) {
    const container = document.getElementById("ctaPackagePills");
    if (!container) return;

    const activas = convocatorias.filter((c) => c.is_active);
    if (!activas.length) return;

    container.innerHTML = activas
      .map((conv, i) => {
        const icon = escHtml(conv.icon || "fas fa-bullhorn");
        const titulo = escHtml(conv.titulo || "");
        const precio = escHtml(formatPrecioCorto(conv));
        const optional =
          (conv.codigo || "").toLowerCase() !== "congreso"
            ? " cta-pill-optional"
            : "";
        const sep =
          i < activas.length - 1 ? `<span class="cta-plus">+</span>` : "";
        return `
        <div class="cta-package-pill${optional}">
          <i class="${icon}"></i>
          <span>${titulo} ${precio}</span>
        </div>${sep}`;
      })
      .join("");
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Escapa HTML — usa escapeHtml de usuario.js si existe */
  function escHtml(str) {
    if (typeof escapeHtml === "function") return escapeHtml(str);
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Texto plano — nunca renderiza HTML */
  function setPlainText(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /** HTML seguro — solo para contenido generado por nosotros (precios con <small>) */
  function setHtml(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  /** Precio con <small> para unidad — HTML seguro generado internamente */
  function formatPrecioHtml(conv) {
    if (!conv) return "";
    if (
      conv.pricing_mode === "staged" &&
      conv.price_stages &&
      conv.price_stages.length
    ) {
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

  /** Precio como texto sin HTML — para textContent y badges */
  function formatPrecioCorto(conv) {
    if (!conv) return "";
    if (
      conv.pricing_mode === "staged" &&
      conv.price_stages &&
      conv.price_stages.length
    ) {
      const precios = conv.price_stages
        .map((s) => parseFloat(s.price || s.precio || 0))
        .filter((p) => p > 0);
      if (precios.length) {
        return `$${Math.min(...precios).toLocaleString("es-MX")}+ MXN`;
      }
    }
    const p = parseFloat(conv.precio_base || 0);
    return p === 0 ? "Gratis" : `$${p.toLocaleString("es-MX")} MXN`;
  }

  /** Construye el string de fechas (texto plano) */
  function buildDatesStr(conv) {
    const parts = [];
    if (conv.inscripcion_inicio)
      parts.push(
        `Inscripciones desde ${fmtDate(new Date((conv.inscripcion_inicio || "").replace(/-/g, "/")))} `,
      );
    if (conv.inscripcion_fin)
      parts.push(
        `hasta ${fmtDate(new Date((conv.inscripcion_fin || "").replace(/-/g, "/")))}`,
      );
    if (conv.evento_inicio)
      parts.push(
        `· Evento: ${fmtDate(new Date((conv.evento_inicio || "").replace(/-/g, "/")))}`,
      );
    return parts.join(" ");
  }

  /** Inyecta fechas como HTML en el div de fechas de cada sección */
  function setDates(containerId, conv) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const str = buildDatesStr(conv);
    if (!str) return;
    el.innerHTML = `<span class="conv-date-dynamic">
      <i class="fas fa-calendar-alt" style="color:var(--accent,#f2a900)"></i>
      ${escHtml(str)}
    </span>`;
  }

  function fmtDate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function resolveImgUrl(url, fallback) {
    if (!url) return fallback;
    if (url.startsWith("/uploads/")) return "/app" + url;
    return url;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarConfiguracionDinamica);
  } else {
    cargarConfiguracionDinamica();
  }

  // Exponer para recarga manual
  window.cargarConfiguracionDinamica = cargarConfiguracionDinamica;
})();
