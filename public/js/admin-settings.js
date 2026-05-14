const settingsModule = {
  data: {},

  init: function () {
    this.loadData();
  },

  loadData: async function () {
    try {
      const res = await fetch("/app/api/admin-settings.php?action=get_all");
      const json = await res.json();
      if (json.success) {
        this.data = json.data;
        this.renderConvocatorias();
        this.renderStages();
        this.renderCategories();
      } else {
        this.showToast("Error cargando configuración: " + json.error, "error");
      }
    } catch (err) {
      console.error(err);
    }
  },

  renderConvocatorias: function () {
    const container = document.getElementById("settingsConvocatoriasList");
    if (!container) return;

    container.innerHTML = this.data.convocatorias
      .map(
        (c) => `
      <div style="background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0 0 5px 0; color:var(--text-main); font-size:1.1rem;">${c.titulo} <code>(${c.codigo})</code></h4>
          <p style="margin:0; font-size:0.9rem; color:var(--text-sub);">${c.descripcion || "Sin descripción"}</p>
        </div>
        <div style="text-align:right;">
          <span style="display:block; font-weight:800; color:var(--yellow); font-size:1.2rem; margin-bottom:10px;">$${c.precio_base} MXN</span>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-small" onclick="settingsModule.editConvocatoria(${c.id})"><i class="fas fa-edit"></i> Cambiar Precio</button>
            ${c.documento_url ? `<a href="${c.documento_url}" target="_blank" class="btn btn-secondary btn-small" style="text-decoration:none;"><i class="fas fa-file-pdf"></i> Ver Convocatoria PDF</a>` : ""}
            <button class="btn btn-secondary btn-small" onclick="settingsModule.uploadDoc('convocatoria', ${c.id})"><i class="fas fa-upload"></i> Subir/Cambiar PDF</button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  },

  renderStages: function () {
    const container = document.getElementById("settingsStagesList");
    if (!container) return;

    container.innerHTML = this.data.stages
      .map(
        (s) => `
      <div style="background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0 0 5px 0; color:var(--text-main);"><span style="display:inline-block;width:12px;height:12px;background:${s.color_code};border-radius:50%;margin-right:5px;"></span> ${s.stage_name}</h4>
          <p style="margin:0; font-size:0.85rem; color:var(--text-sub);">Del <strong>${s.start_date.split(" ")[0]}</strong> al <strong>${s.end_date.split(" ")[0]}</strong></p>
        </div>
        <div style="text-align:right;">
          <span style="display:block; font-weight:800; color:var(--yellow); font-size:1.2rem; margin-bottom:10px;">$${s.price_per_robot} MXN <small style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">/ Robot</small></span>
          <button class="btn btn-secondary btn-small" onclick="settingsModule.editStage(${s.id})"><i class="fas fa-calendar"></i> Cambiar Fechas / Precio</button>
        </div>
      </div>
    `,
      )
      .join("");
  },

  renderCategories: function () {
    const tbody = document.getElementById("settingsCategoriesList");
    if (!tbody) return;

    tbody.innerHTML = this.data.categories
      .map(
        (c) => `
      <tr>
        <td><strong>${c.category_name}</strong><br><small style="color:var(--text-muted)">Peso Máx: ${c.max_weight || "Variable"}</small></td>
        <td style="display:flex; gap:10px; align-items:center;">
          ${c.documento_reglamento_url ? `<a href="${c.documento_reglamento_url}" target="_blank" class="btn btn-secondary btn-small" style="text-decoration:none;"><i class="fas fa-file-pdf"></i> Ver PDF</a>` : '<span style="color:#ef4444; font-size:0.85rem;"><i class="fas fa-times-circle"></i> Faltante</span>'}
          <button class="btn btn-secondary btn-small" onclick="settingsModule.uploadDoc('category', ${c.id})"><i class="fas fa-upload"></i> Subir Reglamento PDF</button>
        </td>
      </tr>
    `,
      )
      .join("");
  },

  editConvocatoria: function (id) {
    const conv = this.data.convocatorias.find((c) => c.id == id);
    const nPrecio = prompt(
      `Ingresa el nuevo precio base en MXN para ${conv.titulo}:`,
      conv.precio_base,
    );
    if (nPrecio === null || isNaN(nPrecio)) return;
    this.postUpdate("update_convocatoria", {
      id: id,
      titulo: conv.titulo,
      descripcion: conv.descripcion,
      precio_base: parseFloat(nPrecio),
      is_active: conv.is_active,
    });
  },

  editStage: function (id) {
    const stage = this.data.stages.find((s) => s.id == id);
    const nPrecio = prompt(
      `Nuevo precio por robot para ${stage.stage_name} (MXN):`,
      stage.price_per_robot,
    );
    if (nPrecio === null || isNaN(nPrecio)) return;
    this.postUpdate("update_stage", {
      id: id,
      stage_name: stage.stage_name,
      start_date: stage.start_date,
      end_date: stage.end_date,
      price_per_robot: parseFloat(nPrecio),
      is_active: stage.is_active,
    });
  },

  uploadDoc: function (type, refId) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("action", "upload_document");
      formData.append("doc_type", type);
      formData.append("ref_id", refId);
      formData.append("document", file);
      this.postUpdate("upload_document", formData, true);
    };
    fileInput.click();
  },

  postUpdate: async function (action, payload, isFormData = false) {
    let formData = isFormData ? payload : new FormData();
    if (!isFormData) {
      formData.append("action", action);
      for (const k in payload) formData.append(k, payload[k]);
    }

    this.showToast("Guardando cambios...", "info");
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        this.showToast("Guardado correctamente.", "success");
        this.loadData();
      } else {
        this.showToast("Error: " + json.error, "error");
      }
    } catch (err) {
      this.showToast("Error de conexión", "error");
    }
  },

  showToast: function (msg, type) {
    if (typeof setGlobalStatus === "function") setGlobalStatus(msg, type);
    else alert(msg);
  },
};
