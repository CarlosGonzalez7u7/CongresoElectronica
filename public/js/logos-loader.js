/**
 * Cargador Dinámico de Logos
 * Reemplaza logos estáticos por los almacenados en admin
 * v20260601
 */

const logosLoader = {
  /**
   * Mapeo de tipos de logo a elementos HTML
   */
  elementMap: {
    institution: {
      selector: ".auth-logos-strip .logo-chip:first-child img",
      altText: "Institución",
    },
    organization: {
      selector: ".auth-logos-strip .logo-chip:last-child img",
      altText: "Organización",
    },
    mascot: {
      selector: ".auth-logos-strip .logo-chip:nth-child(3) img",
      altText: "Mascota",
    },
    career: { selector: ".nav-logo-ieee", altText: "Carrera" },
  },

  /**
   * Carga los logos desde el servidor y actualiza el DOM
   */
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
      console.warn("No se pudieron cargar logos dinámicos", err);
      // Usar logos estáticos como fallback
    }
  },

  /**
   * Aplica los logos al DOM
   */
  applyLogos(logos) {
    Object.entries(logos).forEach(([type, logoData]) => {
      const mapping = this.elementMap[type];
      if (mapping) {
        try {
          const element = document.querySelector(mapping.selector);
          if (element && element.tagName === "IMG") {
            element.src = logoData.url;
            element.alt = mapping.altText;
          }
        } catch (err) {
          console.warn(`No se pudo actualizar logo de tipo: ${type}`, err);
        }
      }
    });
  },
};

// Cargar logos cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => logosLoader.load());
} else {
  logosLoader.load();
}
