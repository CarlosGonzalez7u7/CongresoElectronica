(function () {
  "use strict";

  const STATIC_CODIGOS = ["congreso", "robotica", "campamento"];

  let _publicData = null;

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

      aplicarSettings(settings);
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
  function aplicarSettings(settings) {
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

  function actualizarCongreso(conv) {
    setPlainText("congresoTitulo", conv.titulo);
    setPlainText("congresoDescripcion", conv.descripcion);
    setHtml("congresoPrecio", formatPrecioHtml(conv));
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
    setPlainText("roboticaDescripcion", conv.descripcion);
    setDates("roboticaDates", conv);
  }

  function actualizarCampamento(conv) {
    setPlainText("campamentoTitulo", conv.titulo);
    setPlainText("campamentoDescripcion", conv.descripcion);
    setHtml("campamentoPrecio", formatPrecioHtml(conv));
    setPlainText("statPrecioCampamento", formatPrecioCorto(conv));
    setDates("campamentoDates", conv);
    if (conv.precio_base)
      window.PRECIO_CAMPAMENTO = parseFloat(conv.precio_base);
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
            <div class="conv-price-block">
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

  /** Elimina <style> de Quill y ql-editor wrapper antes de inyectar */
  function buildRichContent(raw) {
    if (!raw || !raw.trim()) return "";
    let clean = raw.replace(/<style[\s\S]*?<\/style>/gi, "");
    clean = clean.replace(
      /<div[^>]*class="[^"]*ql-editor[^"]*"[^>]*>/gi,
      "<div>",
    );
    clean = clean.trim();
    if (!clean) return "";
    return `<div class="conv-rich-content ql-editor-display"
                 style="margin:18px 0;color:rgba(237,242,255,0.88);
                        font-size:0.95rem;line-height:1.75;">${clean}</div>`;
  }

  function buildTalleresHtml(talleres, conferencias, convId) {
    if (!talleres.length && !conferencias.length) return "";

    const cards = [
      ...talleres.map((t) => {
        const cover = resolveImg(t.cover_image_url);
        const lleno =
          parseInt(t.enrolled_count || 0) >= parseInt(t.max_capacity || 999);
        return `
        <div class="taller-card"
             style="cursor:pointer;border-radius:12px;overflow:hidden;
                    display:flex;flex-direction:column;
                    background:rgba(255,255,255,0.03);
                    border:1px solid rgba(255,255,255,0.09);
                    transition:transform .2s,box-shadow .2s;"
             onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 10px 15px rgba(0,0,0,.3)'"
             onmouseout="this.style.transform='none';this.style.boxShadow='none'"
             onclick="typeof mostrarDetalleTaller==='function'&&mostrarDetalleTaller(${t.id})">
          <div style="height:160px;position:relative;">
            <img src="${escHtml(cover)}"
                 style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.src='/assets/images/electro.png'">
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.1),rgba(0,0,0,.6))"></div>
            ${
              lleno
                ? `<div style="position:absolute;top:10px;right:10px;background:#ef4444;
                         color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;z-index:2;">
                         <i class="fas fa-ban"></i> Lleno</div>`
                : ""
            }
            <div style="position:absolute;bottom:10px;left:12px;right:12px;z-index:2;">
              <span style="color:#fff;font-size:.8rem;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.8);">
                <i class="fas fa-user-tie"></i> ${escHtml(t.instructor_name || "Por definir")}
              </span>
            </div>
          </div>
          <div style="padding:1.1rem;flex:1;display:flex;flex-direction:column;">
            <h4 style="color:#eef4ff;margin:0 0 6px;font-size:1rem;font-weight:700;">${escHtml(t.name || "")}</h4>
            <p style="font-size:.85rem;color:rgba(237,242,255,.6);margin:0 0 auto;
                      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${escHtml(t.description || "")}
            </p>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);
                        display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;flex-direction:column;gap:3px;">
                <span style="font-size:.78rem;color:rgba(237,242,255,.6);">
                  <i class="fas fa-calendar-alt"></i> ${escHtml(t.schedule_date || "Fecha pendiente")}
                </span>
                <span style="font-size:.78rem;color:${parseInt(t.enrolled_count || 0) >= parseInt(t.max_capacity || 999) ? "#ef4444" : "#38bdf8"};">
                  <i class="fas fa-users"></i> ${t.enrolled_count || 0}/${t.max_capacity || "?"} inscritos
                </span>
              </div>
              <div style="width:32px;height:32px;border-radius:50%;background:rgba(56,189,248,.1);
                          display:flex;align-items:center;justify-content:center;color:#38bdf8;">
                <i class="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>`;
      }),
      ...conferencias.map((c) => {
        const cover = resolveImg(c.cover_image_url);
        return `
        <div class="taller-card"
             style="cursor:pointer;border-radius:12px;overflow:hidden;
                    display:flex;flex-direction:column;
                    background:rgba(255,255,255,0.03);
                    border:1px solid rgba(242,169,0,.15);
                    transition:transform .2s,box-shadow .2s;"
             onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 10px 15px rgba(0,0,0,.3)'"
             onmouseout="this.style.transform='none';this.style.boxShadow='none'"
             onclick="typeof mostrarDetalleConferencia==='function'&&mostrarDetalleConferencia(${c.id})">
          <div style="height:160px;position:relative;">
            <img src="${escHtml(cover)}"
                 style="width:100%;height:100%;object-fit:cover;"
                 onerror="this.src='/assets/images/electro.png'">
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.1),rgba(0,0,0,.6))"></div>
            <div style="position:absolute;top:10px;left:10px;background:rgba(242,169,0,.88);
                        color:#151205;font-size:11px;padding:3px 9px;border-radius:20px;font-weight:700;z-index:2;">
              <i class="fas fa-microphone"></i> Conferencia
            </div>
            <div style="position:absolute;bottom:10px;left:12px;right:12px;z-index:2;">
              <span style="color:#fff;font-size:.8rem;font-weight:600;text-shadow:0 1px 2px rgba(0,0,0,.8);">
                <i class="fas fa-microphone"></i> ${escHtml(c.speaker_name || "Por definir")}
              </span>
            </div>
          </div>
          <div style="padding:1.1rem;flex:1;display:flex;flex-direction:column;">
            <h4 style="color:#eef4ff;margin:0 0 6px;font-size:1rem;font-weight:700;">${escHtml(c.name || "")}</h4>
            <p style="font-size:.85rem;color:rgba(237,242,255,.6);margin:0 0 auto;
                      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
              ${escHtml(c.description || "")}
            </p>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);
                        display:flex;justify-content:space-between;align-items:center;">
              <div style="display:flex;flex-direction:column;gap:3px;">
                <span style="font-size:.78rem;color:rgba(237,242,255,.6);">
                  <i class="fas fa-calendar-alt"></i> ${escHtml(c.conference_date || "Fecha por confirmar")}
                </span>
                <span style="font-size:.78rem;color:#38bdf8;">
                  <i class="fas fa-clock"></i> ${escHtml(c.time_start || "--:--")}
                </span>
              </div>
              <div style="width:32px;height:32px;border-radius:50%;background:rgba(56,189,248,.1);
                          display:flex;align-items:center;justify-content:center;color:#38bdf8;">
                <i class="fas fa-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>`;
      }),
    ].join("");

    return `
    <div class="talleres-block">
      <div class="talleres-header">
        <div>
          <h3><i class="fas fa-chalkboard-user"></i> Programa incluido</h3>
          <p>Talleres y conferencias de esta convocatoria, actualizados en tiempo real.</p>
        </div>
      </div>
      <div class="talleres-grid" id="talleresConv${convId}">${cards}</div>
    </div>`;
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
