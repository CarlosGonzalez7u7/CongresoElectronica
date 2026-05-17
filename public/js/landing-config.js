// landing-config.js — Renderizado dinámico de convocatorias (versión mejorada)

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("dynamicConvocatoriasContainer");

  try {
    const res = await fetch("/app/api/public-landing.php");
    const json = await res.json();

    if (!json.success) throw new Error(json.error || "Error de servidor");

    const data = json.data;

    // ── Actualizar Hero dinámicamente ──────────────────────────
    const eventName = data.settings?.event_name || "RENOVATEC 2026";

    // Reemplazar el nombre del evento en toda la página
    document
      .querySelectorAll(
        ".brand span, .nav-brand-name, .hero-kicker span, .main-footer-kicker, .hero-card-badge, .main-footer-bottom span:last-child",
      )
      .forEach((el) => {
        if (
          el.textContent.includes("RENOVATEC 2026") ||
          el.textContent.includes("RENOVATEC")
        ) {
          el.textContent = eventName;
        }
      });
    document.title = eventName;

    if (data.settings) {
      const titleEl = document.querySelector(".hero-copy h1");
      if (titleEl && data.settings.landing_hero_title) {
        titleEl.innerHTML = data.settings.landing_hero_title;
      }
      const leadEl = document.querySelector(".hero-lead b");
      if (leadEl && data.settings.landing_hero_lead) {
        leadEl.innerHTML = data.settings.landing_hero_lead;
      }
      const pillsWrap = document.querySelector(".hero-mini-pills");
      if (pillsWrap && data.settings.landing_hero_pills) {
        const pills = data.settings.landing_hero_pills.split(",");
        pillsWrap.innerHTML = pills
          .map((p) => {
            let icon = "fa-star";
            const t = p.trim().toLowerCase();

            const iconMap = {
              congreso: "fa-suitcase",
              rob: "fa-robot",
              camp: "fa-campground",
              futbol: "fa-futbol",
              fútbol: "fa-futbol",
              basket: "fa-basketball-ball",
              voley: "fa-volleyball-ball",
              ajedrez: "fa-chess",
              hack: "fa-laptop-code",
              taller: "fa-tools",
              feria: "fa-flask",
              ciencia: "fa-flask",
              arte: "fa-palette",
              cultura: "fa-palette",
              musica: "fa-music",
              música: "fa-music",
              danza: "fa-shoe-prints",
              baile: "fa-shoe-prints",
              esport: "fa-gamepad",
              videojuego: "fa-gamepad",
              gamer: "fa-gamepad",
              carrera: "fa-running",
              atletismo: "fa-running",
              natacion: "fa-swimmer",
              natación: "fa-swimmer",
            };
            for (const [key, val] of Object.entries(iconMap)) {
              if (t.includes(key)) {
                icon = val;
                break;
              }
            }
            return `<span class="mini-pill-tag"><i class="fas ${icon}"></i> ${p.trim()}</span>`;
          })
          .join("");
      }
    }

    // ── Actualizar hero-stats y final-cta-packages dinámicamente ──
    const heroStatsWrap = document.querySelector(".hero-stats");
    const finalCtaWrap = document.querySelector(".final-cta-packages");

    if (data.convocatorias && (heroStatsWrap || finalCtaWrap)) {
      let statsHtml = "";
      let ctaHtml = "";
      const esc = (s) =>
        String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      data.convocatorias.forEach((cv, idx) => {
        let icon = "fa-star";
        const t = (cv.conv_tipo || cv.titulo).toLowerCase();
        const iconMap = {
          congreso: "fa-suitcase",
          rob: "fa-robot",
          camp: "fa-campground",
          futbol: "fa-futbol",
          fútbol: "fa-futbol",
          basket: "fa-basketball-ball",
          voley: "fa-volleyball-ball",
          ajedrez: "fa-chess",
          hack: "fa-laptop-code",
          taller: "fa-tools",
          feria: "fa-flask",
          ciencia: "fa-flask",
          arte: "fa-palette",
          cultura: "fa-palette",
          musica: "fa-music",
          música: "fa-music",
          danza: "fa-shoe-prints",
          baile: "fa-shoe-prints",
          esport: "fa-gamepad",
          videojuego: "fa-gamepad",
          gamer: "fa-gamepad",
          carrera: "fa-running",
          atletismo: "fa-running",
          natacion: "fa-swimmer",
          natación: "fa-swimmer",
        };
        for (const [key, val] of Object.entries(iconMap)) {
          if (t.includes(key)) {
            icon = val;
            break;
          }
        }

        let priceDisplay =
          "$" + parseFloat(cv.precio_base || 0).toFixed(2) + " MXN";
        let shortPrice = "$" + parseFloat(cv.precio_base || 0).toFixed(0);

        if (cv.pricing_mode === "staged" && cv.price_stages) {
          let stages = cv.price_stages;
          if (typeof stages === "string") {
            try {
              stages = JSON.parse(stages);
            } catch (e) {}
          }
          if (Array.isArray(stages) && stages.length > 0) {
            priceDisplay =
              "desde $" + parseFloat(stages[0].price).toFixed(2) + " MXN c/u";
            shortPrice = "desde $" + parseFloat(stages[0].price).toFixed(0);
          }
        }

        if (heroStatsWrap) {
          statsHtml += `<article><span><i class="fas ${icon}"></i> ${esc(cv.titulo)}</span><strong>${esc(priceDisplay)}</strong></article>`;
        }

        if (finalCtaWrap) {
          if (idx > 0) ctaHtml += `<span class="cta-plus">+</span>`;
          ctaHtml += `<div class="cta-package-pill${idx > 0 ? " cta-pill-optional" : ""}"><i class="fas ${icon}"></i><span>${esc(cv.conv_tipo || cv.titulo)} ${esc(shortPrice)}</span></div>`;
        }
      });

      if (heroStatsWrap && statsHtml) heroStatsWrap.innerHTML = statsHtml;
      if (finalCtaWrap && ctaHtml) finalCtaWrap.innerHTML = ctaHtml;
    }

    // ── Render convocatorias ───────────────────────────────────
    if (!container) return;

    if (!data.convocatorias || !data.convocatorias.length) {
      container.innerHTML =
        '<p style="text-align:center;color:rgba(255,255,255,0.6);padding:50px 20px;font-size:1.05rem">No hay convocatorias activas en este momento.</p>';
      return;
    }

    // Paletas de color por índice (modulo 3)
    const palettes = [
      {
        accent: "#00d4ff",
        accentDim: "rgba(0,212,255,0.12)",
        accentBorder: "rgba(0,212,255,0.25)",
        icon: "fa-suitcase",
      },
      {
        accent: "#f2a900",
        accentDim: "rgba(242,169,0,0.12)",
        accentBorder: "rgba(242,169,0,0.28)",
        icon: "fa-robot",
      },
      {
        accent: "#34d399",
        accentDim: "rgba(52,211,153,0.12)",
        accentBorder: "rgba(52,211,153,0.25)",
        icon: "fa-campground",
      },
    ];

    const fmtDate = (d) => {
      if (!d) return null;
      // Compatibilidad estricta con Safari / iOS reemplazando el espacio por la 'T' ISO
      const dt = new Date(String(d).replace(" ", "T"));
      if (isNaN(dt)) return null;
      return dt.toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    };

    const buildPriceBlock = (conv) => {
      if (conv.pricing_mode === "staged" && conv.price_stages) {
        let stages = conv.price_stages;
        if (typeof stages === "string") {
          try {
            stages = JSON.parse(stages);
          } catch (e) {}
        }
        if (Array.isArray(stages) && stages.length) {
          const now = new Date();
          let currentStage = stages[stages.length - 1];
          for (const st of stages) {
            const end = new Date(st.end);
            if (now <= end) {
              currentStage = st;
              break;
            }
          }
          const stagesHtml = stages
            .map((st, i) => {
              const isActive = st === currentStage;
              const endStr = fmtDate(st.end) || st.end;
              return `<div class="conv-stage-row${isActive ? " active" : ""}">
                <span class="csr-label">Etapa ${i + 1}${isActive ? " <span class='csr-now'>▶ Ahora</span>" : ""}</span>
                <span class="csr-date">Hasta ${endStr}</span>
                <span class="csr-price">$${parseFloat(st.price).toFixed(2)}</span>
              </div>`;
            })
            .join("");
          return `<div class="conv-price-staged">
            <div class="conv-price-now">$${parseFloat(currentStage.price).toFixed(2)} <small>MXN</small></div>
            <div class="conv-stages-list">${stagesHtml}</div>
          </div>`;
        }
      }
      // Fixed
      const p = parseFloat(conv.precio_base || 0);
      return `<div class="conv-price-fixed">$${p.toFixed(2)} <small>MXN</small></div>`;
    };

    const buildDates = (conv, accentColor) => {
      const rows = [];

      const safeDate = (d) => {
        if (!d || String(d).startsWith("0000")) return null;
        return fmtDate(d);
      };

      const iIni = safeDate(conv.inscripcion_inicio);
      if (iIni)
        rows.push({
          icon: "fa-sign-in-alt",
          label: "Inicio inscripciones",
          val: iIni,
        });
      const iFin = safeDate(conv.inscripcion_fin);
      if (iFin)
        rows.push({
          icon: "fa-calendar-times",
          label: "Cierre inscripciones",
          val: iFin,
        });
      const eIni = safeDate(conv.evento_inicio);
      if (eIni)
        rows.push({
          icon: "fa-flag-checkered",
          label: "Inicio del evento",
          val: eIni,
        });
      const eFin = safeDate(conv.evento_fin);
      if (eFin)
        rows.push({
          icon: "fa-flag",
          label: "Fin del evento",
          val: eFin,
        });
      if (!rows.length) return "";
      return `<div class="conv-dates-grid">
        ${rows
          .map(
            (r) => `<div class="conv-date-entry">
          <i class="fas ${r.icon}" style="color:${accentColor}"></i>
          <div><span class="cde-label">${r.label}</span><strong class="cde-val">${r.val}</strong></div>
        </div>`,
          )
          .join("")}
      </div>`;
    };

    let html = `<style>
/* ── Convocatoria cards — diseño mejorado ── */
.conv-section-card {
  margin: 48px auto;
  max-width: 960px;
  padding: 0 20px;
}
.conv-card-wrapper {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06) inset;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}
.conv-card-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 60px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset;
}

/* Card header */
.conv-card-head {
  padding: 28px 36px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.conv-card-head-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1 1 300px;
}
.conv-num-badge {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 20px;
  flex-shrink: 0;
}
.conv-head-text h2 {
  font-family: 'Syne', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  color: #f0f4ff;
  margin-bottom: 4px;
  line-height: 1.2;
}
.conv-tipo-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 3px 11px;
  font-size: 12px;
  color: rgba(255,255,255,0.65);
  font-weight: 500;
}
.conv-price-col {
  text-align: right;
  flex-shrink: 0;
}
.conv-price-label-sm {
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 4px;
}
.conv-price-fixed {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 2rem;
  line-height: 1;
  color: #f2a900;
}
.conv-price-fixed small {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255,255,255,0.4);
  margin-left: 3px;
}
.conv-price-staged .conv-price-now {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 2rem;
  color: #f2a900;
  line-height: 1;
}
.conv-price-staged .conv-price-now small {
  font-size: 13px;
  font-weight: 400;
  color: rgba(255,255,255,0.4);
  margin-left: 3px;
}
.conv-stages-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 220px;
}
.conv-stage-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  padding: 4px 8px;
  border-radius: 6px;
}
.conv-stage-row.active {
  background: rgba(242,169,0,0.12);
  color: rgba(255,255,255,0.9);
}
.csr-label { flex: 1; font-weight: 600; }
.csr-date { flex: 2; }
.csr-price { font-family: 'Syne', sans-serif; font-weight: 700; color: #f2a900; }
.csr-now {
  display: inline-block;
  background: rgba(242,169,0,0.25);
  color: #f2a900;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 9px;
  margin-left: 4px;
}

/* Dates grid */
.conv-dates-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 16px 36px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(0,0,0,0.15);
}
.conv-date-entry {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1 1 180px;
}
.conv-date-entry i {
  margin-top: 3px;
  font-size: 13px;
  flex-shrink: 0;
}
.cde-label {
  display: block;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-bottom: 1px;
}
.cde-val {
  display: block;
  font-size: 13px;
  color: #e8ecff;
  font-weight: 500;
}

/* Content body */
.conv-card-body {
  padding: 28px 36px;
}

/* Descripción con estilos del editor Quill */
.conv-rich-content {
  color: rgba(237,242,255,0.88);
  font-size: 1.02rem;
  line-height: 1.75;
  margin-bottom: 24px;
}
.conv-rich-content img {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  margin: 16px auto;
  display: block;
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}
.conv-rich-content h1,
.conv-rich-content h2,
.conv-rich-content h3 {
  font-family: 'Syne', sans-serif;
  color: #00d4ff;
  margin-bottom: 14px;
  font-weight: 700;
  line-height: 1.25;
}
.conv-rich-content h4, .conv-rich-content h5, .conv-rich-content h6 {
  font-family: 'Syne', sans-serif;
  color: #f2a900;
  margin-bottom: 10px;
  font-weight: 600;
}
.conv-rich-content p { margin-bottom: 14px; }
.conv-rich-content ul, .conv-rich-content ol {
  padding-left: 22px;
  margin-bottom: 14px;
  line-height: 1.7;
}
.conv-rich-content li { margin-bottom: 6px; }
.conv-rich-content a { color: #f2a900; text-decoration: underline; font-weight: 500; }
.conv-rich-content blockquote {
  border-left: 4px solid rgba(242,169,0,0.5);
  margin: 16px 0;
  padding: 12px 18px;
  background: rgba(242,169,0,0.07);
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: rgba(237,242,255,0.7);
}
.conv-rich-content iframe {
  border-radius: 12px;
  margin: 16px 0;
  border: 1px solid rgba(255,255,255,0.15);
  width: 100%;
}
.conv-rich-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 0.9rem;
}
.conv-rich-content th {
  background: rgba(255,255,255,0.08);
  color: #f0f4ff;
  padding: 10px 14px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid rgba(255,255,255,0.12);
}
.conv-rich-content td {
  padding: 9px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  color: rgba(237,242,255,0.8);
}
.conv-rich-content tr:hover td { background: rgba(255,255,255,0.03); }

/* CTA row */
.conv-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding-top: 8px;
}

/* Responsive */
@media (max-width: 680px) {
  .conv-card-head { padding: 20px 20px 16px; }
  .conv-card-body { padding: 20px 20px 28px; }
  .conv-dates-grid { padding: 12px 20px; }
  .conv-card-head-left { gap: 12px; }
  .conv-num-badge { width: 42px; height: 42px; font-size: 16px; }
  .conv-head-text h2 { font-size: 1.25rem; }
  .conv-price-fixed, .conv-price-staged .conv-price-now { font-size: 1.5rem; }
  .conv-stages-list { min-width: 160px; }
  .conv-stage-row { flex-wrap: wrap; }
}

/* ── Restaurar Alineaciones y Fuentes del Editor Word ── */
.conv-rich-content .ql-align-center { text-align: center; }
.conv-rich-content .ql-align-right { text-align: right; }
.conv-rich-content .ql-align-justify { text-align: justify; }
.conv-rich-content .ql-font-arial { font-family: 'Arial', sans-serif; }
.conv-rich-content .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
.conv-rich-content .ql-font-courier-new { font-family: 'Courier New', monospace; }
.conv-rich-content .ql-font-georgia { font-family: 'Georgia', serif; }
.conv-rich-content .ql-font-verdana { font-family: 'Verdana', sans-serif; }
.conv-rich-content .ql-font-syne { font-family: 'Syne', sans-serif; }
.conv-rich-content .ql-font-dm-sans { font-family: 'DM Sans', sans-serif; }
.conv-rich-content::after { content: ""; display: table; clear: both; } /* Limpiar flotantes de imágenes */

/* ── Animaciones de Scroll Automáticas ── */
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.reveal-on-scroll.is-visible {
  opacity: 1;
  transform: translateY(0);
}
</style>`;

    const getIconForConv = (cv) => {
      let icon = "fa-star";
      const t = (cv.conv_tipo || cv.titulo).toLowerCase();
      const iconMap = {
        congreso: "fa-suitcase",
        rob: "fa-robot",
        camp: "fa-campground",
        futbol: "fa-futbol",
        fútbol: "fa-futbol",
        basket: "fa-basketball-ball",
        voley: "fa-volleyball-ball",
        ajedrez: "fa-chess",
        hack: "fa-laptop-code",
        taller: "fa-tools",
        feria: "fa-flask",
        ciencia: "fa-flask",
        arte: "fa-palette",
        cultura: "fa-palette",
        musica: "fa-music",
        música: "fa-music",
        danza: "fa-shoe-prints",
        baile: "fa-shoe-prints",
        esport: "fa-gamepad",
        videojuego: "fa-gamepad",
        gamer: "fa-gamepad",
        carrera: "fa-running",
        atletismo: "fa-running",
        natacion: "fa-swimmer",
        natación: "fa-swimmer",
      };
      for (const [key, val] of Object.entries(iconMap)) {
        if (t.includes(key)) {
          icon = val;
          break;
        }
      }
      return icon;
    };

    data.convocatorias.forEach((conv, index) => {
      const p = palettes[index % 3];
      const activeIcon = getIconForConv(conv);
      const num = index + 1;
      const numStr = num < 10 ? `0${num}` : `${num}`;
      const priceLabel =
        conv.pricing_mode === "staged"
          ? "Precio por etapas"
          : "Precio de inscripción";

      const datesHtml = buildDates(conv, p.accent);
      const priceHtml = buildPriceBlock(conv);

      // Limpiar el fondo blanco del editor Word para que respete el modo oscuro de la tarjeta
      let descHtml = conv.descripcion || "";
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = descHtml;
      const wrapper = tempDiv.querySelector(".ql-editor-display");
      if (wrapper) {
        descHtml = wrapper.innerHTML;
      }

      html += `
      <section class="conv-section-card reveal-on-scroll" id="convocatoria-${conv.id}">
        <div class="conv-card-wrapper" style="border-color:${p.accentBorder};">
          <!-- HEAD -->
          <div class="conv-card-head" style="background:linear-gradient(135deg,${p.accentDim},transparent);">
            <div class="conv-card-head-left">
              <div class="conv-num-badge" style="background:${p.accentDim};color:${p.accent};border:1px solid ${p.accentBorder};">
                ${numStr}
              </div>
              <div class="conv-head-text">
                <h2>${conv.titulo}</h2>
                ${conv.conv_tipo ? `<span class="conv-tipo-tag"><i class="fas ${activeIcon}"></i> ${conv.conv_tipo}</span>` : ""}
              </div>
            </div>
            <div class="conv-price-col">
              <div class="conv-price-label-sm">${priceLabel}</div>
              ${priceHtml}
            </div>
          </div>

          <!-- DATES BAND -->
          ${datesHtml}

          <!-- BODY -->
          <div class="conv-card-body">
            <div class="conv-rich-content">
              ${descHtml}
            </div>
            <div class="conv-cta-row">
              <a class="btn-primary-hero" href="acceso.html?mode=register">
                <i class="fas fa-arrow-right"></i> Inscribirme: ${conv.titulo}
              </a>
              ${
                conv.documento_url
                  ? `<a class="btn-secondary-hero" href="${conv.documento_url}" target="_blank">
                <i class="fas fa-file-pdf"></i> Ver convocatoria PDF
              </a>`
                  : ""
              }
            </div>
          </div>
        </div>
      </section>`;
    });

    container.innerHTML = html;

    // Observador para disparar la animación en las tarjetas al hacer scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 },
    );
    document
      .querySelectorAll(".reveal-on-scroll")
      .forEach((el) => observer.observe(el));
  } catch (err) {
    console.error("Error cargando convocatorias:", err);
    if (container) {
      container.innerHTML =
        '<p style="text-align:center;color:rgba(255,255,255,0.5);padding:40px">No se pudo cargar la información del evento.</p>';
    }
  }
});
