/**
 * settingsModule — Configuración Dinámica del Sistema
 * Versión 3.0 — tipo de evento libre, fechas completas con horario
 */
const settingsModule = {
  data: { convocatorias: [], stages: [], categories: [] },
  _pendingDeleteConvId: null,
  _pendingDeleteHasRecords: false,

  /* ─────────────────────────────────────────
     INIT & DATA LOAD
  ───────────────────────────────────────── */
  init() {
    this.loadData();
  },

  async loadData() {
    try {
      const res = await fetch("/app/api/admin-settings.php?action=get_all");
      const json = await res.json();
      if (json.success) {
        this.data = json.data;
        this.renderConvocatorias();
        this.renderStages();
        this.renderCategories();
        this._updateTipoSuggestions();
        this._rebuildDynamicSidebar();
      } else {
        this.toast("Error cargando configuración: " + json.error, "error");
      }
    } catch (e) {
      console.error(e);
      this.toast("Error de conexión", "error");
    }
  },

  /* ─────────────────────────────────────────
     TABS
  ───────────────────────────────────────── */
  switchTab(tab, btn) {
    document
      .querySelectorAll(".settings-tab-panel")
      .forEach((p) => (p.style.display = "none"));
    document
      .querySelectorAll("#settingsTabs .tab-btn")
      .forEach((b) => b.classList.remove("active"));
    const panel = document.getElementById("tab-" + tab);
    if (panel) {
      panel.style.display = "block";
      panel.style.animation = "none";
      void panel.offsetWidth;
      panel.style.animation = "";
    }
    if (btn) btn.classList.add("active");
  },

  /* ─────────────────────────────────────────
     SUGERENCIAS DE TIPO (datalist dinámico)
  ───────────────────────────────────────── */
  _updateTipoSuggestions() {
    const dl = document.getElementById("convTipoSuggestions");
    if (!dl) return;
    // Recolectar tipos únicos ya usados + algunos predeterminados útiles
    const defaults = [
      "Torneo de Robótica",
      "Torneo de Videojuegos",
      "Torneo de Ajedrez",
      "Congreso",
      "Congreso Académico",
      "Campamento",
      "Feria de Ciencias",
      "Hackathon",
      "Olimpiada",
      "Taller",
      "Actividad Cultural",
    ];
    const fromDB = this.data.convocatorias
      .map((c) => c.conv_tipo)
      .filter(Boolean);
    const all = [...new Set([...fromDB, ...defaults])].sort();
    dl.innerHTML = all.map((t) => `<option value="${this._esc(t)}">`).join("");
  },

  /* ─────────────────────────────────────────
     RENDER: CONVOCATORIAS
  ───────────────────────────────────────── */
  renderConvocatorias() {
    const c = document.getElementById("settingsConvocatoriasList");
    if (!c) return;
    if (!this.data.convocatorias.length) {
      c.innerHTML =
        '<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>Sin convocatorias</h3><p>Crea la primera usando el botón "Nueva Convocatoria".</p></div>';
      return;
    }
    c.innerHTML = this.data.convocatorias
      .map((cv) => {
        const priceLabel =
          cv.pricing_mode === "staged"
            ? "<small>Precio por etapas</small>"
            : `$${parseFloat(cv.precio_base || 0).toFixed(2)} MXN`;

        const statusBadge = parseInt(cv.is_active)
          ? '<span class="badge-active"><i class="fas fa-circle" style="font-size:7px"></i> Activa</span>'
          : '<span class="badge-inactive"><i class="fas fa-circle" style="font-size:7px"></i> Inactiva</span>';

        const tipoBadge = cv.conv_tipo
          ? `<span class="conv-tipo-badge">${this._esc(cv.conv_tipo)}</span>`
          : "";

        // Fechas
        const datesHtml = this._buildDatesRow(cv);

        // Extraer solo texto plano del HTML de Quill y limitar longitud
        let tempDiv = document.createElement("div");
        tempDiv.innerHTML = cv.descripcion || "Sin descripción";
        let plainTextDesc = tempDiv.textContent || tempDiv.innerText || "";
        if (plainTextDesc.length > 140) {
          plainTextDesc = plainTextDesc.substring(0, 140) + "...";
        }

        return `
        <div class="conv-card">
          <div class="conv-card-info">
            <h4>
              ${this._esc(cv.titulo)}
              ${tipoBadge}
              ${statusBadge}
            </h4>
            <p>${this._esc(plainTextDesc)}</p>
            ${datesHtml}
          </div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px">
            <div class="conv-card-price">
              ${priceLabel}
            </div>
            <div class="conv-card-actions">
              ${cv.documento_url ? `<a href="${cv.documento_url}" target="_blank" class="btn btn-secondary btn-small"><i class="fas fa-file-pdf"></i> PDF</a>` : ""}
              <button class="btn btn-secondary btn-small" onclick="settingsModule.pickDoc('convocatoria',${cv.id})"><i class="fas fa-upload"></i> PDF</button>
              <button class="btn btn-secondary btn-small" onclick="settingsModule.openConvModal(${cv.id})"><i class="fas fa-edit"></i> Editar</button>
              <button class="btn btn-danger btn-small"   onclick="settingsModule.startDeleteConv(${cv.id})"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          ${this._buildModulesChips(cv)}
        </div>`;
      })
      .join("");
  },

  /** Genera el bloque de fechas para una convocatoria */
  _buildDatesRow(cv) {
    const parts = [];
    if (cv.inscripcion_inicio)
      parts.push(
        `<span class="conv-date-item"><i class="fas fa-sign-in-alt"></i> Inscripciones: <strong>${this._fmtDate(cv.inscripcion_inicio)}</strong></span>`,
      );
    if (cv.inscripcion_fin)
      parts.push(
        `<span class="conv-date-item"><i class="fas fa-calendar-times"></i> Cierre: <strong>${this._fmtDate(cv.inscripcion_fin)}</strong></span>`,
      );
    if (cv.evento_inicio)
      parts.push(
        `<span class="conv-date-item"><i class="fas fa-flag-checkered"></i> Evento: <strong>${this._fmtDate(cv.evento_inicio)}</strong></span>`,
      );
    if (cv.evento_fin)
      parts.push(
        `<span class="conv-date-item"><i class="fas fa-flag"></i> Fin: <strong>${this._fmtDate(cv.evento_fin)}</strong></span>`,
      );
    if (!parts.length) return "";
    return `<div class="conv-dates-row">${parts.join("")}</div>`;
  },

  /* ─────────────────────────────────────────
     MÓDULOS: chips en tarjeta de convocatoria
  ───────────────────────────────────────── */
  _buildModulesChips(cv) {
    const modules = cv.modules || [];
    if (!modules.length) return "";

    const TYPE_META = {
      workshop: { icon: "fas fa-chalkboard-teacher", color: "cyan" },
      conference: { icon: "fas fa-microphone-lines", color: "cyan" },
      custom: { icon: "fas fa-star", color: "amber" },
    };

    const chips = modules.map((m) => {
      const meta = TYPE_META[m.module_type] || TYPE_META.custom;
      const icon = m.icon || meta.icon;
      const cls = m.module_type === "custom" ? "conv-module-chip--custom" : "";
      const statusDot =
        m.status === "published"
          ? `<span class="conv-mod-status conv-mod-status--on"></span>`
          : m.status === "disabled"
            ? `<span class="conv-mod-status conv-mod-status--off"></span>`
            : `<span class="conv-mod-status conv-mod-status--draft"></span>`;
      return `<button class="conv-module-chip ${cls}"
          onclick="settingsModule.openModuleModal(${cv.id}, ${m.id})"
          title="${this._esc(m.title)} · Clic para editar">
        <i class="${this._esc(icon)}"></i>
        ${this._esc(m.title)}
        ${statusDot}
      </button>`;
    });

    return `<div class="conv-modules-row">
      ${chips.join("")}
      <button class="conv-module-chip conv-module-chip--add"
          onclick="settingsModule.openModuleModal(${cv.id}, null)"
          title="Agregar nuevo módulo a esta convocatoria">
        <i class="fas fa-plus"></i> Módulo
      </button>
    </div>`;
  },

  /* ─────────────────────────────────────────
     MODAL COMPLETO: CREAR / EDITAR MÓDULO
  ───────────────────────────────────────── */
  openModuleModal(convId, moduleId) {
    const cv = this.data.convocatorias.find((c) => c.id == convId);
    if (!cv) return;
    const mod = moduleId
      ? (cv.modules || []).find((m) => m.id == moduleId)
      : null;

    // Quitar modal anterior si existe
    const prev = document.getElementById("modalConvModule");
    if (prev) prev.remove();

    const isNew = !mod;
    const typeOptions = [
      { v: "workshop", label: "Taller", icon: "fas fa-chalkboard-teacher" },
      {
        v: "conference",
        label: "Conferencia / Ponencia",
        icon: "fas fa-microphone-lines",
      },
      {
        v: "custom",
        label: "Módulo personalizado",
        icon: "fas fa-puzzle-piece",
      },
    ];
    const roleOptions = [
      { v: "manager", label: "Responsable" },
      { v: "instructor", label: "Instructor" },
      { v: "speaker", label: "Ponente" },
    ];
    const statusOptions = [
      { v: "draft", label: "Borrador" },
      { v: "published", label: "Publicado" },
      { v: "disabled", label: "Deshabilitado" },
    ];

    const sel = (opts, cur) =>
      opts
        .map(
          (o) =>
            `<option value="${o.v}" ${cur === o.v ? "selected" : ""}>${o.label}</option>`,
        )
        .join("");

    const e = this._esc.bind(this);

    const modal = document.createElement("div");
    modal.id = "modalConvModule";
    modal.className = "modal-overlay hidden";
    modal.style.zIndex = "9100";
    modal.innerHTML = `
      <div class="modal-card modal-card-lg" style="max-width:600px">
        <div class="modal-head">
          <h3>
            <i class="${isNew ? "fas fa-plus-circle" : "fas fa-puzzle-piece"}" style="color:var(--accent)"></i>
            <span id="modModalTitle">${isNew ? "Nuevo módulo" : "Editar: " + e(mod.title)}</span>
          </h3>
          <button class="modal-close-btn" onclick="settingsModule.closeModal('modalConvModule')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" style="max-height:72vh;overflow-y:auto">

          <input type="hidden" id="mmConvId"   value="${convId}">
          <input type="hidden" id="mmModuleId" value="${mod?.id ?? ""}">

          <!-- Tipo + Estado -->
          <div class="settings-form-section">
            <div class="settings-form-section-title"><i class="fas fa-tag"></i> Tipo y estado</div>
            <div class="form-grid-2">
              <div class="form-field">
                <label>Tipo de módulo <span class="required-mark">*</span></label>
                <select class="form-control" id="mmType" onchange="settingsModule._syncModuleTypeDefaults()">
                  ${sel(typeOptions, mod?.module_type || "workshop")}
                </select>
              </div>
              <div class="form-field">
                <label>Estado</label>
                <select class="form-control" id="mmStatus">
                  ${sel(statusOptions, mod?.status || "draft")}
                </select>
              </div>
            </div>
          </div>

          <!-- Info general -->
          <div class="settings-form-section">
            <div class="settings-form-section-title"><i class="fas fa-info-circle"></i> Información general</div>
            <div class="form-grid-2">
              <div class="form-field form-field-full">
                <label>Título <span class="required-mark">*</span></label>
                <input class="form-control" id="mmTitle"
                  placeholder="Ej. Taller de Drones, Conferencia Inaugural"
                  value="${e(mod?.title || "")}">
              </div>
              <div class="form-field form-field-full">
                <label>Descripción</label>
                <textarea class="form-control" id="mmDescription" rows="3"
                  placeholder="Alcance o propósito del módulo">${e(mod?.description || "")}</textarea>
              </div>
              <div class="form-field">
                <label>Ícono FontAwesome</label>
                <input class="form-control" id="mmIcon"
                  placeholder="fas fa-chalkboard-teacher"
                  value="${e(mod?.icon || "")}">
                <small class="field-hint">fas fa-chalkboard-teacher · fas fa-microphone-lines · fas fa-gamepad</small>
              </div>
              <div class="form-field">
                <label>Clave interna</label>
                <input class="form-control" id="mmKey"
                  placeholder="auto (dejar vacío)"
                  value="${e(mod?.module_key || "")}">
              </div>
              <div class="form-field">
                <label>Orden de aparición</label>
                <input class="form-control" type="number" min="0" id="mmSortOrder"
                  value="${mod?.sort_order ?? 0}">
              </div>
            </div>
          </div>

          <!-- Responsable -->
          <div class="settings-form-section">
            <div class="settings-form-section-title"><i class="fas fa-user-tie"></i> Responsable / Profesor / Ponente</div>
            <div class="form-grid-2">
              <div class="form-field">
                <label>Rol</label>
                <select class="form-control" id="mmResponsibleRole">
                  ${sel(roleOptions, mod?.responsible_role || "instructor")}
                </select>
              </div>
              <div class="form-field">
                <label>Nombre completo</label>
                <input class="form-control" id="mmResponsibleName"
                  placeholder="Nombre del profesor / ponente"
                  value="${e(mod?.responsible_name || "")}">
              </div>
              <div class="form-field">
                <label>Correo electrónico</label>
                <input class="form-control" type="email" id="mmResponsibleEmail"
                  placeholder="correo@ejemplo.com"
                  value="${e(mod?.responsible_email || "")}">
              </div>
              <div class="form-field">
                <label>Teléfono</label>
                <input class="form-control" type="tel" id="mmResponsiblePhone"
                  placeholder="10 dígitos"
                  value="${e(mod?.responsible_phone || "")}">
              </div>
              <div class="form-field">
                <label>Usuario interno</label>
                <input class="form-control" id="mmResponsibleUsername"
                  placeholder="usuario del sistema (opcional)"
                  value="${e(mod?.responsible_username || "")}">
              </div>
            </div>
          </div>

          <!-- Config extra -->
          <div class="settings-form-section">
            <div class="settings-form-section-title"><i class="fas fa-code"></i> Configuración extra (JSON)</div>
            <div class="form-field">
              <textarea class="form-control" id="mmConfigJson" rows="3"
                placeholder='{"capacity": 30, "room": "Aula 4", "requiresApproval": true}'
                style="font-family:monospace;font-size:12px">${mod?.config_json ? JSON.stringify(mod.config_json, null, 2) : ""}</textarea>
              <small class="field-hint">Opcional — debe ser JSON válido si se usa.</small>
            </div>
          </div>

        </div>
        <div class="modal-foot" style="justify-content:space-between">
          <div>
            ${
              !isNew
                ? `<button class="btn btn-danger btn-small" onclick="settingsModule.deleteModule(${mod.id}, ${convId})">
              <i class="fas fa-trash"></i> Eliminar módulo
            </button>`
                : ""
            }
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-small" onclick="settingsModule.closeModal('modalConvModule')">Cancelar</button>
            <button class="btn btn-primary" id="mmSaveBtn" onclick="settingsModule.saveModule()">
              <i class="fas fa-save"></i> Guardar
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);
    this.showModal("modalConvModule");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeModal("modalConvModule");
    });

    // Sync defaults on open
    this._syncModuleTypeDefaults();
  },

  _syncModuleTypeDefaults() {
    const type = document.getElementById("mmType")?.value;
    const iconInput = document.getElementById("mmIcon");
    if (!iconInput || iconInput.value) return; // don't overwrite if user already typed something
    const defaults = {
      workshop: "fas fa-chalkboard-teacher",
      conference: "fas fa-microphone-lines",
      custom: "fas fa-star",
    };
    if (defaults[type]) iconInput.value = defaults[type];
  },

  async saveModule() {
    const convId = document.getElementById("mmConvId").value;
    const moduleId = document.getElementById("mmModuleId").value;
    const type = document.getElementById("mmType").value;
    const status = document.getElementById("mmStatus").value;
    const title = document.getElementById("mmTitle").value.trim();
    const desc = document.getElementById("mmDescription").value.trim();
    const icon =
      document.getElementById("mmIcon").value.trim() || "fas fa-star";
    const key = document.getElementById("mmKey").value.trim();
    const sortOrder =
      parseInt(document.getElementById("mmSortOrder").value) || 0;
    const respRole = document.getElementById("mmResponsibleRole").value;
    const respName = document.getElementById("mmResponsibleName").value.trim();
    const respEmail = document
      .getElementById("mmResponsibleEmail")
      .value.trim();
    const respPhone = document
      .getElementById("mmResponsiblePhone")
      .value.trim();
    const respUser = document
      .getElementById("mmResponsibleUsername")
      .value.trim();
    const configRaw = document.getElementById("mmConfigJson").value.trim();

    if (!title)
      return this.toast("El título del módulo es obligatorio", "error");

    let configJson = null;
    if (configRaw) {
      try {
        configJson = JSON.stringify(JSON.parse(configRaw));
      } catch {
        return this.toast("El JSON de configuración no es válido", "error");
      }
    }

    const moduleKey =
      key ||
      `${type}_${title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}_${Date.now()}`;

    const fd = new FormData();
    fd.append("action", "save_convocatoria_module");
    fd.append("convocatoria_id", convId);
    if (moduleId) fd.append("id", moduleId);
    fd.append("module_key", moduleKey);
    fd.append("module_type", type);
    fd.append("title", title);
    fd.append("description", desc);
    fd.append("icon", icon);
    fd.append("status", status);
    fd.append("sort_order", sortOrder);
    fd.append("responsible_role", respRole);
    fd.append("responsible_name", respName);
    fd.append("responsible_email", respEmail);
    fd.append("responsible_phone", respPhone);
    fd.append("responsible_username", respUser);
    if (configJson !== null) fd.append("config_json", configJson);

    const btn = document.getElementById("mmSaveBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error al guardar");
      this.toast(json.message || "Módulo guardado", "success");
      this.closeModal("modalConvModule");
      await this.loadData();
    } catch (e) {
      this.toast("Error: " + e.message, "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
    }
  },

  async deleteModule(moduleId, convId) {
    if (!confirm("¿Eliminar este módulo? Esta acción no se puede deshacer."))
      return;
    const fd = new FormData();
    fd.append("action", "delete_convocatoria_module");
    fd.append("id", moduleId);
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error al eliminar");
      this.toast("Módulo eliminado", "success");
      this.closeModal("modalConvModule");
      await this.loadData();
    } catch (e) {
      this.toast("Error: " + e.message, "error");
    }
  },

  /* ─────────────────────────────────────────
     SIDEBAR DINÁMICO — módulos por convocatoria
  ───────────────────────────────────────── */
  _rebuildDynamicSidebar() {
    const container = document.getElementById("sidebarDynamicModules");
    if (!container) return;

    // Reunir todos los módulos de convocatorias activas sin duplicados por type+key
    const activeConvs = this.data.convocatorias.filter((cv) =>
      parseInt(cv.is_active),
    );
    const sidebarItems = [];
    const seenSections = new Set();

    // Mapeo fijo de module_type a sección HTML ya existente
    const TYPE_SECTION = {
      workshop: { section: "workshops", icon: "fas fa-chalkboard-teacher" },
      conference: { section: "conferences", icon: "fas fa-microphone-lines" },
    };

    activeConvs.forEach((cv) => {
      (cv.modules || []).forEach((m) => {
        if (m.status === "disabled") return;
        const typeMeta = TYPE_SECTION[m.module_type];
        if (typeMeta) {
          // built-in: solo una entrada por tipo
          if (!seenSections.has(m.module_type)) {
            seenSections.add(m.module_type);
            sidebarItems.push({
              section: typeMeta.section,
              icon: m.icon || typeMeta.icon,
              label: m.module_type === "workshop" ? "Talleres" : "Conferencias",
              isBuiltin: true,
            });
          }
        } else {
          // custom: entrada individual con nombre propio
          const uniqueKey = `custom_${m.module_key || m.id}`;
          if (!seenSections.has(uniqueKey)) {
            seenSections.add(uniqueKey);
            sidebarItems.push({
              section: `module-${m.module_key || m.id}`,
              icon: m.icon || "fas fa-star",
              label: m.title,
              moduleKey: m.module_key || String(m.id),
              isBuiltin: false,
            });
          }
        }
      });
    });

    if (!sidebarItems.length) {
      container.innerHTML = "";
      return;
    }

    const btns = sidebarItems
      .map(
        (item) => `
      <button class="menu-nav-btn" data-section-target="${item.section}" type="button">
        <i class="${item.icon}"></i>
        <span>${item.label}</span>
      </button>`,
      )
      .join("");

    container.innerHTML = `
      <div class="sidebar-module" data-module="dynamic-modules">
        <button class="sidebar-module-header" type="button" aria-expanded="true">
          <span class="sidebar-module-label-inner">
            <i class="fas fa-graduation-cap"></i>
            <span>Programa Académico</span>
          </span>
          <i class="fas fa-chevron-down sidebar-chevron"></i>
        </button>
        <div class="sidebar-module-body">${btns}</div>
      </div>`;

    // Rebind navigation
    container.querySelectorAll("[data-section-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.sectionTarget;
        // Para módulos custom que no tienen sección HTML, creamos una placeholder
        if (!document.getElementById(`section-${target}`)) {
          const item = sidebarItems.find((i) => i.section === target);
          this._ensureCustomModuleSection(
            target,
            item?.label || target,
            item?.icon || "fas fa-star",
          );
        }
        if (typeof switchSection === "function") switchSection(target);
      });
    });
  },

  _ensureCustomModuleSection(sectionId, label, icon) {
    const fullId = `section-${sectionId}`;
    if (document.getElementById(fullId)) return;
    const sec = document.createElement("section");
    sec.id = fullId;
    sec.className = "admin-section";
    sec.innerHTML = `
      <div class="section-page-header">
        <div class="section-page-header-text">
          <h2><i class="${icon}"></i> ${label}</h2>
          <p>Módulo personalizado. Edita sus detalles desde la tarjeta de la convocatoria en Configuración General.</p>
        </div>
      </div>
      <div class="content-card" style="padding:24px">
        <p style="color:var(--text-mute);font-size:14px">
          <i class="fas fa-info-circle" style="color:var(--accent)"></i>
          Para editar la información de este módulo, ve a
          <strong>Configuración General → Convocatorias</strong> y da clic en el chip del módulo en la tarjeta correspondiente.
        </p>
      </div>`;
    const main = document.querySelector(".admin-main");
    if (main) main.appendChild(sec);
  },

  /* ─────────────────────────────────────────
     RENDER: ETAPAS
  ───────────────────────────────────────── */
  renderStages() {
    const c = document.getElementById("settingsStagesList");
    if (!c) return;
    if (!this.data.stages.length) {
      c.innerHTML =
        '<div class="empty-state"><i class="fas fa-calendar-alt"></i><h3>Sin etapas</h3><p>Agrega la primera etapa de registro.</p></div>';
      return;
    }
    c.innerHTML = this.data.stages
      .map((s) => {
        const now = new Date();
        const start = new Date(s.start_date);
        const end = new Date(s.end_date);
        const isCurrent = now >= start && now <= end;
        return `
        <div class="stage-item" style="${isCurrent ? "border-color:" + s.color_code + ";box-shadow:0 0 14px " + s.color_code + "33" : ""}">
          <div class="stage-item-info">
            <h4>
              <span class="stage-dot" style="background:${s.color_code}"></span>
              ${this._esc(s.stage_name)}
              ${isCurrent ? '<span class="badge-active" style="font-size:10px">Activa ahora</span>' : ""}
            </h4>
            <p><i class="fas fa-calendar-day"></i> ${this._fmtDate(s.start_date)} → ${this._fmtDate(s.end_date)}</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px">
            <div class="stage-item-price">$${parseFloat(s.price_per_robot).toFixed(2)} <small style="font-size:10px;color:var(--text-mute);font-weight:400">/ robot</small></div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-secondary btn-small" onclick="settingsModule.openStageModal(${s.id})"><i class="fas fa-edit"></i> Editar</button>
              <button class="btn btn-danger btn-small"   onclick="settingsModule.deleteStage(${s.id})"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>`;
      })
      .join("");
  },

  /* ─────────────────────────────────────────
     MODAL: CONVOCATORIA
  ───────────────────────────────────────── */
  openConvModal(id) {
    const cv = id ? this.data.convocatorias.find((c) => c.id == id) : null;
    document.getElementById("convId").value = cv?.id ?? "";
    document.getElementById("convTitulo").value = cv?.titulo ?? "";
    document.getElementById("convTipo").value = cv?.conv_tipo ?? "";
    document.getElementById("convDesc").value = cv?.descripcion ?? "";
    document.getElementById("convActive").value = cv ? (cv.is_active ?? 1) : 1;
    document.getElementById("convPricingMode").value =
      cv?.pricing_mode ?? "fixed";
    document.getElementById("convPrecio").value = cv?.precio_base ?? "";
    document.getElementById("convInscripcionInicio").value =
      this._toDatetimeLocal(cv?.inscripcion_inicio);
    document.getElementById("convInscripcionFin").value = this._toDatetimeLocal(
      cv?.inscripcion_fin,
    );
    document.getElementById("convEventoInicio").value = this._toDatetimeLocal(
      cv?.evento_inicio,
    );
    document.getElementById("convEventoFin").value = this._toDatetimeLocal(
      cv?.evento_fin,
    );
    document.getElementById("convPdfStatus").textContent = cv?.documento_url
      ? "✓ PDF subido"
      : "Sin PDF subido";
    document.getElementById("modalConvTitle").textContent = id
      ? "Editar Convocatoria"
      : "Nueva Convocatoria";
    this.togglePricingMode();

    // Cargar etapas de precio si aplica
    const wrap = document.getElementById("convPriceStages");
    wrap.innerHTML = "";
    if (cv?.pricing_mode === "staged" && cv?.price_stages) {
      let stages = [];
      try {
        stages = JSON.parse(cv.price_stages);
      } catch (e) {}
      stages.forEach((s) => this._addConvPriceStageRow(s));
    }

    // Cargar módulos
    const mods = (() => {
      try {
        return JSON.parse(cv?.included_modules ?? "null") || {};
      } catch (e) {
        return {};
      }
    })();
    // Si es convocatoria nueva, activar congress y robotics por defecto
    const isNew = !id;
    document.getElementById("modCongress").checked = isNew
      ? true
      : (mods.congress ?? true);
    document.getElementById("modRobotics").checked = isNew
      ? true
      : (mods.robotics ?? true);
    document.getElementById("modCamp").checked = isNew
      ? false
      : (mods.camp ?? false);
    // Módulos personalizados
    const customWrap = document.getElementById("convCustomModules");
    customWrap.innerHTML = "";
    (mods.custom ?? []).forEach((m) => this._addCustomModuleRow(m));

    this.showModal("modalConv");
  },

  togglePricingMode() {
    const mode = document.getElementById("convPricingMode").value;
    document.getElementById("convFixedBlock").style.display =
      mode === "fixed" ? "" : "none";
    document.getElementById("convStagedBlock").style.display =
      mode === "staged" ? "" : "none";
  },

  addConvPriceStage() {
    this._addConvPriceStageRow({});
  },

  _addConvPriceStageRow(st = {}) {
    const wrap = document.getElementById("convPriceStages");
    const div = document.createElement("div");
    div.className = "price-stage-row";
    div.innerHTML = `
      <div class="form-field">
        <label style="font-size:11px">Inicio</label>
        <input class="form-control" type="date" value="${(st.start || "").substring(0, 10)}" data-role="ps-start">
      </div>
      <div class="form-field">
        <label style="font-size:11px">Fin</label>
        <input class="form-control" type="date" value="${(st.end || "").substring(0, 10)}" data-role="ps-end">
      </div>
      <div class="form-field">
        <label style="font-size:11px">Precio (MXN)</label>
        <input class="form-control" type="number" min="0" step="0.01" value="${st.price || ""}" placeholder="400.00" data-role="ps-price">
      </div>
      <button type="button" class="btn btn-danger btn-small" style="align-self:flex-end" onclick="this.closest('.price-stage-row').remove()"><i class="fas fa-times"></i></button>`;
    wrap.appendChild(div);
  },

  async saveConv() {
    const id = document.getElementById("convId").value;
    const mode = document.getElementById("convPricingMode").value;

    let price_stages = null;
    let precio_base = 0;

    if (mode === "fixed") {
      precio_base = parseFloat(document.getElementById("convPrecio").value);
      if (isNaN(precio_base))
        return this.toast("Ingresa un precio válido", "error");
    } else {
      const rows = document.querySelectorAll(
        "#convPriceStages .price-stage-row",
      );
      const stages = [];
      for (const row of rows) {
        const start = row.querySelector('[data-role="ps-start"]').value;
        const end = row.querySelector('[data-role="ps-end"]').value;
        const price = parseFloat(
          row.querySelector('[data-role="ps-price"]').value,
        );
        if (!start || !end || isNaN(price))
          return this.toast(
            "Completa todas las filas de etapas de precio",
            "error",
          );
        stages.push({ start, end, price });
      }
      price_stages = JSON.stringify(stages);
      precio_base = stages[0]?.price || 0;
    }

    const payload = {
      titulo: document.getElementById("convTitulo").value.trim(),
      conv_tipo: document.getElementById("convTipo").value.trim(),
      descripcion: document.getElementById("convDesc").value.trim(),
      precio_base,
      is_active: document.getElementById("convActive").value,
      pricing_mode: mode,
      price_stages,
      inscripcion_inicio:
        document.getElementById("convInscripcionInicio").value || null,
      inscripcion_fin:
        document.getElementById("convInscripcionFin").value || null,
      evento_inicio: document.getElementById("convEventoInicio").value || null,
      evento_fin: document.getElementById("convEventoFin").value || null,
    };

    // Recopilar módulos incluidos
    const includedModules = {
      congress: document.getElementById("modCongress")?.checked ?? true,
      robotics: document.getElementById("modRobotics")?.checked ?? true,
      camp: document.getElementById("modCamp")?.checked ?? false,
      custom: [],
    };
    document
      .querySelectorAll("#convCustomModules .custom-module-row")
      .forEach((row) => {
        const key = row.dataset.key || "";
        const label =
          row.querySelector('[data-role="cm-label"]')?.value.trim() || "";
        const icon =
          row.querySelector('[data-role="cm-icon"]')?.value.trim() || "fa-star";
        const desc =
          row.querySelector('[data-role="cm-desc"]')?.value.trim() || "";
        const price =
          parseFloat(row.querySelector('[data-role="cm-price"]')?.value) || 0;
        const priceLabel =
          row.querySelector('[data-role="cm-price-label"]')?.value.trim() ||
          "MXN por persona";
        if (label)
          includedModules.custom.push({
            key: key || label.toLowerCase().replace(/\s+/g, "-"),
            label,
            icon,
            desc,
            price,
            priceLabel,
          });
      });
    payload.included_modules = JSON.stringify(includedModules);

    if (!payload.titulo) return this.toast("El título es obligatorio", "error");

    // Validar coherencia de fechas si se ingresaron
    if (payload.inscripcion_inicio && payload.inscripcion_fin) {
      if (
        new Date(payload.inscripcion_inicio) >=
        new Date(payload.inscripcion_fin)
      )
        return this.toast(
          "El inicio de inscripciones debe ser antes del cierre",
          "error",
        );
    }
    if (payload.evento_inicio && payload.evento_fin) {
      if (new Date(payload.evento_inicio) >= new Date(payload.evento_fin))
        return this.toast(
          "El inicio del evento debe ser antes del fin",
          "error",
        );
    }

    if (id) {
      payload.id = id;
      await this.postUpdate("update_convocatoria", payload);
    } else {
      await this.postUpdate("add_convocatoria", payload);
    }
    this.closeModal("modalConv");
  },

  /* ─────────────────────────────────────────
     ELIMINAR CONVOCATORIA (flujo con backup)
  ───────────────────────────────────────── */
  async startDeleteConv(id) {
    this._pendingDeleteConvId = id;
    try {
      const res = await fetch(
        `/app/api/admin-settings.php?action=conv_records_count&id=${id}`,
      );
      const json = await res.json();
      const count = json.count || 0;
      this._pendingDeleteHasRecords = count > 0;
      document.getElementById("deleteConvCount").textContent = count;
      document.getElementById("backupConfirmCheck").checked = false;
      document.getElementById("deleteConvPassword").value = "";
      document.getElementById("deleteConvFinalBtn").disabled = true;
      document.getElementById("deleteConvAuthStep").style.display = "none";
      document.getElementById("deleteConvWarning").innerHTML =
        count > 0
          ? `Esta convocatoria tiene registros de inscripción. Se eliminarán <strong>${count}</strong> registros permanentemente.`
          : "Esta convocatoria no tiene registros. Se eliminará de forma segura.";
      this.showModal("modalDeleteConv");
    } catch (e) {
      this.toast("Error verificando registros", "error");
    }
  },

  toggleDeleteConfirm() {
    const checked = document.getElementById("backupConfirmCheck").checked;
    document.getElementById("deleteConvAuthStep").style.display = checked
      ? ""
      : "none";
    document.getElementById("deleteConvFinalBtn").disabled = !checked;
  },

  downloadConvBackup() {
    const id = this._pendingDeleteConvId;
    if (!id) return;
    window.open(
      `/app/api/admin-settings.php?action=backup_conv&id=${id}`,
      "_blank",
    );
  },

  async confirmDeleteConv() {
    const id = this._pendingDeleteConvId;
    const pwd = document.getElementById("deleteConvPassword").value;
    if (!pwd) return this.toast("Ingresa tu contraseña", "error");
    await this.postUpdate("delete_convocatoria", { id, admin_password: pwd });
    this.closeModal("modalDeleteConv");
  },

  /* ─────────────────────────────────────────
     MODAL: ETAPA
  ───────────────────────────────────────── */
  openStageModal(id) {
    const isEdit = !!id;
    document.getElementById("modalStageTitle").textContent = isEdit
      ? "Editar Etapa"
      : "Nueva Etapa";
    document.getElementById("stageId").value = id || "";
    if (isEdit) {
      const s = this.data.stages.find((x) => x.id == id);
      if (!s) return;
      document.getElementById("stageName").value = s.stage_name || "";
      document.getElementById("stageStart").value = this._toDatetimeLocal(
        s.start_date,
      );
      document.getElementById("stageEnd").value = this._toDatetimeLocal(
        s.end_date,
      );
      document.getElementById("stagePrice").value = s.price_per_robot || "";
      document.getElementById("stageColor").value = s.color_code || "#10b981";
      document.getElementById("stageActive").value = s.is_active ?? 1;
    } else {
      ["stageName", "stageStart", "stageEnd", "stagePrice"].forEach(
        (id) => (document.getElementById(id).value = ""),
      );
      document.getElementById("stageColor").value = "#10b981";
      document.getElementById("stageActive").value = 1;
    }
    this.showModal("modalStage");
  },

  async saveStage() {
    const id = document.getElementById("stageId").value;
    const name = document.getElementById("stageName").value.trim();
    const start = document.getElementById("stageStart").value;
    const end = document.getElementById("stageEnd").value;
    const price = parseFloat(document.getElementById("stagePrice").value);
    const color = document.getElementById("stageColor").value;

    if (!name || !start || !end || isNaN(price))
      return this.toast("Completa todos los campos requeridos", "error");
    if (new Date(start) >= new Date(end))
      return this.toast("La fecha de inicio debe ser anterior al fin", "error");

    const payload = {
      stage_name: name,
      start_date: start.replace("T", " ") + ":00",
      end_date: end.replace("T", " ") + ":00",
      price_per_robot: price,
      color_code: color,
      is_active: document.getElementById("stageActive").value,
    };
    if (id) {
      payload.id = id;
      await this.postUpdate("update_stage", payload);
    } else {
      await this.postUpdate("add_stage", payload);
    }
    this.closeModal("modalStage");
  },

  addCustomModule() {
    this._addCustomModuleRow({});
  },

  _addCustomModuleRow(m = {}) {
    const wrap = document.getElementById("convCustomModules");
    const div = document.createElement("div");
    div.className = "custom-module-row";
    div.dataset.key = m.key || "";
    div.innerHTML = `
      <div class="custom-module-fields">
        <div class="form-field">
          <label style="font-size:11px">Nombre <span class="required-mark">*</span></label>
          <input class="form-control" data-role="cm-label" placeholder="Ej. Torneo de Videojuegos" value="${(m.label || "").replace(/"/g, "&quot;")}">
        </div>
        <div class="form-field">
          <label style="font-size:11px">Ícono FontAwesome</label>
          <input class="form-control" data-role="cm-icon" placeholder="fa-gamepad" value="${(m.icon || "fa-star").replace(/"/g, "&quot;")}">
        </div>
        <div class="form-field">
          <label style="font-size:11px">Descripción breve</label>
          <input class="form-control" data-role="cm-desc" placeholder="Compite en los mejores títulos" value="${(m.desc || "").replace(/"/g, "&quot;")}">
        </div>
        <div class="form-field">
          <label style="font-size:11px">Precio (MXN)</label>
          <input class="form-control" type="number" min="0" step="0.01" data-role="cm-price" placeholder="150.00" value="${m.price || ""}">
        </div>
        <div class="form-field">
          <label style="font-size:11px">Etiqueta de precio</label>
          <input class="form-control" data-role="cm-price-label" placeholder="MXN por persona" value="${(m.priceLabel || "MXN por persona").replace(/"/g, "&quot;")}">
        </div>
      </div>
      <button type="button" class="btn btn-danger btn-small" style="align-self:flex-start;margin-top:22px" onclick="this.closest('.custom-module-row').remove()"><i class="fas fa-times"></i></button>`;
    wrap.appendChild(div);
  },

  async deleteStage(id) {
    if (!confirm("¿Eliminar esta etapa de registro?")) return;
    await this.postUpdate("delete_stage", { id });
  },

  /* ─────────────────────────────────────────
     LIMPIAR BD
  ───────────────────────────────────────── */
  confirmCleanDB() {
    document.getElementById("cleandbCheck").checked = false;
    document.getElementById("cleandbPassword").value = "";
    document.getElementById("cleandbFinalBtn").disabled = true;
    document.getElementById("cleandbAuthStep").style.display = "none";
    this.showModal("modalCleanDB");
  },

  toggleCleanConfirm() {
    const checked = document.getElementById("cleandbCheck").checked;
    document.getElementById("cleandbAuthStep").style.display = checked
      ? ""
      : "none";
    document.getElementById("cleandbFinalBtn").disabled = !checked;
  },

  downloadFullBackup() {
    window.open("/app/api/admin-settings.php?action=backup_full", "_blank");
  },

  async executeCleanDB() {
    const pwd = document.getElementById("cleandbPassword").value;
    if (!pwd) return this.toast("Ingresa tu contraseña", "error");
    await this.postUpdate("clean_database", { admin_password: pwd });
    this.closeModal("modalCleanDB");
  },

  /* ─────────────────────────────────────────
     PDF UPLOAD
  ───────────────────────────────────────── */
  pickDoc(type, refId) {
    if (type === "convocatoria" && refId === "__convId__")
      refId = document.getElementById("convId").value;
    if (type === "category" && refId === "__catId__")
      refId = document.getElementById("catId").value;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf,.doc,.docx";
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("action", "upload_document");
      fd.append("doc_type", type);
      fd.append("ref_id", refId);
      fd.append("document", file);
      this.toast("Subiendo PDF...", "info");
      try {
        const res = await fetch("/app/api/admin-settings.php", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (json.success) {
          this.toast("PDF subido correctamente", "success");
          const statusEl =
            type === "convocatoria"
              ? document.getElementById("convPdfStatus")
              : document.getElementById("catPdfStatus");
          if (statusEl) statusEl.textContent = "✓ PDF subido";
          this.loadData();
        } else {
          this.toast("Error: " + json.error, "error");
        }
      } catch (err) {
        this.toast("Error de conexión al subir", "error");
      }
    };
    fileInput.click();
  },

  /* ─────────────────────────────────────────
     POST HELPER
  ───────────────────────────────────────── */
  async postUpdate(action, payload) {
    const fd = new FormData();
    fd.append("action", action);
    for (const k in payload) {
      if (payload[k] !== null && payload[k] !== undefined)
        fd.append(k, payload[k]);
    }
    this.toast("Guardando...", "info");
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        this.toast(json.message || "Guardado correctamente", "success");
        await this.loadData();
      } else {
        this.toast("Error: " + json.error, "error");
      }
    } catch (e) {
      this.toast("Error de conexión", "error");
    }
  },

  /* ─────────────────────────────────────────
     MODAL HELPERS
  ───────────────────────────────────────── */
  showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
    requestAnimationFrame(() => el.classList.add("show"));
    el.addEventListener(
      "click",
      (e) => {
        if (e.target === el) this.closeModal(id);
      },
      { once: true },
    );
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("show");
    setTimeout(() => el.classList.add("hidden"), 200);
  },

  /* ─────────────────────────────────────────
     UTILITIES
  ───────────────────────────────────────── */
  toast(msg, type) {
    if (typeof setGlobalStatus === "function") setGlobalStatus(msg, type);
    else console.log(`[${type}] ${msg}`);
  },

  _esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  _fmtDate(d) {
    if (!d || String(d).startsWith("0000")) return "—";
    const dt = new Date(String(d).replace(" ", "T"));
    if (isNaN(dt)) return d;
    return dt.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  },

  _toDatetimeLocal(d) {
    if (!d || String(d).startsWith("0000")) return "";
    const dt = new Date(String(d).replace(" ", "T"));
    if (isNaN(dt)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  },

  // ══════════════════════════════════════════════════════════════
  // CATEGORÍAS DEL TORNEO
  // ══════════════════════════════════════════════════════════════

  renderCategories() {
    const container = document.getElementById("settingsCategoriesList");
    if (!container) return;
    const cats = (this.data.categories || []).sort(
      (a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0),
    );
    if (!cats.length) {
      container.innerHTML =
        '<p style="color:var(--text-mute);padding:16px">No hay categorías. Crea la primera con el botón de arriba.</p>';
      return;
    }
    container.innerHTML = cats
      .map((c) => {
        const pdfLink = c.documento_reglamento_url
          ? `<a href="${this._esc(c.documento_reglamento_url)}" target="_blank" class="btn btn-secondary btn-small" style="margin-right:4px"><i class="fas fa-file-pdf"></i> Ver PDF</a>`
          : `<span style="font-size:12px;color:var(--text-mute);margin-right:8px"><i class="fas fa-exclamation-triangle"></i> Sin PDF</span>`;
        const rcBadge = parseInt(c.is_remote_controlled)
          ? `<span style="background:#f59e0b22;color:#f59e0b;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">RC</span>`
          : "";
        const tagBadge = c.tag
          ? `<span style="background:var(--bg-card2,#2a2a3a);color:var(--text-mute);padding:2px 8px;border-radius:99px;font-size:11px">${this._esc(c.tag)}</span>`
          : "";
        return `<div class="stage-item" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:22px;min-width:30px;text-align:center;color:var(--accent,#22d3ee)"><i class="${this._esc(c.icon_type || "fas fa-flag")}"></i></span>
        <div style="flex:1;min-width:180px">
          <div style="font-weight:700;font-size:14px">${this._esc(c.category_name)}
            <span style="background:var(--accent,#22d3ee);color:#000;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:800;margin-left:6px">${this._esc(c.weight_label || c.max_weight || "")}</span>
            ${rcBadge} ${tagBadge}
          </div>
          <div style="font-size:12px;color:var(--text-mute);margin-top:2px">${this._esc(c.description || "—")}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          ${pdfLink}
          <button class="btn btn-secondary btn-small" onclick="settingsModule.openCategoryModal(${c.id})"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn btn-danger btn-small" onclick="settingsModule.deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
      })
      .join("");
  },

  openCategoryModal(id) {
    const cat = id
      ? (this.data.categories || []).find((c) => c.id == id)
      : null;
    document.getElementById("modalCategoryTitle").textContent = cat
      ? "Editar Categoría"
      : "Nueva Categoría";
    document.getElementById("catId").value = cat ? cat.id : "";
    document.getElementById("catName").value = cat
      ? cat.category_name || ""
      : "";
    document.getElementById("catCode").value = cat
      ? cat.category_code || ""
      : "";
    document.getElementById("catWeightLabel").value = cat
      ? cat.weight_label || ""
      : "";
    document.getElementById("catMaxWeight").value = cat
      ? cat.max_weight || ""
      : "";
    document.getElementById("catIconType").value = cat
      ? cat.icon_type || "fas fa-flag"
      : "fas fa-flag";
    document.getElementById("catIsRC").checked = cat
      ? !!parseInt(cat.is_remote_controlled)
      : false;
    document.getElementById("catDescription").value = cat
      ? cat.description || ""
      : "";
    document.getElementById("catTag").value = cat ? cat.tag || "" : "";
    document.getElementById("catSortOrder").value = cat
      ? cat.sort_order || 0
      : 0;
    document.getElementById("catPdfFile").value = "";
    const pdfDiv = document.getElementById("catPdfCurrent");
    if (cat && cat.documento_reglamento_url) {
      pdfDiv.innerHTML = `<a href="${this._esc(cat.documento_reglamento_url)}" target="_blank" style="color:var(--accent,#22d3ee)"><i class="fas fa-file-pdf"></i> ${this._esc(cat.documento_reglamento_url.split("/").pop())}</a>`;
    } else {
      pdfDiv.textContent = "Sin reglamento subido";
    }
    document.getElementById("catPdfWrap").style.display = id ? "" : "none";
    document.getElementById("modalCategory").style.display = "flex";
  },

  async saveCategory() {
    const id = document.getElementById("catId").value;
    const name = document.getElementById("catName").value.trim();
    const code = document.getElementById("catCode").value.trim();
    if (!name || !code) {
      alert("Nombre y código son obligatorios.");
      return;
    }

    const payload = {
      id: id || undefined,
      category_name: name,
      category_code: code,
      weight_label: document.getElementById("catWeightLabel").value.trim(),
      max_weight: document.getElementById("catMaxWeight").value.trim(),
      icon_type:
        document.getElementById("catIconType").value.trim() || "fas fa-flag",
      is_remote_controlled: document.getElementById("catIsRC").checked ? 1 : 0,
      description: document.getElementById("catDescription").value.trim(),
      tag: document.getElementById("catTag").value.trim(),
      sort_order: parseInt(document.getElementById("catSortOrder").value) || 0,
    };

    const btn = document.getElementById("catSaveBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
      const action = id ? "update_category" : "add_category";
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      }).then((r) => r.json());

      if (!res.success) throw new Error(res.error || res.message);

      // Subir PDF si se seleccionó uno (solo en edición o tras crear)
      const pdfFile = document.getElementById("catPdfFile").files[0];
      const finalId = id || res.id;
      if (pdfFile && finalId) {
        const fd = new FormData();
        fd.append("action", "upload_reglamento_categoria");
        fd.append("category_id", finalId);
        fd.append("document", pdfFile);
        const pdfRes = await fetch(
          "/app/api/admin-settings.php?action=upload_reglamento_categoria",
          {
            method: "POST",
            body: fd,
          },
        ).then((r) => r.json());
        if (!pdfRes.success)
          throw new Error(
            "Categoría guardada pero el PDF falló: " + (pdfRes.error || ""),
          );
      }

      this.closeModal("modalCategory");
      const full = await fetch(
        "/app/api/admin-settings.php?action=get_all",
      ).then((r) => r.json());
      if (full.success) {
        this.data.categories = full.data.categories || [];
        this.renderCategories();
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
    }
  },

  async deleteCategory(id) {
    if (
      !confirm(
        "¿Eliminar esta categoría? Se borrará de todas las vistas del usuario.",
      )
    )
      return;
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_category", id }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error || res.message);
      this.data.categories = (this.data.categories || []).filter(
        (c) => c.id != id,
      );
      this.renderCategories();
    } catch (e) {
      alert("Error: " + e.message);
    }
  },
};
