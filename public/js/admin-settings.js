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
      <div style="background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:15px;">
        <div style="flex: 1 1 250px;">
          <h4 style="margin:0 0 5px 0; color:var(--text-main); font-size:1.1rem;">${c.titulo} <code>(${c.codigo})</code></h4>
          <p style="margin:0; font-size:0.9rem; color:var(--text-sub);">${c.descripcion || "Sin descripción"}</p>
        </div>
        <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
          <span style="display:block; font-weight:800; color:var(--yellow); font-size:1.2rem; margin-bottom:10px;">$${c.precio_base} MXN</span>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-small" onclick="settingsModule.editConvocatoria(${c.id})"><i class="fas fa-edit"></i> Editar</button>
            ${c.documento_url ? `<a href="${c.documento_url}" target="_blank" class="btn btn-secondary btn-small" style="text-decoration:none;"><i class="fas fa-file-pdf"></i> Ver PDF</a>` : ""}
            <button class="btn btn-secondary btn-small" onclick="settingsModule.uploadDoc('convocatoria', ${c.id})"><i class="fas fa-upload"></i> Subir PDF</button>
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

    let html = this.data.stages
      .map(
        (s) => `
      <div style="background:var(--bg-surface-hover); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:15px;">
        <div style="flex: 1 1 200px;">
          <h4 style="margin:0 0 5px 0; color:var(--text-main);"><span style="display:inline-block;width:12px;height:12px;background:${s.color_code};border-radius:50%;margin-right:5px;"></span> ${s.stage_name}</h4>
          <p style="margin:0; font-size:0.85rem; color:var(--text-sub);">Del <strong>${s.start_date}</strong> al <strong>${s.end_date}</strong></p>
        </div>
        <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
          <span style="display:block; font-weight:800; color:var(--yellow); font-size:1.2rem; margin-bottom:10px;">$${s.price_per_robot} MXN <small style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">/ Robot</small></span>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-small" onclick="settingsModule.editStage(${s.id})"><i class="fas fa-edit"></i> Editar</button>
            <button class="btn btn-danger btn-small" onclick="settingsModule.deleteStage(${s.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
    html += `<div style="text-align:right; margin-bottom:10px;"><button class="btn btn-primary btn-small" onclick="settingsModule.addStage()"><i class="fas fa-plus"></i> Agregar Etapa</button></div>`;
    container.innerHTML = html;
  },

  renderCategories: function () {
    const tbody = document.getElementById("settingsCategoriesList");
    if (!tbody) return;

    let html = this.data.categories
      .map(
        (c) => `
      <tr>
        <td><strong>${c.category_name}</strong><br><small style="color:var(--text-muted)">Código: ${c.category_code} | Peso Máx: ${c.max_weight || "Variable"}</small></td>
        <td style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          ${c.documento_reglamento_url ? `<a href="${c.documento_reglamento_url}" target="_blank" class="btn btn-secondary btn-small" style="text-decoration:none;"><i class="fas fa-file-pdf"></i> Ver PDF</a>` : '<span style="color:#ef4444; font-size:0.85rem;"><i class="fas fa-times-circle"></i> Faltante</span>'}
          <button class="btn btn-secondary btn-small" onclick="settingsModule.uploadDoc('category', ${c.id})"><i class="fas fa-upload"></i> Subir PDF</button>
          <button class="btn btn-danger btn-small" onclick="settingsModule.deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `,
      )
      .join("");
    html += `<tr><td colspan="2" style="text-align:right;"><button class="btn btn-primary btn-small" onclick="settingsModule.addCategory()"><i class="fas fa-plus"></i> Agregar Categoría</button></td></tr>`;
    tbody.innerHTML = html;
  },

  editConvocatoria: function (id) {
    const conv = this.data.convocatorias.find((c) => c.id == id);
    const nName = prompt(`Nombre de la convocatoria:`, conv.titulo);
    if (!nName) return;
    const nDesc = prompt(`Descripción:`, conv.descripcion);
    const nPrecio = prompt(
      `Ingresa el nuevo precio base en MXN:`,
      conv.precio_base,
    );
    if (nPrecio === null || isNaN(nPrecio)) return;
    this.postUpdate("update_convocatoria", {
      id: id,
      titulo: nName,
      descripcion: nDesc || "",
      precio_base: parseFloat(nPrecio),
      is_active: conv.is_active,
    });
  },

  editStage: function (id) {
    const stage = this.data.stages.find((s) => s.id == id);
    const nName = prompt(`Nombre de la etapa:`, stage.stage_name);
    if (!nName) return;
    const nStart = prompt(
      `Fecha de inicio (YYYY-MM-DD HH:MM:SS):`,
      stage.start_date,
    );
    if (!nStart) return;
    const nEnd = prompt(`Fecha de fin (YYYY-MM-DD HH:MM:SS):`, stage.end_date);
    if (!nEnd) return;
    const nPrecio = prompt(
      `Nuevo precio por robot (MXN):`,
      stage.price_per_robot,
    );
    if (nPrecio === null || isNaN(nPrecio)) return;
    this.postUpdate("update_stage", {
      id: id,
      stage_name: nName,
      start_date: nStart,
      end_date: nEnd,
      price_per_robot: parseFloat(nPrecio),
      is_active: stage.is_active,
    });
  },

  addCategory: function () {
    const name = prompt(
      "Nombre de la nueva categoría (Ej: Mini Sumo Autónomo):",
    );
    if (!name) return;
    const code = prompt(
      "Código interno corto (Ej: mini-sumo-autonomo):",
      name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    );
    if (!code) return;
    const weight = prompt("Peso máximo (Ej: 500g, 3lb, Variable):", "Variable");

    this.postUpdate("add_category", {
      category_name: name,
      category_code: code,
      max_weight: weight || "Variable",
    });
  },

  deleteCategory: function (id) {
    if (
      confirm(
        "¿Estás seguro de eliminar esta categoría? Esto podría afectar a los robots ya registrados.",
      )
    ) {
      this.postUpdate("delete_category", { id: id });
    }
  },

  addStage: function () {
    const name = prompt("Nombre de la nueva etapa (Ej: Etapa 4):");
    if (!name) return;
    const start = prompt(
      "Fecha y hora de inicio (YYYY-MM-DD HH:MM:SS):",
      "2026-11-01 00:00:00",
    );
    if (!start) return;
    const end = prompt(
      "Fecha y hora de fin (YYYY-MM-DD HH:MM:SS):",
      "2026-11-30 23:59:59",
    );
    if (!end) return;
    const price = prompt("Precio por robot (MXN):", "400");
    if (!price || isNaN(price)) return;

    this.postUpdate("add_stage", {
      stage_name: name,
      start_date: start,
      end_date: end,
      price_per_robot: parseFloat(price),
      color_code: "#10b981",
    });
  },

  deleteStage: function (id) {
    if (confirm("¿Estás seguro de eliminar esta etapa?")) {
      this.postUpdate("delete_stage", { id: id });
    }
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
