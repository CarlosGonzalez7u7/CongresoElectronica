/**
 * Gestor Dinámico de Módulos Personalizados
 * Maneja la interfaz de ítems y su personal (ej. jueces, encargados, capitanes).
 */
const customModulesManager = {
  currentModule: null,
  items: [],

  loadModule: async function (moduleItem) {
    this.currentModule = moduleItem;
    document.getElementById("cmSectionTitle").innerHTML =
      `<i class="${moduleItem.icon || "fas fa-layer-group"}"></i> ${moduleItem.title}`;
    document.getElementById("cmSectionSubtitle").textContent =
      moduleItem.description ||
      `Gestionar elementos y actividades de ${moduleItem.title}`;
    this.render();
  },

  render: async function () {
    if (!this.currentModule) return;
    const grid = document.getElementById("cmGrid");
    grid.innerHTML =
      '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';

    try {
      const res = await fetch(
        `/app/api/admin-settings.php?action=get_custom_module_items&module_id=${this.currentModule.id}`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (json.success) {
        this.items = json.data;
        this.drawGrid();
      } else {
        grid.innerHTML = `<div class="empty-state">Error: ${json.error}</div>`;
      }
    } catch (err) {
      grid.innerHTML = `<div class="empty-state">Error de conexión con el servidor.</div>`;
    }
  },

  drawGrid: function () {
    const grid = document.getElementById("cmGrid");
    if (this.items.length === 0) {
      grid.innerHTML =
        '<div class="empty-state"><i class="fas fa-box-open" style="font-size:3rem; opacity:0.5; margin-bottom:10px; display:block;"></i>No hay elementos registrados en este módulo. Crea el primero.</div>';
      return;
    }
    grid.innerHTML = this.items
      .map((item) => {
        const staffCount = item.staff ? item.staff.length : 0;
        return `
            <div class="content-card" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <h4 style="margin:0; font-size: 1.1rem; color: #fff;">${item.name}</h4>
                    <p style="margin:5px 0 0 0; font-size:13px; color:var(--text-mute);">
                        <i class="fas fa-calendar"></i> ${item.event_date || "Sin fecha"} | 
                        <i class="fas fa-info-circle"></i> Estado: ${item.status} | 
                        <i class="fas fa-users"></i> Staff / Jueces: ${staffCount}
                    </p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-secondary btn-small" onclick="customModulesManager.openStaffModal(${item.id})"><i class="fas fa-user-tie"></i> Encargados</button>
                    <button class="btn btn-secondary btn-small" onclick="customModulesManager.openItemModal(${item.id})"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn btn-danger btn-small" onclick="customModulesManager.deleteItem(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
      })
      .join("");
  },

  openItemModal: function (itemId = null) {
    const item = itemId ? this.items.find((i) => i.id === itemId) : {};
    document.getElementById("cmItemId").value = item.id || "";
    document.getElementById("cmItemName").value = item.name || "";
    document.getElementById("cmItemDesc").value = item.description || "";
    document.getElementById("cmItemDate").value = item.event_date || "";
    document.getElementById("cmItemStatus").value = item.status || "draft";
    document.getElementById("cmItemModalTitle").innerHTML = itemId
      ? '<i class="fas fa-edit"></i> Editar Elemento'
      : '<i class="fas fa-plus"></i> Nuevo Elemento';

    document.getElementById("cmItemModal").classList.remove("hidden");
    document.getElementById("cmItemModal").classList.add("show");
  },

  closeItemModal: function () {
    document.getElementById("cmItemModal").classList.add("hidden");
    document.getElementById("cmItemModal").classList.remove("show");
  },

  saveItem: async function () {
    const name = document.getElementById("cmItemName").value.trim();
    if (!name) {
      if (typeof showBadgeToast === "function")
        showBadgeToast("El nombre de la actividad es obligatorio", "error");
      return;
    }

    const payload = {
      action: "save_custom_module_item",
      id: document.getElementById("cmItemId").value,
      module_id: this.currentModule.id,
      convocatoria_id: this.currentModule.convocatoria_id,
      name: name,
      description: document.getElementById("cmItemDesc").value,
      event_date: document.getElementById("cmItemDate").value,
      status: document.getElementById("cmItemStatus").value,
    };

    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.success) {
        if (typeof showBadgeToast === "function")
          showBadgeToast("Actividad guardada con éxito", "success");
        this.closeItemModal();
        this.render();
      } else {
        if (typeof showBadgeToast === "function")
          showBadgeToast("Error: " + res.error, "error");
      }
    } catch (e) {
      if (typeof showBadgeToast === "function")
        showBadgeToast("Error de conexión", "error");
    }
  },

  deleteItem: async function (id) {
    if (
      !confirm(
        "¿Eliminar este elemento y todas sus dependencias permanentemente?",
      )
    )
      return;
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete_custom_module_item", id }),
      }).then((r) => r.json());

      if (res.success) {
        if (typeof showBadgeToast === "function")
          showBadgeToast("Elemento eliminado", "success");
        this.render();
      }
    } catch (e) {}
  },

  openStaffModal: function (itemId) {
    document.getElementById("cmStaffItemId").value = itemId;
    this.renderStaffList(itemId);
    document.getElementById("cmStaffName").value = "";
    document.getElementById("cmStaffRole").value = "Encargado";

    document.getElementById("cmStaffModal").classList.remove("hidden");
    document.getElementById("cmStaffModal").classList.add("show");
  },

  closeStaffModal: function () {
    document.getElementById("cmStaffModal").classList.add("hidden");
    document.getElementById("cmStaffModal").classList.remove("show");
  },

  renderStaffList: function (itemId) {
    const item = this.items.find((i) => i.id === itemId);
    const listEl = document.getElementById("cmStaffList");
    if (!item || !item.staff || item.staff.length === 0) {
      listEl.innerHTML =
        '<p style="color:var(--text-mute); font-size:13px;">No hay personal asignado a esta actividad.</p>';
      return;
    }
    listEl.innerHTML = item.staff
      .map(
        (s) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; margin-bottom:8px;">
                <div>
                    <strong style="display:block; color:#fff; font-size:14px;">${s.full_name}</strong>
                    <span style="font-size:12px; color:var(--text-mute);">${s.role_label}</span>
                </div>
                <button class="btn btn-danger btn-small" onclick="customModulesManager.deleteStaff(${s.id}, ${itemId})"><i class="fas fa-trash"></i></button>
            </div>
        `,
      )
      .join("");
  },

  saveStaff: async function () {
    const itemId = document.getElementById("cmStaffItemId").value;
    const name = document.getElementById("cmStaffName").value.trim();
    const role =
      document.getElementById("cmStaffRole").value.trim() || "Encargado";

    if (!name) {
      if (typeof showBadgeToast === "function")
        showBadgeToast("El nombre de la persona es obligatorio", "error");
      return;
    }

    const payload = {
      action: "save_custom_module_staff",
      item_id: itemId,
      full_name: name,
      role_label: role,
    };

    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.success) {
        if (typeof showBadgeToast === "function")
          showBadgeToast("Personal asignado", "success");
        await this.render();
        this.renderStaffList(parseInt(itemId));
        document.getElementById("cmStaffName").value = "";
      }
    } catch (e) {}
  },

  deleteStaff: async function (staffId, itemId) {
    if (!confirm("¿Remover a esta persona de la actividad?")) return;
    try {
      const res = await fetch("/app/api/admin-settings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "delete_custom_module_staff",
          id: staffId,
        }),
      }).then((r) => r.json());

      if (res.success) {
        await this.render();
        this.renderStaffList(itemId);
      }
    } catch (e) {}
  },
};
