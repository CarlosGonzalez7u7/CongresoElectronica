// c:\dev\congreso\public\js\landing-config.js

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/app/api/public-landing.php");
    const json = await res.json();

    if (json.success) {
      const data = json.data;

      // Actualizar Hero (Título, Descripción, Píldoras)
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
              let text = p.trim();
              let textLower = text.toLowerCase();
              if (textLower.includes("congreso")) icon = "fa-suitcase";
              else if (textLower.includes("rob")) icon = "fa-robot";
              else if (textLower.includes("camp")) icon = "fa-campground";
              return `<span class="mini-pill-tag"><i class="fas ${icon}"></i> ${text}</span>`;
            })
            .join("");
        }
      }

      // Generar Convocatorias Dinámicamente
      const container = document.getElementById(
        "dynamicConvocatoriasContainer",
      );
      if (container && data.convocatorias && data.convocatorias.length > 0) {
        let html = "";
        data.convocatorias.forEach((conv, index) => {
          const num = index + 1;
          const numStr = num < 10 ? `0${num}` : `${num}`;

          let sectionClass = "congreso-section";
          if (index % 3 === 1) sectionClass = "robotica-section";
          if (index % 3 === 2) sectionClass = "campamento-section";

          let priceLabel =
            conv.pricing_mode === "fixed"
              ? "Precio por inscripción"
              : "Precio desde";

          html += `
            <section class="convocatoria-section ${sectionClass}" id="convocatoria-${conv.id}">
              <div class="conv-header">
                <div class="conv-badge-num">${numStr}</div>
                <div class="conv-header-copy">
                  <span class="section-eyebrow">Convocatoria ${num}</span>
                  <h2>${conv.titulo}</h2>
                </div>
                <div class="conv-price-block">
                  <span class="conv-price-label">${priceLabel}</span>
                  <strong class="conv-price">$${parseFloat(conv.precio_base).toFixed(2)} <small>MXN</small></strong>
                </div>
              </div>
              <div class="conv-body">
                <div class="quill-dynamic-content" style="color: #fff; margin-bottom: 25px;">
                  ${conv.descripcion}
                </div>
                <div class="conv-cta-row">
                  <a class="btn-primary-hero" href="acceso.html?mode=register">
                    <i class="fas fa-arrow-right"></i> Inscribirme en ${conv.titulo}
                  </a>
                </div>
              </div>
            </section>
          `;
        });

        // Añadir estilos para que el contenido renderizado de Quill respete el diseño original
        html += `
          <style>
            .quill-dynamic-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 15px 0; }
            .quill-dynamic-content h1, .quill-dynamic-content h2, .quill-dynamic-content h3 { color: #00d4ff; margin-bottom: 15px; font-family: 'Syne', sans-serif; font-weight: 700; }
            .quill-dynamic-content h4, .quill-dynamic-content h5, .quill-dynamic-content h6 { color: #f2a900; margin-bottom: 10px; font-family: 'Syne', sans-serif; }
            .quill-dynamic-content p { font-size: 1.05rem; line-height: 1.6; margin-bottom: 15px; color: rgba(255,255,255,0.85); }
            .quill-dynamic-content ul, .quill-dynamic-content ol { padding-left: 20px; margin-bottom: 15px; color: rgba(255,255,255,0.85); line-height: 1.6; }
            .quill-dynamic-content li { margin-bottom: 8px; }
            .quill-dynamic-content a { color: #f2a900; text-decoration: underline; font-weight: 500; }
            .quill-dynamic-content iframe { border-radius: 12px; margin: 15px 0; border: 1px solid rgba(255,255,255,0.2); }
            
            /* Asegurarse de que los estilos inline del editor (como tamaños de fuente de Quill) tengan prioridad */
            .quill-dynamic-content span[style*="font-size"] { font-size: inherit; }
          </style>
        `;

        container.innerHTML = html;
      } else if (container) {
        container.innerHTML =
          '<p style="text-align: center; color: white;">No hay convocatorias activas en este momento.</p>';
      }
    }
  } catch (err) {
    console.error("Error fetching dynamic landing info:", err);
  }
});
