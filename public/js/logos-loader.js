/**
 * Cargador dinamico de logos.
 * Reemplaza los logos estaticos por los cargados desde Configuracion General.
 */

const logosLoader = {
  elementMap: {
    institution: {
      selectors: [
        '[data-logo-slot="institution"]',
        ".nav-logo",
        ".auth-logos-strip .logo-chip:first-child img",
        ".modal-logos .logo-chip:first-child img",
      ],
      altText: "Institucion",
    },
    organization: {
      selectors: [
        '[data-logo-slot="organization"]',
        ".auth-logos-strip .logo-chip:last-child img",
        ".modal-logos .logo-chip:last-child img",
      ],
      altText: "Organizacion",
    },
    mascot: {
      selectors: ['[data-logo-slot="mascot"]', ".side-robot", ".modal-robot"],
      altText: "Mascota",
    },
    career: {
      selectors: [
        '[data-logo-slot="career"]',
        ".nav-logo-ieee",
        ".auth-logos-strip .logo-chip:nth-child(3) img",
        ".modal-logos .logo-chip:nth-child(2) img",
      ],
      altText: "Carrera",
    },
  },

  async load() {
    try {
      const response = await fetch(
        "/app/api/admin-settings.php?action=get_logos",
      );
      const result = await response.json();

      if (result.success && result.data) {
        this.applyLogos(result.data);
      }
    } catch (err) {
      console.warn("No se pudieron cargar logos dinamicos", err);
    }
  },

  applyLogos(logos) {
    Object.entries(logos).forEach(([type, logoData]) => {
      const mapping = this.elementMap[type];
      if (!mapping || !logoData?.url) return;

      try {
        const elements = mapping.selectors.flatMap((selector) =>
          Array.from(document.querySelectorAll(selector)),
        );

        [...new Set(elements)].forEach((element) => {
          if (element?.tagName === "IMG") {
            element.src = logoData.url;
            element.alt = mapping.altText;
          }
        });
      } catch (err) {
        console.warn(`No se pudo actualizar logo de tipo: ${type}`, err);
      }
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => logosLoader.load());
} else {
  logosLoader.load();
}
