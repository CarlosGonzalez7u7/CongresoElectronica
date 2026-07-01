/**
 * Gestor de Logos del Sistema
 * Permite cargar, visualizar y eliminar logos desde el admin
 * v20260601
 */

const logoManager = {
  logoTypes: {
    institution: {
      label: "Institución",
      icon: "fas fa-building",
      description: "Logo de la institución educativa",
    },
    organization: {
      label: "Organización",
      icon: "fas fa-briefcase",
      description: "Logo de la organización",
    },
    mascot: {
      label: "Mascota del Evento",
      icon: "fas fa-heart",
      description: "Logo o mascota del evento",
    },
    career: {
      label: "Carrera",
      icon: "fas fa-graduation-cap",
      description: "Logo de la carrera o programa",
    },
  },

  allLogos: {},

  /**
   * Inicializa el gestor de logos
   */
  async init() {
    await this.loadLogos();
    this.renderLogos();
  },

  /**
   * Carga los logos desde el servidor
   */
  async loadLogos() {
    try {
      const res = await fetch("/app/api/admin-settings.php?action=get_logos", {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        this.allLogos = json.data || {};
      }
    } catch (err) {
      console.error("Error cargando logos:", err);
    }
  },

  /**
   * Renderiza los logos en el contenedor
   */
  renderLogos() {
    const container = document.getElementById("logosContainer");
    if (!container) return;

    container.innerHTML = "";

    Object.entries(this.logoTypes).forEach(([type, config]) => {
      const logo = this.allLogos[type];
      const cardHTML = `
        <div class="logo-card admin-logo-card">
          <div class="admin-logo-preview ${logo ? "has-logo" : "is-empty"}">
            ${logo ? `<img src="${logo.url}?t=${Date.now()}" alt="${config.label}" />` : `<i class="${config.icon}"></i>`}
          </div>
          <div class="admin-logo-body">
            <h4>${config.label}</h4>
            <p>${config.description}</p>
            ${logo ? `<span class="admin-logo-status"><i class="fas fa-check-circle"></i> Logo activo</span>` : `<span class="admin-logo-status is-empty"><i class="fas fa-circle-info"></i> Usando predefinido</span>`}
          </div>
          <div class="admin-logo-actions">
            <button type="button" class="btn btn-primary btn-small" onclick="logoManager.openUpload('${type}')">
              <i class="fas fa-upload"></i> ${logo ? "Cambiar" : "Subir"}
            </button>
            ${
              logo
                ? `<button type="button" class="btn btn-danger btn-small" onclick="logoManager.deleteLogo('${type}')">
              <i class="fas fa-trash"></i> Quitar
            </button>`
                : ""
            }
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", cardHTML);
    });
  },

  /**
   * Abre el diálogo de carga de archivo
   */
  openUpload(type) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadLogo(type, file);
      }
    };
    input.click();
  },

  /**
   * Sube un logo al servidor
   */
  async uploadLogo(type, file) {
    if (file.size > 5 * 1024 * 1024) {
      window.showBadgeToast("La imagen no debe superar 5 MB", "error");
      return;
    }

    const fd = new FormData();
    fd.append("action", "upload_logo");
    fd.append("logo_type", type);
    fd.append("logo", file);

    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();

      if (json.success) {
        window.showBadgeToast(
          `Logo de ${this.logoTypes[type].label} cargado`,
          "success",
        );
        await this.loadLogos();
        this.renderLogos();
        // Guardar la configuración
        await this.saveLandingSettings();
      } else {
        window.showBadgeToast("Error: " + json.error, "error");
      }
    } catch (err) {
      window.showBadgeToast("Error de red: " + err.message, "error");
    }
  },

  /**
   * Elimina un logo del servidor
   */
  async deleteLogo(type) {
    if (!confirm(`¿Eliminar logo de ${this.logoTypes[type].label}?`)) {
      return;
    }

    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          action: "delete_logo",
          logo_type: type,
        }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();

      if (json.success) {
        window.showBadgeToast(`Logo eliminado`, "success");
        await this.loadLogos();
        this.renderLogos();
        // Guardar la configuración
        await this.saveLandingSettings();
      } else {
        window.showBadgeToast("Error: " + json.error, "error");
      }
    } catch (err) {
      window.showBadgeToast("Error de red: " + err.message, "error");
    }
  },

  /**
   * Guarda los settings de landing (llamado después de cambios en logos)
   */
  async saveLandingSettings() {
    const payload = {
      action: "update_landing_settings",
      event_name: document.getElementById("landingEventName")?.value || "",
      landing_hero_title:
        document.getElementById("landingHeroTitle")?.value || "",
      landing_hero_lead:
        document.getElementById("landingHeroLead")?.value || "",
      landing_hero_pills:
        document.getElementById("landingHeroPills")?.value || "",
      landing_contact_email:
        document.getElementById("landingContactEmail")?.value || "",
      landing_contact_phone:
        document.getElementById("landingContactPhone")?.value || "",
      landing_location: document.getElementById("landingLocation")?.value || "",
      landing_event_date:
        document.getElementById("landingEventDate")?.value || "",
      landing_event_end_date:
        document.getElementById("landingEventEndDate")?.value || "",
      landing_feature_band:
        document.getElementById("landing_feature_band")?.value || "",
    };

    try {
      await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Error guardando settings:", err);
    }
  },
};

// Inicializar cuando se carga el admin
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("logosContainer")) {
    logoManager.init();
  }
});
