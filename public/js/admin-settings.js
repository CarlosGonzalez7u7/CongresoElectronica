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
     RENDER: CATEGORÍAS
  ───────────────────────────────────────── */
  renderCategories() {
    const tbody = document.getElementById("settingsCategoriesList");
    if (!tbody) return;
    if (!this.data.categories.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state"><i class="fas fa-robot"></i><br>Sin categorías</td></tr>';
      return;
    }
    tbody.innerHTML = this.data.categories
      .map(
        (cat) => `
      <tr>
        <td>
          <strong style="color:var(--text-h)">${this._esc(cat.category_name)}</strong>
          ${cat.competition_datetime ? `<br><small style="color:var(--text-mute)"><i class="fas fa-clock"></i> ${this._fmtDate(cat.competition_datetime)}</small>` : ""}
          ${cat.location ? `<br><small style="color:var(--text-mute)"><i class="fas fa-map-marker-alt"></i> ${this._esc(cat.location)}</small>` : ""}
        </td>
        <td><code style="font-size:11px">${this._esc(cat.category_code)}</code></td>
        <td>${this._esc(cat.max_weight || "—")}</td>
        <td>
          ${
            cat.documento_reglamento_url
              ? `<a href="${cat.documento_reglamento_url}" target="_blank" class="btn btn-secondary btn-small"><i class="fas fa-file-pdf"></i> Ver</a>`
              : '<span style="color:var(--rose);font-size:12px"><i class="fas fa-times-circle"></i> Faltante</span>'
          }
          <button class="btn btn-secondary btn-small" style="margin-left:4px" onclick="settingsModule.pickDoc('category',${cat.id})"><i class="fas fa-upload"></i></button>
        </td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-secondary btn-small" onclick="settingsModule.openCatModal(${cat.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-small"   onclick="settingsModule.deleteCat(${cat.id})"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("");
  },

  /* ─────────────────────────────────────────
     MODAL: CONVOCATORIA
  ───────────────────────────────────────── */
  openConvModal(id) {
    // Abrir editor Word en nueva pestaña
    const cv = id ? this.data.convocatorias.find((c) => c.id == id) : null;
    window.__convEditorData = cv ? { conv: cv } : { conv: null };
    // Ruta relativa al editor — ajusta si tu estructura de carpetas cambia
    const editorUrl = "/app/assets/conv-editor.html";
    const win = window.open(editorUrl, "_blank");
    if (!win) {
      this.toast(
        "El navegador bloqueó la ventana emergente. Permite pop-ups para este sitio.",
        "error",
      );
    }
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

  async deleteStage(id) {
    if (!confirm("¿Eliminar esta etapa de registro?")) return;
    await this.postUpdate("delete_stage", { id });
  },

  /* ─────────────────────────────────────────
     MODAL: CATEGORÍA
  ───────────────────────────────────────── */
  openCatModal(id) {
    const isEdit = !!id;
    document.getElementById("modalCatTitle").textContent = isEdit
      ? "Editar Categoría"
      : "Nueva Categoría";
    document.getElementById("catId").value = id || "";
    if (isEdit) {
      const cat = this.data.categories.find((c) => c.id == id);
      if (!cat) return;
      document.getElementById("catName").value = cat.category_name || "";
      document.getElementById("catCode").value = cat.category_code || "";
      document.getElementById("catWeight").value = cat.max_weight || "";
      document.getElementById("catDesc").value = cat.description || "";
      document.getElementById("catDate").value = this._toDatetimeLocal(
        cat.competition_datetime,
      );
      document.getElementById("catLocation").value = cat.location || "";
      document.getElementById("catPdfStatus").textContent =
        cat.documento_reglamento_url ? "✓ PDF subido" : "Sin PDF";
    } else {
      [
        "catName",
        "catCode",
        "catWeight",
        "catDesc",
        "catDate",
        "catLocation",
      ].forEach((id) => (document.getElementById(id).value = ""));
      document.getElementById("catPdfStatus").textContent = "Sin PDF";
    }
    this.showModal("modalCat");
  },

  async saveCat() {
    const id = document.getElementById("catId").value;
    const name = document.getElementById("catName").value.trim();
    const code = document.getElementById("catCode").value.trim();
    if (!name || !code)
      return this.toast("Nombre y código son obligatorios", "error");

    const payload = {
      category_name: name,
      category_code: code,
      max_weight: document.getElementById("catWeight").value.trim(),
      description: document.getElementById("catDesc").value.trim(),
      competition_datetime:
        document.getElementById("catDate").value.replace("T", " ") || null,
      location: document.getElementById("catLocation").value.trim(),
    };
    if (id) {
      payload.id = id;
      await this.postUpdate("update_category", payload);
    } else {
      await this.postUpdate("add_category", payload);
    }
    this.closeModal("modalCat");
  },

  async deleteCat(id) {
    if (
      !confirm("¿Eliminar esta categoría? Puede afectar robots ya registrados.")
    )
      return;
    await this.postUpdate("delete_category", { id });
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
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  },

  _toDatetimeLocal(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  },
};
