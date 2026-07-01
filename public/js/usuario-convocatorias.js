(function () {
  "use strict";

  const STATIC_CODIGOS = ["congreso", "robotica", "campamento"];
  const ORGANIZER_UNSPECIFIED = "Sin especificar por el organizador";

  let _publicData = null;

  function capitalizeFirst(text) {
    const value = String(text || "");
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  function parsePlainDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatLongDate(value, fallback = ORGANIZER_UNSPECIFIED) {
    const date = parsePlainDate(value);
    if (!date) return fallback;
    const month = capitalizeFirst(
      date.toLocaleDateString("es-MX", { month: "long" }),
    );
    return `${date.getDate()} de ${month} del ${date.getFullYear()}`;
  }

  function formatDisplayTime(value, fallback = ORGANIZER_UNSPECIFIED) {
    if (!value) return fallback;
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return String(value);
    let hour = Number(match[1]);
    const suffix = hour >= 12 ? "p.m." : "a.m.";
    hour = hour % 12 || 12;
    return `${hour}:${match[2]} ${suffix}`;
  }

  async function fetchPublicData() {
    if (_publicData) return _publicData;
    const res = await fetch("/app/api/public-convocatorias.php", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Error al cargar datos");
    _publicData = json.data;
    return _publicData;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  ENTRADA PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────
  async function cargarConfiguracionDinamica() {
    try {
      const data = await fetchPublicData();
      const { convocatorias = [], settings = {}, stages = [] } = data;

      aplicarSettings(settings, convocatorias);
      actualizarVisibilidadConvocatorias(convocatorias);
      actualizarConvocatoriasEstaticas(convocatorias);
      actualizarEtapasRobotica(stages);
      renderizarConvocatoriasAdicionales(convocatorias);
      actualizarCTAFinal(convocatorias);
    } catch (err) {
      console.warn("[usuario-convocatorias] Error:", err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  1. SETTINGS: hero, feature band, countdown
  // ─────────────────────────────────────────────────────────────────────────
  function aplicarSettings(settings, convocatorias = []) {
    // ── Hero title (preserva el span #userName dentro del h1) ──────────────
    if (settings.landing_hero_title && settings.landing_hero_title.trim()) {
      const h1 = document.getElementById("dynamicHeroTitle");
      if (h1) {
        const userSpan = h1.querySelector("#userName");
        const savedName = userSpan ? userSpan.textContent : "";
        h1.textContent = settings.landing_hero_title;
        if (savedName) {
          const comma = document.createTextNode(", ");
          const span = document.createElement("span");
          span.id = "userName";
          span.textContent = savedName;
          h1.appendChild(comma);
          h1.appendChild(span);
        }
      }
    }

    // ── Hero lead ─────────────────────────────────────────────────────────
    if (settings.landing_hero_lead && settings.landing_hero_lead.trim()) {
      setPlainText("dynamicHeroLead", settings.landing_hero_lead);
    }

    // ── Hero pills ────────────────────────────────────────────────────────
    if (settings.landing_hero_pills && settings.landing_hero_pills.trim()) {
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

    if (Array.isArray(convocatorias) && convocatorias.length) {
      const container = document.getElementById("dynamicHeroPills");
      if (container) {
        const visibles = convocatorias.filter((c) => c.is_active);
        if (visibles.length) {
          container.innerHTML = visibles
            .slice(0, 3)
            .map(
              (c) =>
                `<span class="mini-pill-tag"><i class="${escHtml(c.icon || "fas fa-bullhorn")}"></i> ${escHtml(c.titulo || c.conv_tipo || "Convocatoria")}</span>`,
            )
            .join("");
        }
      }

      const featureBand = document.getElementById("dynamicFeatureBandUser");
      if (featureBand) {
        const activeCount = convocatorias.filter((c) => c.is_active).length;
        const activeTitles = convocatorias
          .filter((c) => c.is_active)
          .map((c) => c.titulo)
          .filter(Boolean);
        const firstCardTitle = featureBand.querySelector("article strong");
        const firstCardDesc = featureBand.querySelector("article span");
        if (firstCardTitle) {
          firstCardTitle.textContent = `${activeCount} Convocatoria${activeCount === 1 ? "" : "s"}`;
        }
        if (firstCardDesc && activeTitles.length) {
          firstCardDesc.textContent = activeTitles.slice(0, 3).join(", ");
        }
      }
    }

    // ── Feature band — solo reemplaza si admin configuró tarjetas ─────────
    // Si no hay datos, el HTML estático del fallback permanece visible
    if (settings.landing_feature_band && settings.landing_feature_band.trim()) {
      try {
        const tarjetas = JSON.parse(settings.landing_feature_band);
        const container = document.getElementById("dynamicFeatureBandUser");
        if (container && Array.isArray(tarjetas) && tarjetas.length) {
          // Mismo patrón que index.html: limpiar y reinsertar
          container.innerHTML = "";
          tarjetas.forEach((t) => {
            const article = document.createElement("article");
            article.innerHTML = `
              <i class="${escHtml(t.icon || "fas fa-star")} feature-icon"></i>
              <div>
                <strong>${escHtml(t.title || "")}</strong>
                <span>${escHtml(t.desc || "")}</span>
              </div>`;
            container.appendChild(article);
          });
        }
      } catch (e) {
        console.warn(
          "[usuario-convocatorias] feature_band JSON inválido:",
          e.message,
        );
      }
    }
    // Si landing_feature_band está vacío → el fallback estático del HTML queda intacto ✓

    // ── Countdown regresivo — igual que index.html ─────────────────────────
    if (settings.landing_event_date && settings.landing_event_date.trim()) {
      const eventDate = new Date(
        settings.landing_event_date.replace(/-/g, "/"),
      );
      if (!isNaN(eventDate.getTime())) {
        const endDateStr = settings.landing_event_end_date || "";
        const endDate = endDateStr.trim()
          ? new Date(endDateStr.replace(/-/g, "/"))
          : null;
        iniciarCountdown(eventDate, endDate, settings);
      }
    }

    // ── PDF Croquis / Horarios del torneo ─────────────────────────────────
    renderDocBloque({
      containerId: "roboticaDocBlock",
      pdfUrl: settings.general_schedule_pdf || null,
      titulo: "Croquis y Horarios del Torneo",
      descripcion:
        "Consulta la distribución de áreas, horarios de ronda y puntos de acceso.",
      iframeTitle: "Croquis y horarios del torneo",
      accentColor: "rgba(56, 189, 248, 0.25)",
    });

    // ── PDF Guía del Campamento ────────────────────────────────────────────
    renderDocBloque({
      containerId: "campamentoDocBlock",
      pdfUrl: settings.camp_guide_pdf || null,
      titulo: "Guía PDF del Campamento",
      descripcion:
        "Revisa horarios, logística, recomendaciones y organización del campamento.",
      iframeTitle: "Guía del campamento",
      accentColor: "rgba(34, 197, 94, 0.25)",
    });
  }

  // ── Countdown — lógica idéntica a index.html ──────────────────────────────
  function iniciarCountdown(eventDate, endDate, settings) {
    const section = document.getElementById("dynamicCountdownSection");
    const labelEl = document.getElementById("dynamicCountdownLabel");
    const timerEl = document.getElementById("dynamicCountdownTimer");
    if (!section || !timerEl) return;

    // Mostrar la sección (oculta por defecto)
    section.style.display = "flex";

    // Fecha legible
    if (labelEl) {
      labelEl.textContent =
        "El evento inicia el " +
        eventDate.toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    }

    const cdDays = document.getElementById("cdUserDays");
    const cdHours = document.getElementById("cdUserHours");
    const cdMins = document.getElementById("cdUserMins");
    const cdSecs = document.getElementById("cdUserSecs");

    const tick = () => {
      const now = new Date().getTime();
      const distance = eventDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);

        // Verificar si ya pasó también la fecha fin
        let hasEnded = false;
        if (endDate && !isNaN(endDate.getTime()) && now > endDate.getTime()) {
          hasEnded = true;
        }

        timerEl.innerHTML = hasEnded
          ? `<div style="color:#f87171;font-weight:bold;font-size:1.5rem;padding:15px;">¡El evento ha finalizado!</div>`
          : `<div style="color:#34d399;font-weight:bold;font-size:1.5rem;padding:15px;">¡El evento está en curso!</div>`;
        return;
      }

      if (cdDays)
        cdDays.textContent = String(Math.floor(distance / 86400000)).padStart(
          2,
          "0",
        );
      if (cdHours)
        cdHours.textContent = String(
          Math.floor((distance % 86400000) / 3600000),
        ).padStart(2, "0");
      if (cdMins)
        cdMins.textContent = String(
          Math.floor((distance % 3600000) / 60000),
        ).padStart(2, "0");
      if (cdSecs)
        cdSecs.textContent = String(
          Math.floor((distance % 60000) / 1000),
        ).padStart(2, "0");
    };

    tick();
    const interval = setInterval(tick, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  2. CONVOCATORIAS ESTÁTICAS (congreso / robotica / campamento)
  // ─────────────────────────────────────────────────────────────────────────
  function actualizarConvocatoriasEstaticas(convocatorias) {
    for (const conv of convocatorias) {
      const cod = (conv.codigo || "").toLowerCase();
      if (cod === "congreso") actualizarCongreso(conv);
      else if (cod === "robotica") actualizarRobotica(conv);
      else if (cod === "campamento") actualizarCampamento(conv);
    }
  }

  function actualizarVisibilidadConvocatorias(convocatorias) {
    const activeCodes = new Set(
      convocatorias
        .filter((c) => c.is_active)
        .map((c) => String(c.codigo || "").toLowerCase()),
    );

    const sectionMap = {
      congreso: "convocatoria-congreso",
      robotica: "convocatoria-robotica",
      campamento: "convocatoria-campamento",
    };

    Object.entries(sectionMap).forEach(([code, sectionId]) => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = activeCodes.has(code) ? "" : "none";
      }
    });

    const staticAnchors = [
      ["congreso", 'a[href="#convocatoria-congreso"]'],
      ["robotica", 'a[href="#convocatoria-robotica"]'],
      ["campamento", 'a[href="#convocatoria-campamento"]'],
    ];

    staticAnchors.forEach(([code, selector]) => {
      const visible = activeCodes.has(code);
      document.querySelectorAll(selector).forEach((node) => {
        node.style.display = visible ? "" : "none";
      });
    });

    const visibleCount = convocatorias.filter((c) => c.is_active).length;
    const statConv = document.querySelector(".feature-band article strong");
    if (statConv) {
      statConv.textContent = `${visibleCount} Convocatoria${visibleCount === 1 ? "" : "s"}`;
    }
  }

  function actualizarCongreso(conv) {
    setPlainText("congresoTitulo", conv.titulo);
    setHtml(
      "congresoDescripcion",
      buildConvBodyHtml(conv, conv.descripcion, true),
    );
    setHtml("congresoPrecio", formatPrecioHtml(conv));
    setPlainText("congresoPrecioNota", "Acceso completo al congreso");
    setPlainText(
      "talleresIncludesBadge",
      `Incluidos en ${formatPrecioCorto(conv)}`,
    );
    setPlainText("statPrecioCongreso", formatPrecioCorto(conv));
    setDates("congresoDates", conv);
    if (conv.precio_base) window.PRECIO_CONGRESO = parseFloat(conv.precio_base);
  }

  function actualizarRobotica(conv) {
    setPlainText("roboticaTitulo", conv.titulo);
    setHtml(
      "roboticaDescripcion",
      buildConvBodyHtml(conv, conv.descripcion, true),
    );
    setHtml("roboticaPrecio", formatPrecioHtml(conv));
    setPlainText("roboticaPrecioNota", "Varía según etapa de inscripción");
    setDates("roboticaDates", conv);
  }

  function actualizarCampamento(conv) {
    setPlainText("campamentoTitulo", conv.titulo);
    setHtml(
      "campamentoDescripcion",
      buildConvBodyHtml(conv, conv.descripcion, true),
    );
    setHtml("campamentoPrecio", formatPrecioHtml(conv));
    setPlainText("campamentoPrecioNota", "Costo adicional al congreso");
    setPlainText("statPrecioCampamento", formatPrecioCorto(conv));
    setDates("campamentoDates", conv);
    if (conv.precio_base)
      window.PRECIO_CAMPAMENTO = parseFloat(conv.precio_base);

    // Tarjetas de "qué incluye" → desde rich_content si existe, si no aviso limpio
    const grid = document.getElementById("campamentoIncludesGrid");
    if (grid) {
      const rich = buildRichContent(conv.rich_content || conv.descripcion);
      if (rich) {
        grid.innerHTML = `<div class="conv-include-item campamento-item" style="grid-column:1/-1;display:block">${rich}</div>`;
      } else {
        grid.innerHTML = `<div class="conv-include-item campamento-item" style="grid-column:1/-1">
          <div class="conv-include-icon campamento-icon"><i class="fas fa-campground"></i></div>
          <div><p style="color:var(--text-mute)">El organizador aún no ha publicado el contenido detallado del campamento.</p></div>
        </div>`;
      }
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

        return `
        <div class="etapa-card${activa ? " etapa-destacada" : ""}"
             style="opacity:${pasada ? "0.55" : "1"}">
          <div class="etapa-numero" style="color:${color}">Etapa ${i + 1}</div>
          <div class="etapa-precio">$${precio.toLocaleString("es-MX")} MXN</div>
          <div class="etapa-unidad">por robot</div>
          <div class="etapa-fechas">
            <i class="fas fa-calendar"></i>
            ${fmtDate(inicio)} — ${fmtDate(fin)}
          </div>
          <div class="etapa-desc">${escHtml(s.name || "")}</div>
          <div class="etapa-estado${activa ? " etapa-activa" : ""}">
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

    // Exponer al wizard
    try {
      window.ETAPAS_ROBOTICA = stages.map((s) => ({
        precio: parseFloat(s.price_per_robot || 0),
        inicio: new Date((s.start_date || "").replace(/-/g, "/")),
        fin: new Date((s.end_date || "").replace(/-/g, "/")),
      }));
      if (typeof window.syncPackageControls === "function")
        window.syncPackageControls();
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  4. CONVOCATORIAS ADICIONALES
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
          ? `<div style="border-radius:14px;overflow:hidden;margin-bottom:18px;">
               <img src="${escHtml(conv.cover_image_url)}"
                    alt="${escHtml(conv.titulo)}"
                    style="width:100%;max-height:300px;object-fit:cover;"
                    onerror="this.parentElement.remove()">
             </div>`
          : "";

        const richHtml = buildRichContent(
          conv.rich_content || conv.descripcion,
        );
        const programHtml = buildProgramSection(conv);
        const categoriesHtml = buildCategoriesSection(conv);

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
            </div>
            <div class="conv-price-block">
              <span class="conv-price-label">Precio</span>
              <strong class="conv-price" style="color:${color};">${precioHtml}</strong>
              ${datesStr ? `<span class="conv-price-note">${escHtml(datesStr)}</span>` : ""}
            </div>
          </div>
          <div class="conv-body">
            ${imagenHtml}
            ${richHtml}
            ${programHtml}
            ${categoriesHtml}
            ${docHtml}
            <div class="conv-cta-row">
              <div class="conv-cta-info">
                <i class="fas fa-circle-info"></i>
                <span>Precio: ${escHtml(precioCorto)}. Inscríbete desde el trámite en línea.</span>
              </div>
              <button class="btn-primary-hero" style="background:${color};"
                      onclick="window.location.href='tramite.html'">
                <i class="${icon}"></i> Inscribirme
              </button>
            </div>
          </div>
        </section>`;
      })
      .join("");
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
        const optional =
          (conv.codigo || "").toLowerCase() !== "congreso"
            ? " cta-pill-optional"
            : "";
        const sep =
          i < activas.length - 1 ? `<span class="cta-plus">+</span>` : "";
        return `<div class="cta-package-pill${optional}">
          <i class="${icon}"></i>
          <span>${escHtml(conv.titulo)} ${escHtml(formatPrecioCorto(conv))}</span>
        </div>${sep}`;
      })
      .join("");
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  function buildConvBodyHtml(conv, raw, includeProgram) {
    const richHtml = buildRichContent(raw || "");
    const scheduleHtml = buildScheduleSection(conv);
    const programHtml = includeProgram ? buildProgramSection(conv) : "";
    const categoriesHtml = buildCategoriesSection(conv);
    return `${richHtml}${scheduleHtml}${programHtml}${categoriesHtml}`;
  }

  function buildRichContent(raw) {
    const clean = sanitizeRichHtml(raw);
    if (!clean) return "";
    return `<div class="conv-rich-content ql-editor-display" style="margin:18px 0;color:rgba(237,242,255,0.88);font-size:0.95rem;line-height:1.75;">${clean}</div>`;
  }

  function sanitizeRichHtml(raw) {
    if (!raw) return "";
    let clean = String(raw).trim();
    if (!clean) return "";
    const host = document.createElement("div");
    host.innerHTML = clean;
    host.querySelectorAll("script,style").forEach((node) => node.remove());
    host.querySelectorAll(".ql-editor-display").forEach((node) => {
      node.removeAttribute("style");
      node.classList.remove("ql-editor-display");
    });
    return host.innerHTML.trim();
  }

  function buildProgramSection(conv) {
    const items = collectProgramItems(conv);
    if (!items.length) return "";

    return `
      <div class="conv-program-section">
        <div class="conv-program-head">
          <div>
            <span class="conv-program-kicker"><i class="fas fa-chalkboard-user"></i> Programa incluido</span>
            <h3>Actividades, talleres y conferencias</h3>
            <p>Contenido asociado a esta convocatoria, con horarios y responsables cuando están configurados.</p>
          </div>
        </div>
        <div class="conv-program-grid">
          ${items.map((item) => renderProgramCard(item)).join("")}
        </div>
      </div>`;
  }

  function buildCategoriesSection(conv) {
    const cats = parseCategories(conv?.categories_json);
    if (!cats.length) return "";

    return `
      <div class="conv-categories-section">
        <h3 class="conv-categories-title"><i class="fas fa-layer-group"></i> Categorías</h3>
        <div class="conv-categories-grid">
          ${cats.map((cat) => renderCategoryCard(cat)).join("")}
        </div>
      </div>`;
  }

  function buildScheduleSection(conv) {
    const chips = [];
    const formatRange = (start, end) => {
      if (!start && !end) return "";
      const parts = [];
      if (start) parts.push(`Desde ${formatDateHuman(start)}`);
      if (end) parts.push(`hasta ${formatDateHuman(end)}`);
      return parts.join(" ");
    };

    const insc = formatRange(conv?.inscripcion_inicio, conv?.inscripcion_fin);
    const evento = formatRange(conv?.evento_inicio, conv?.evento_fin);

    if (insc)
      chips.push(
        `<span><i class="fas fa-clipboard-list"></i> Inscripción: ${escHtml(insc)}</span>`,
      );
    if (evento)
      chips.push(
        `<span><i class="fas fa-calendar-alt"></i> Evento: ${escHtml(evento)}</span>`,
      );
    if (!chips.length) return "";

    return `
      <div class="conv-program-section" style="margin-top:16px;">
        <div class="conv-program-head" style="margin-bottom:12px;">
          <div>
            <span class="conv-program-kicker"><i class="fas fa-calendar-day"></i> Fechas</span>
            <h3>Inscripciones y programación</h3>
          </div>
        </div>
        <div class="conv-program-meta" style="margin-top:0;">
          ${chips.join("")}
        </div>
      </div>`;
  }

  function collectProgramItems(conv) {
    const items = [];
    const modules = Array.isArray(conv?.modules) ? conv.modules : [];

    if (modules.length) {
      modules
        .slice()
        .sort(
          (a, b) =>
            (a.sort_order || 0) - (b.sort_order || 0) ||
            (a.id || 0) - (b.id || 0),
        )
        .forEach((mod) => {
          items.push(
            normalizeProgramItem(mod, mod.module_type || mod.type || "custom"),
          );
        });
      return items;
    }

    (conv?.workshops || []).forEach((t) => {
      items.push(
        normalizeProgramItem(
          {
            id: t.id,
            title: t.name,
            description: t.description,
            icon: "fas fa-chalkboard-teacher",
            status: t.status || "published",
            schedule_date: t.schedule_date,
            time_start: t.schedule_start,
            time_end: t.schedule_end,
            location: t.location,
            max_capacity: t.max_capacity,
            enrolled_count: t.enrolled_count,
            responsible_name: t.instructor_name,
            price: t.price,
          },
          "workshop",
        ),
      );
    });

    (conv?.conferences || []).forEach((c) => {
      items.push(
        normalizeProgramItem(
          {
            id: c.id,
            title: c.name,
            description: c.description,
            icon: "fas fa-microphone-lines",
            status: c.status || "published",
            schedule_date: c.conference_date,
            time_start: c.time_start,
            time_end: c.time_end,
            location: c.location,
            responsible_name: c.speaker_name,
            price: c.price,
          },
          "conference",
        ),
      );
    });

    if (!items.length) {
      const inc = parseIncludedModules(conv?.included_modules);
      if (
        inc.congress ||
        inc.workshops ||
        inc.conferences ||
        inc.camp ||
        (inc.custom || []).length
      ) {
        if (inc.congress || inc.workshops) {
          items.push({
            title: "Talleres",
            module_type: "workshop",
            description:
              "Sección habilitada por el organizador. Aún no hay talleres publicados.",
            icon: "fas fa-chalkboard-teacher",
            status: "draft",
          });
        }
        if (inc.congress || inc.conferences) {
          items.push({
            title: "Conferencias",
            module_type: "conference",
            description:
              "Sección habilitada por el organizador. Aún no hay conferencias publicadas.",
            icon: "fas fa-microphone-lines",
            status: "draft",
          });
        }
        if (inc.camp) {
          items.push({
            title: "Campamento",
            module_type: "custom",
            description: "Módulo activo en la convocatoria.",
            icon: "fas fa-campground",
            status: "draft",
          });
        }
        (inc.custom || []).forEach((entry) => {
          items.push({
            title: entry.label || entry.name || "Módulo personalizado",
            module_type: "custom",
            description: "Módulo personalizado habilitado en la convocatoria.",
            icon: "fas fa-star",
            status: "draft",
          });
        });
      }
    }

    return items;
  }

  function normalizeProgramItem(item, fallbackType) {
    const type = String(
      item?.module_type || fallbackType || "custom",
    ).toLowerCase();
    const isWorkshop = type === "workshop";
    const isConference = type === "conference";
    const status = String(item?.status || "draft").toLowerCase();
    const statusLabel =
      status === "published"
        ? "Publicado"
        : status === "disabled"
          ? "Deshabilitado"
          : "Borrador";

    return {
      id: item?.id || null,
      title: item?.title || item?.name || "Módulo",
      description: item?.description || "",
      icon:
        item?.icon ||
        (isWorkshop
          ? "fas fa-chalkboard-teacher"
          : isConference
            ? "fas fa-microphone-lines"
            : "fas fa-layer-group"),
      status,
      statusLabel,
      module_type: type,
      schedule_date: item?.schedule_date || item?.conference_date || "",
      time_start: item?.time_start || item?.schedule_start || "",
      time_end: item?.time_end || item?.schedule_end || "",
      location: item?.location || "",
      max_capacity: item?.max_capacity || 0,
      enrolled_count: item?.enrolled_count || 0,
      responsible_name:
        item?.responsible_name ||
        item?.speaker_name ||
        item?.instructor_name ||
        "",
      price: item?.price || 0,
      module_key: item?.module_key || "",
    };
  }

  function renderProgramCard(item) {
    const isWorkshop = item.module_type === "workshop";
    const isConference = item.module_type === "conference";
    const iconBg = isConference ? "rgba(242,169,0,.14)" : "rgba(0,212,255,.12)";
    const iconColor = isConference ? "#f2a900" : "#00d4ff";

    const meta = [];
    meta.push(
      `<span><i class="fas fa-calendar-alt"></i> ${escHtml(formatLongDate(item.schedule_date))}</span>`,
    );
    meta.push(
      `<span><i class="fas fa-clock"></i> ${escHtml(formatDisplayTime(item.time_start))}${item.time_end ? ` - ${escHtml(formatDisplayTime(item.time_end))}` : ""}</span>`,
    );
    meta.push(
      `<span><i class="fas fa-location-dot"></i> ${escHtml(item.location || ORGANIZER_UNSPECIFIED)}</span>`,
    );
    if (item.max_capacity)
      meta.push(
        `<span><i class="fas fa-users"></i> ${escHtml(String(item.enrolled_count || 0))}/${escHtml(String(item.max_capacity))}</span>`,
      );
    else
      meta.push(
        `<span><i class="fas fa-users"></i> ${escHtml(ORGANIZER_UNSPECIFIED)}</span>`,
      );
    if (item.responsible_name)
      meta.push(
        `<span><i class="fas fa-user-tie"></i> ${escHtml(item.responsible_name)}</span>`,
      );

    const desc = sanitizeRichHtml(
      item.description || "Sin descripcion cargada por el organizador.",
    );
    const statusClass =
      item.status === "published"
        ? "is-published"
        : item.status === "disabled"
          ? "is-disabled"
          : "is-draft";

    return `
      <article class="conv-program-card">
        <div class="conv-program-card-top">
          <div class="conv-program-icon" style="background:${iconBg};color:${iconColor};"><i class="${escHtml(item.icon || "fas fa-layer-group")}"></i></div>
          <div class="conv-program-title">
            <strong>${escHtml(item.title)}</strong>
            <span>${isWorkshop ? "Taller" : isConference ? "Conferencia" : "Módulo"}</span>
          </div>
          <span class="conv-program-status ${statusClass}">${escHtml(item.statusLabel || "Borrador")}</span>
        </div>
        ${desc ? `<div class="conv-program-desc">${desc}</div>` : `<div class="conv-program-empty">No hay descripción detallada para este módulo todavía.</div>`}
        ${meta.length ? `<div class="conv-program-meta">${meta.join("")}</div>` : ""}
      </article>`;
  }

  function parseCategories(rawCategories) {
    if (!rawCategories) return [];
    try {
      const parsed =
        typeof rawCategories === "string"
          ? JSON.parse(rawCategories)
          : rawCategories;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function parseIncludedModules(rawModules) {
    const fallback = {
      congress: false,
      robotics: false,
      camp: false,
      workshops: false,
      conferences: false,
      custom: [],
    };

    if (!rawModules) return fallback;

    try {
      const parsed =
        typeof rawModules === "string" ? JSON.parse(rawModules) : rawModules;
      if (parsed && typeof parsed === "object") {
        return { ...fallback, ...parsed };
      }
    } catch (e) {}

    return fallback;
  }

  function formatDateHuman(raw) {
    if (!raw) return "";
    return formatLongDate(raw, String(raw));
  }

  function renderCategoryCard(cat) {
    const title = cat?.name || cat?.category_name || "Categoría";
    const desc = sanitizeRichHtml(cat?.description || "");
    const iconClass = String(
      cat?.icon || cat?.icon_type || "fas fa-tag",
    ).trim();
    const badge = cat?.is_remote_controlled
      ? `<span class="conv-category-badge"><i class="fas fa-bolt"></i> RC</span>`
      : `<span class="conv-category-badge"><i class="fas fa-tag"></i> Categoría</span>`;
    const reglamento = cat?.pdf_url || cat?.documento_reglamento_url;

    return `
      <article class="conv-category-card">
        <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;">
          <div class="conv-category-icon"><i class="${escHtml(iconClass)}"></i></div>
          <div style="flex:1; min-width:0;">
            ${badge}
            <h4>${escHtml(title)}</h4>
          </div>
        </div>
        <div class="conv-category-desc">${desc || "Sin descripción"}</div>
        ${reglamento ? `<div style="margin-top:12px;"><a href="${escHtml(reglamento)}" target="_blank" rel="noopener" class="btn-download" style="width:auto;display:inline-flex;gap:8px;align-items:center;"><i class="fas fa-file-pdf"></i> Ver reglamento</a></div>` : ""}
      </article>`;
  }

  function buildTalleresHtml(talleres, conferencias, convId) {
    return buildProgramSection({
      workshops: talleres || [],
      conferences: conferencias || [],
      id: convId,
      included_modules: {},
      modules: [],
    });
  }

  function escHtml(str) {
    if (typeof escapeHtml === "function") return escapeHtml(str);
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setPlainText(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHtml(id, value) {
    if (!value) return;
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  /** Renderiza el bloque de PDF (botones + iframe) de forma dinámica.
   *  Si no hay URL sube un aviso discreto en lugar de botones rotos. */
  function renderDocBloque({
    containerId,
    pdfUrl,
    titulo,
    descripcion,
    iframeTitle,
    accentColor,
  }) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!pdfUrl) {
      el.innerHTML = `
        <div class="campamento-highlight" style="margin-top:20px;opacity:0.5">
          <div class="campamento-highlight-icon"><i class="fas fa-file-pdf"></i></div>
          <div>
            <h4>${escHtml(titulo)}</h4>
            <p style="color:var(--text-mute)">El documento aún no ha sido publicado por el organizador.</p>
          </div>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="campamento-highlight" style="margin-top:20px">
        <div class="campamento-highlight-icon"><i class="fas fa-file-pdf"></i></div>
        <div style="flex:1">
          <h4>${escHtml(titulo)}</h4>
          <p>${escHtml(descripcion)}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
            <a href="${escHtml(pdfUrl)}" target="_blank" rel="noopener" class="btn-download" style="width:auto">
              <i class="fas fa-file-pdf"></i> Ver PDF
            </a>
            <a href="${escHtml(pdfUrl)}" download class="btn-download" style="width:auto">
              <i class="fas fa-download"></i> Descargar PDF
            </a>
          </div>
        </div>
      </div>
      <div class="conv-includes-grid" style="margin-top:14px">
        <div class="conv-include-item" style="grid-column:1/-1;display:block">
          <div style="margin-bottom:10px">
            <strong>Vista rápida del PDF</strong>
            <p style="margin-top:4px">Si tu navegador lo permite, puedes previsualizar el documento directamente aquí.</p>
          </div>
          <iframe src="${escHtml(pdfUrl)}#view=FitH" title="${escHtml(iframeTitle)}"
            style="width:100%;height:420px;border:1px solid ${accentColor};border-radius:12px;background:#fff"></iframe>
        </div>
      </div>`;
  }

  function formatPrecioHtml(conv) {
    if (!conv) return "";
    if (conv.pricing_mode === "staged" && conv.price_stages?.length) {
      const mins = conv.price_stages
        .map((s) => parseFloat(s.price || s.precio || 0))
        .filter((p) => p > 0);
      if (mins.length)
        return `$${Math.min(...mins).toLocaleString("es-MX")} <small>MXN desde</small>`;
    }
    const p = parseFloat(conv.precio_base || 0);
    return p === 0
      ? "Gratis"
      : `$${p.toLocaleString("es-MX")} <small>MXN</small>`;
  }

  function formatPrecioCorto(conv) {
    if (!conv) return "";
    if (conv.pricing_mode === "staged" && conv.price_stages?.length) {
      const mins = conv.price_stages
        .map((s) => parseFloat(s.price || s.precio || 0))
        .filter((p) => p > 0);
      if (mins.length)
        return `$${Math.min(...mins).toLocaleString("es-MX")}+ MXN`;
    }
    const p = parseFloat(conv.precio_base || 0);
    return p === 0 ? "Gratis" : `$${p.toLocaleString("es-MX")} MXN`;
  }

  function buildDatesStr(conv) {
    const fmt = (str) => (str ? fmtDate(new Date(str.replace(/-/g, "/"))) : "");
    const parts = [];
    if (conv.inscripcion_inicio)
      parts.push(`Inscripciones desde ${fmt(conv.inscripcion_inicio)}`);
    if (conv.inscripcion_fin) parts.push(`hasta ${fmt(conv.inscripcion_fin)}`);
    if (conv.evento_inicio) parts.push(`· Evento: ${fmt(conv.evento_inicio)}`);
    return parts.join(" ");
  }

  function setDates(id, conv) {
    const el = document.getElementById(id);
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

  function resolveImg(url) {
    if (!url) return "/assets/images/electro.png";
    if (url.startsWith("/uploads/")) return "/app" + url;
    return url;
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarConfiguracionDinamica);
  } else {
    cargarConfiguracionDinamica();
  }

  window.cargarConfiguracionDinamica = cargarConfiguracionDinamica;
})();
