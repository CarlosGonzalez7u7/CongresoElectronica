/**
 * settingsModule — Configuración Dinámica del Sistema
 * Versión 3.0 — tipo de evento libre, fechas completas con horario
 */
const settingsModule = {
  data: { convocatorias: [], stages: [], categories: [] },
  _pendingDeleteConvId: null,
  _pendingDeleteHasRecords: false,
  _initialized: false,
  _backupArchiveItems: [],

  /* ─────────────────────────────────────────
     INIT & DATA LOAD
  ───────────────────────────────────────── */
  init() {
    if (this._initialized) {
      this.moveSystemTools();
      this.applyCredentialProviderState();
      this.bindBackupArchiveActions();
      return;
    }
    this._initialized = true;
    this.moveSystemTools();
    this.applyCredentialProviderState();
    this.bindBackupArchiveActions();
    this.loadData();
    this.loadBackupArchive();
  },

  isGoogleAdminSession() {
    const user =
      typeof currentUser !== "undefined" && currentUser
        ? currentUser
        : window.currentUser || {};
    const provider = String(user.auth_provider || "").toLowerCase();
    return provider === "google";
  },

  moveSystemTools() {
    const target = document.getElementById("settingsSystemTools");
    if (!target || target.dataset.moved === "1") return;

    const passwordCard = document.querySelector(".security-pw-card");
    const backupCard = document.querySelector(".backup-card");
    target.innerHTML = "";
    if (passwordCard) target.appendChild(passwordCard);
    if (backupCard) target.appendChild(backupCard);
    target.dataset.moved = "1";
  },

  applyCredentialProviderState() {
    const isGoogle = this.isGoogleAdminSession();
    const note = document.getElementById("googleCredentialsNote");
    const form = document.getElementById("changePasswordForm");
    if (note) note.classList.toggle("visible", isGoogle);
    if (!form) return;
    form.classList.toggle("is-google-locked", isGoogle);
    form.querySelectorAll("input, button[type='submit']").forEach((el) => {
      el.disabled = isGoogle;
      if (isGoogle) {
        el.setAttribute("aria-disabled", "true");
      } else {
        el.removeAttribute("aria-disabled");
      }
    });
  },

  bindBackupArchiveActions() {
    const refreshBtn = document.getElementById("backupRefreshBtn");
    if (refreshBtn && refreshBtn.dataset.bound !== "1") {
      refreshBtn.dataset.bound = "1";
      refreshBtn.addEventListener("click", () => this.loadBackupArchive());
    }

    const restoreBtn = document.getElementById("backupRestoreBtn");
    if (restoreBtn && restoreBtn.dataset.bound !== "1") {
      restoreBtn.dataset.bound = "1";
      restoreBtn.addEventListener("click", () => this.restoreSelectedBackup());
    }

    const searchInput = document.getElementById("backupSearchInput");
    if (searchInput && searchInput.dataset.bound !== "1") {
      searchInput.dataset.bound = "1";
      searchInput.addEventListener("input", () =>
        this.renderBackupArchive(this._backupArchiveItems || []),
      );
    }

    const importBtn = document.getElementById("backupImportBtn");
    const importInput = document.getElementById("backupImportInput");
    if (importBtn && importInput && importBtn.dataset.bound !== "1") {
      importBtn.dataset.bound = "1";
      importBtn.addEventListener("click", () => this.importBackupFile());
      importInput.addEventListener("change", () =>
        this.handleBackupImportFile(importInput.files?.[0] || null),
      );
    }
  },

  async loadData() {
    try {
      const res = await fetch("/app/api/admin-settings.php?action=get_all", {
        credentials: "include",
      });
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

  openSystemTab() {
    this.switchTab("system", document.querySelector('[data-tab="system"]'));
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
     SIDEBAR DINÁMICO — módulos por convocatoria
  ───────────────────────────────────────── */
  _rebuildDynamicSidebar() {
    const container = document.getElementById("sidebarDynamicModules");
    if (!container) return;

    // Reunir módulos editables de la convocatoria activa.
    const activeConv = this.data.convocatorias.find((cv) =>
      parseInt(cv.is_active, 10),
    );
    const sidebarItems = [];
    const seenKeys = new Set();

    if (
      activeConv &&
      Array.isArray(activeConv.modules) &&
      activeConv.modules.length
    ) {
      activeConv.modules.forEach((moduleRow) => {
        const moduleType = String(
          moduleRow.module_type || "custom",
        ).toLowerCase();
        const moduleKey = String(
          moduleRow.module_key || moduleRow.key || moduleRow.id || "",
        ).trim();
        const fallbackLabel =
          moduleType === "workshop"
            ? "Talleres"
            : moduleType === "conference"
              ? "Conferencias"
              : "Módulo personalizado";
        const label =
          String(moduleRow.title || moduleRow.label || fallbackLabel).trim() ||
          fallbackLabel;
        const key =
          moduleKey ||
          `${moduleType}_${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        sidebarItems.push({
          id: moduleRow.id || null,
          convocatoria_id: moduleRow.convocatoria_id || activeConv.id,
          module_key: moduleRow.module_key || key,
          module_type:
            moduleType === "workshop"
              ? "workshop"
              : moduleType === "conference"
                ? "conference"
                : "custom",
          title: label,
          description: moduleRow.description || "",
          icon:
            moduleRow.icon ||
            (moduleType === "workshop"
              ? "fas fa-chalkboard-teacher"
              : moduleType === "conference"
                ? "fas fa-microphone-lines"
                : "fas fa-star"),
          status: moduleRow.status || "draft",
          sort_order: moduleRow.sort_order || 0,
          responsible_name: moduleRow.responsible_name || "",
          responsible_email: moduleRow.responsible_email || "",
          responsible_phone: moduleRow.responsible_phone || "",
          responsible_username: moduleRow.responsible_username || "",
          responsible_role: moduleRow.responsible_role || "",
          config_json: moduleRow.config_json || {},
          isBuiltin: moduleType === "workshop" || moduleType === "conference",
        });
      });
    } else {
      // Fallback para convocatorias antiguas que solo usan included_modules.
      const seenCustom = new Set();
      try {
        const mods = JSON.parse(activeConv?.included_modules || "{}");
        if (mods.workshops || mods.congress) {
          sidebarItems.push({
            convocatoria_id: activeConv?.id || null,
            module_key: "workshops",
            module_type: "workshop",
            title: "Talleres",
            description: "Configuración general de talleres.",
            icon: "fas fa-chalkboard-teacher",
            status: "draft",
            sort_order: 0,
            config_json: {},
            isBuiltin: true,
          });
        }
        if (mods.conferences || mods.congress) {
          sidebarItems.push({
            convocatoria_id: activeConv?.id || null,
            module_key: "conferences",
            module_type: "conference",
            title: "Conferencias",
            description: "Configuración general de conferencias.",
            icon: "fas fa-microphone-lines",
            status: "draft",
            sort_order: 0,
            config_json: {},
            isBuiltin: true,
          });
        }
        (mods.custom || []).forEach((c) => {
          const key = String(c.key || c.name || c.label || "").trim();
          const label = String(
            c.label || c.name || key || "Módulo personalizado",
          ).trim();
          if (!key || seenCustom.has(key)) return;
          seenCustom.add(key);
          sidebarItems.push({
            convocatoria_id: activeConv?.id || null,
            module_key: key,
            module_type: "custom",
            title: label,
            description: c.description || "",
            icon: c.icon || "fas fa-star",
            status: c.status || "draft",
            sort_order: 0,
            config_json: c.config_json || {},
            isBuiltin: false,
          });
        });
      } catch (e) {}
    }

    const visibleSidebarItems = sidebarItems.filter(
      (item) =>
        item.module_type !== "workshop" && item.module_type !== "conference",
    );

    if (!visibleSidebarItems.length) {
      container.innerHTML = "";
      return;
    }

    this._sidebarModuleItems = visibleSidebarItems;

    const btns = visibleSidebarItems
      .map(
        (item, index) => `
      <button class="menu-nav-btn" data-module-index="${index}" type="button">
        <i class="${item.icon}"></i>
        <span>${item.title}</span>
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
    container.querySelectorAll("[data-module-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.moduleIndex, 10);
        const item = this._sidebarModuleItems?.[index];
        if (!item) return;
        if (
          item.module_type === "workshop" &&
          typeof switchSection === "function"
        ) {
          switchSection("workshops");
        } else if (
          item.module_type === "conference" &&
          typeof switchSection === "function"
        ) {
          switchSection("conferences");
        } else {
          if (
            typeof customModulesManager !== "undefined" &&
            typeof switchSection === "function"
          ) {
            customModulesManager.loadModule(item);
            switchSection("custom-modules");
          } else if (typeof window.openModuleConfigModal === "function") {
            window.openModuleConfigModal(item);
          }
        }
      });
    });
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
        { credentials: "include" },
      );
      const json = await res.json();
      const count = json.count || 0;
      this._pendingDeleteHasRecords = count > 0;
      document.getElementById("deleteConvCount").textContent = count;
      document.getElementById("backupConfirmCheck").checked = false;
      document.getElementById("deleteConvPassword").value = "";
      document.getElementById("deleteConvPassword").required = false;
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
    document.getElementById("deleteConvPassword").required =
      checked && !this.isGoogleAdminSession();
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
    if (!pwd && !this.isGoogleAdminSession()) {
      return this.toast("Ingresa tu contrasena", "error");
    }
    const humanOk = await window.requestHumanCaptcha(
      "Verificacion para eliminar",
      "Confirma que eres una persona antes de eliminar esta convocatoria.",
    );
    if (!humanOk) return this.toast("Eliminacion cancelada", "info");
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
    document.getElementById("cleandbPassword").required = false;
    this.showModal("modalCleanDB");
  },

  toggleCleanConfirm() {
    const checked = document.getElementById("cleandbCheck").checked;
    document.getElementById("cleandbAuthStep").style.display = checked
      ? ""
      : "none";
    document.getElementById("cleandbFinalBtn").disabled = !checked;
    document.getElementById("cleandbPassword").required =
      checked && !this.isGoogleAdminSession();
  },

  downloadFullBackup() {
    window.open("/app/api/admin-settings.php?action=backup_full", "_blank");
  },

  async executeCleanDB() {
    const pwd = document.getElementById("cleandbPassword").value;
    if (!pwd && !this.isGoogleAdminSession()) {
      return this.toast("Ingresa tu contrasena", "error");
    }
    const humanOk = await window.requestHumanCaptcha(
      "Verificacion para limpiar",
      "Confirma que eres una persona antes de limpiar la base de datos.",
    );
    if (!humanOk) return this.toast("Limpieza cancelada", "info");
    await this.postUpdate("clean_database", {
      admin_password: pwd,
      archive_year: new Date().getFullYear(),
    });
    this.closeModal("modalCleanDB");
    await this.loadBackupArchive();
  },

  async loadBackupArchive() {
    const container = document.getElementById("backupHistory");
    if (!container) return;
    container.innerHTML =
      '<p style="font-size:0.75rem;color:var(--text-mute);margin-top:6px;">Cargando archivero...</p>';
    try {
      const res = await fetch("/app/api/admin-settings.php?action=list_backups", {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "No se pudo cargar");
      this._backupArchiveItems = json.data || [];
      this.renderBackupArchive(this._backupArchiveItems);
    } catch (error) {
      container.innerHTML =
        '<p style="font-size:0.75rem;color:var(--rose);margin-top:6px;">No se pudo cargar el archivero.</p>';
    }
  },

  renderBackupArchive(items) {
    const container = document.getElementById("backupHistory");
    const restoreBtn = document.getElementById("backupRestoreBtn");
    if (!container) return;
    const query = (
      document.getElementById("backupSearchInput")?.value || ""
    )
      .trim()
      .toLowerCase();
    const filtered = query
      ? items.filter((entry) =>
          `${entry.filename || ""} ${entry.label || ""} ${entry.created_at || ""} ${entry.size || ""}`
            .toLowerCase()
            .includes(query),
        )
      : items;
    if (restoreBtn) {
      restoreBtn.disabled = true;
      restoreBtn.dataset.filename = "";
    }
    if (!items.length) {
      container.innerHTML =
        '<p style="font-size:0.75rem;color:var(--text-mute);margin-top:6px;">Sin respaldos guardados en servidor.</p>';
      return;
    }
    if (!filtered.length) {
      container.innerHTML =
        '<p style="font-size:0.75rem;color:var(--text-mute);margin-top:6px;">No hay respaldos que coincidan con la busqueda.</p>';
      return;
    }
    container.innerHTML = filtered
      .map(
        (entry) => `
      <div class="backup-history-item" data-backup-file="${this._esc(entry.filename)}">
        <span class="backup-main">
          <i class="fas fa-file-zipper" style="color:var(--green);"></i>
          <span>
            <strong>${this._esc(entry.label || entry.filename)}</strong>
            <small>${this._esc(entry.filename)}</small>
          </span>
        </span>
        <span class="backup-ts">${this._esc(entry.created_at || "")}</span>
        <span class="backup-size">${this._esc(entry.size || "")}</span>
        <span class="backup-row-actions">
          <button class="btn btn-secondary btn-small" type="button" data-download-backup="${this._esc(entry.filename)}" title="Descargar respaldo">
            <i class="fas fa-download"></i>
          </button>
          <button class="btn btn-danger btn-small" type="button" data-delete-backup="${this._esc(entry.filename)}" title="Eliminar respaldo">
            <i class="fas fa-trash"></i>
          </button>
        </span>
      </div>`,
      )
      .join("");

    container.querySelectorAll("[data-backup-file]").forEach((row) => {
      row.addEventListener("click", (event) => {
        if (
          event.target.closest("[data-download-backup]") ||
          event.target.closest("[data-delete-backup]")
        )
          return;
        container
          .querySelectorAll(".backup-history-item")
          .forEach((item) => item.classList.remove("is-selected"));
        row.classList.add("is-selected");
        if (restoreBtn) {
          restoreBtn.disabled = false;
          restoreBtn.dataset.filename = row.dataset.backupFile || "";
        }
      });
    });

    container.querySelectorAll("[data-download-backup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const filename = encodeURIComponent(btn.dataset.downloadBackup || "");
        if (!filename) return;
        const ok = await window.customConfirm(
          "Descargaras un respaldo con datos del sistema. Guardalo solo en un lugar seguro.",
          "Descargar respaldo",
        );
        if (!ok) return;
        const humanOk = await window.requestHumanCaptcha(
          "Verificacion para descargar",
          "Confirma que eres una persona antes de descargar el respaldo.",
        );
        if (!humanOk) return this.toast("Descarga cancelada", "info");
        if (filename) {
          window.open(
            `/app/api/admin-settings.php?action=download_backup&file=${filename}`,
            "_blank",
          );
        }
      });
    });

    container.querySelectorAll("[data-delete-backup]").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.deleteBackup(btn.dataset.deleteBackup || ""),
      );
    });
  },

  async getCriticalAdminPassword(title, message) {
    if (this.isGoogleAdminSession()) return "";
    return await window.customInputModal({
      title,
      message,
      label: "Tu contrasena de administrador",
      type: "password",
      required: true,
      confirmText: "Autorizar",
      icon: "fa-user-shield",
      danger: true,
    });
  },

  async restoreSelectedBackup() {
    const btn = document.getElementById("backupRestoreBtn");
    const filename = btn?.dataset.filename || "";
    if (!filename) return;
    const ok = await window.customConfirm(
      `Restaurar "${filename}" reemplazara los datos actuales. Se creara un respaldo pre-restore antes de continuar.`,
      "Restaurar respaldo",
    );
    if (!ok) return;
    const pwd = await this.getCriticalAdminPassword(
      "Autorizar restauracion",
      "Confirma tu identidad para restaurar el sistema con este respaldo.",
    );
    if (!pwd && !this.isGoogleAdminSession()) return;
    const humanOk = await window.requestHumanCaptcha(
      "Verificacion para restaurar",
      "Confirma que eres una persona antes de restaurar la base de datos.",
    );
    if (!humanOk) return this.toast("Restauracion cancelada", "info");
    await this.postUpdate("restore_backup", {
      filename,
      admin_password: pwd,
    });
    await this.loadData();
    await this.loadBackupArchive();
  },

  async deleteBackup(filename) {
    if (!filename) return;
    const ok = await window.customConfirm(
      `Eliminaras el respaldo "${filename}" del servidor. Esta accion no se puede deshacer.`,
      "Eliminar respaldo",
    );
    if (!ok) return;
    const pwd = await this.getCriticalAdminPassword(
      "Autorizar eliminacion",
      "Confirma tu identidad para eliminar este respaldo del servidor.",
    );
    if (!pwd && !this.isGoogleAdminSession()) return;
    const humanOk = await window.requestHumanCaptcha(
      "Verificacion para eliminar",
      "Confirma que eres una persona antes de borrar el respaldo.",
    );
    if (!humanOk) return this.toast("Eliminacion cancelada", "info");
    await this.postUpdate("delete_backup", {
      filename,
      admin_password: pwd,
    });
    await this.loadBackupArchive();
  },

  async importBackupFile() {
    const ok = await window.customConfirm(
      "Importar un respaldo lo agregara al archivero del servidor. Despues podras restaurarlo con confirmacion adicional.",
      "Importar respaldo",
    );
    if (!ok) return;
    const input = document.getElementById("backupImportInput");
    if (input) {
      input.value = "";
      input.click();
    }
  },

  async handleBackupImportFile(file) {
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
      return this.toast("Selecciona un archivo JSON de respaldo.", "error");
    }
    const pwd = await this.getCriticalAdminPassword(
      "Autorizar importacion",
      "Confirma tu identidad para subir este respaldo al servidor.",
    );
    if (!pwd && !this.isGoogleAdminSession()) return;
    const humanOk = await window.requestHumanCaptcha(
      "Verificacion para importar",
      "Confirma que eres una persona antes de importar el respaldo.",
    );
    if (!humanOk) return this.toast("Importacion cancelada", "info");

    const fd = new FormData();
    fd.append("action", "upload_backup");
    fd.append("backup_file", file);
    fd.append("admin_password", pwd);
    this.toast("Importando respaldo...", "info");
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "No se pudo importar");
      this.toast(json.message || "Respaldo importado", "success");
      await this.loadBackupArchive();
      const filename = json.data?.filename || "";
      if (filename) {
        const restoreNow = await window.customConfirm(
          `El respaldo "${filename}" ya esta en el archivero. ¿Quieres restaurarlo ahora?`,
          "Restaurar respaldo importado",
        );
        if (restoreNow) {
          const restoreBtn = document.getElementById("backupRestoreBtn");
          if (restoreBtn) restoreBtn.dataset.filename = filename;
          await this.restoreSelectedBackup();
        }
      }
    } catch (error) {
      this.toast("Error al importar: " + error.message, "error");
    }
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
          credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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

window.settingsModule = settingsModule;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => settingsModule.init());
} else {
  settingsModule.init();
}
