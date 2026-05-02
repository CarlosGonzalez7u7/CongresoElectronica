// =========================================================
// RENOVATEC 2026 - Módulo de Talleres y Conferencias (Admin)
// =========================================================

const WS_API = "/app/api/admin-workshops.php";

// Utilidades de red
async function wsFetch(action, params = {}) {
  const url = new URL(WS_API, window.location.origin);
  url.searchParams.append("action", action);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  }
  const res = await fetch(url);
  return res.json();
}

async function wsPost(data) {
  const res = await fetch(WS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Wrapper XMLHttpRequest para enviar archivos con barras de progreso
function wsUploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve({ success: false, error: "Respuesta inválida del servidor" });
      }
    };
    xhr.onerror = () =>
      resolve({
        success: false,
        error: "Error de red al intentar subir el archivo",
      });
    xhr.send(formData);
  });
}

function showAdminToast(msg, type = "success") {
  if (typeof setGlobalStatus === "function") {
    setGlobalStatus(msg, type);
  } else {
    const el = document.getElementById("globalStatus");
    if (!el) {
      console.log(type.toUpperCase() + ": " + msg);
      return;
    }
    el.textContent = msg;
    el.className = `global-status status-item show ${type}`;
    setTimeout(() => el.classList.remove("show"), 3500);
  }
}

// =========================================================
// MÓDULO: TALLERES Y TALLERISTAS
// =========================================================
const workshopModule = {
  tags: { topics: [], materials: [] },
  instructors: [],

  init() {
    this.loadInstructors();
    this.loadWorkshops();
    this.initTabs();
    this.setupAutocomplete();
  },

  initTabs() {
    const tabs = document.querySelectorAll("[data-ws-tab]");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        tabs.forEach((t) => t.classList.remove("active"));
        e.currentTarget.classList.add("active");

        const targetId =
          "ws-tab-" + e.currentTarget.getAttribute("data-ws-tab");
        document.querySelectorAll(".ws-tab-panel").forEach((p) => {
          p.classList.remove("active");
          p.style.display = "none";
        });
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.classList.add("active");
          targetPanel.style.display = "block";
        }
      });
    });

    // Asegurar estado inicial
    document.querySelectorAll(".ws-tab-panel").forEach((p) => {
      if (!p.classList.contains("active")) {
        p.style.display = "none";
      }
    });
  },

  // --- Carga de Datos ---
  async loadInstructors() {
    const res = await wsFetch("instructors");
    if (!res.success) return;
    this.instructors = res.data;

    const list = document.getElementById("instructorList");
    if (list) {
      if (this.instructors.length === 0) {
        list.innerHTML =
          '<div class="empty-state"><i class="fas fa-users"></i><h3>No hay profesores</h3></div>';
        return;
      }
      list.innerHTML = this.instructors
        .map(
          (i) => `
                <div class="content-card" style="display:flex; gap:16px; align-items:center; cursor:pointer;" onclick="workshopModule.editInstructor(${i.id})" title="Haz clic para editar">
                    <div class="cong-avatar cong-avatar--lg"><i class="fas fa-user-tie"></i></div>
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:16px; color:var(--primary-blue);">${i.full_name}</h4>
                        <p style="margin:0; font-size:13px; color:var(--text-mute);">
                            <i class="fas fa-envelope"></i> ${i.email || "Sin correo"} | 
                            <i class="fas fa-phone"></i> ${i.phone || "Sin teléfono"}
                        </p>
                        <span class="badge badge-accent mt-4">${i.specialty || "General"}</span>
                    </div>
                    <div onclick="event.stopPropagation()">
                         <button class="btn btn-danger btn-small" onclick="workshopModule.deleteInstructor(${i.id})"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `,
        )
        .join("");
    }
  },

  setupAutocomplete() {
    const searchInput = document.getElementById("wsInstructorSearch");
    const hiddenInput = document.getElementById("wsInstructor");
    const suggBox = document.getElementById("wsInstructorSuggestions");

    if (!searchInput || !hiddenInput || !suggBox) return;

    searchInput.addEventListener("input", (e) => {
      const val = e.target.value.toLowerCase().trim();
      hiddenInput.value = ""; // Limpiar ID oculto

      if (!val) {
        suggBox.style.display = "none";
        return;
      }

      const matches = this.instructors.filter(
        (i) =>
          i.full_name.toLowerCase().includes(val) ||
          (i.specialty && i.specialty.toLowerCase().includes(val)),
      );

      if (matches.length === 0) {
        suggBox.innerHTML =
          '<div style="padding: 8px 12px; color: var(--text-mute); font-size: 13px;">No se encontraron profesores</div>';
        suggBox.style.display = "block";
      } else if (
        matches.length === 1 &&
        matches[0].full_name.toLowerCase() === val
      ) {
        // Si coincide de forma exacta y única, lo autocompleta
        this.selectInstructor(matches[0].id, matches[0].full_name);
      } else {
        suggBox.innerHTML = matches
          .map(
            (m) =>
              `<div style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-light); font-size: 14px;" 
                  onclick="workshopModule.selectInstructor(${m.id}, '${m.full_name.replace(/'/g, "\\'")}')" 
                  onmouseover="this.style.background='var(--bg-surface)'" onmouseout="this.style.background='transparent'">
                <strong>${m.full_name}</strong> <span style="color:var(--text-mute); font-size: 12px;">(${m.specialty || "General"})</span>
            </div>`,
          )
          .join("");
        suggBox.style.display = "block";
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target !== searchInput && e.target !== suggBox) {
        suggBox.style.display = "none";
      }
    });

    // Forzar selección o autocompletado al salir del campo
    searchInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (!hiddenInput.value && searchInput.value.trim() !== "") {
          const val = searchInput.value.toLowerCase().trim();
          const matches = this.instructors.filter(
            (i) =>
              i.full_name.toLowerCase().includes(val) ||
              (i.specialty && i.specialty.toLowerCase().includes(val)),
          );
          if (matches.length > 0) {
            this.selectInstructor(matches[0].id, matches[0].full_name);
          } else {
            searchInput.value = "";
            hiddenInput.value = "";
          }
        }
      }, 150);
    });
  },

  selectInstructor(id, name) {
    document.getElementById("wsInstructor").value = id;
    document.getElementById("wsInstructorSearch").value = name;
    document.getElementById("wsInstructorSuggestions").style.display = "none";
  },

  async loadWorkshops() {
    const res = await wsFetch("list");
    const grid = document.getElementById("workshopGrid");
    if (!grid || !res.success) return;

    if (res.data.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-chalkboard"></i><h3>No hay talleres creados</h3></div>';
      return;
    }

    grid.innerHTML = res.data
      .map((w) => {
        const displayCover =
          w.cover_image_url && w.cover_image_url.startsWith("/uploads/")
            ? "/app" + w.cover_image_url
            : w.cover_image_url;
        return `
            <div class="content-card" style="display:flex; flex-direction:column; padding:0; overflow:hidden;">
                <div style="height:140px; background:var(--bg-surface); position:relative;">
                    ${w.cover_image_url ? `<img src="${displayCover}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--border-md);"><i class="fas fa-image fa-3x"></i></div>`}
                    <span class="badge ${w.status === "published" ? "badge-approved" : "badge-pending"}" style="position:absolute; top:10px; right:10px;">${w.status.toUpperCase()}</span>
                </div>
                <div style="padding:16px; flex:1; display:flex; flex-direction:column;">
                    <h4 style="font-size:16px; margin:0 0 8px 0; color:var(--primary-blue);">${w.name}</h4>
                    <p style="font-size:13px; color:var(--text-mute); margin:0 0 12px 0;"><i class="fas fa-user-tie"></i> ${w.instructor_name || "Sin profesor asignado"}</p>
                    <div style="font-size:12px; color:var(--text-mute); margin-bottom:14px; flex:1;">
                        <div><i class="fas fa-map-marker-alt"></i> ${w.location || "Ubicación pendiente"}</div>
                        <div style="margin-top:4px;"><i class="fas fa-calendar-alt"></i> ${w.schedule_date ? (w.schedule_date_end && w.schedule_date !== w.schedule_date_end ? w.schedule_date + " al " + w.schedule_date_end : w.schedule_date) : "Fecha pendiente"}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px;">
                        <button class="btn-link" style="font-size:12px; font-weight:bold;" onclick="workshopModule.openEnrollmentsModal(${w.id})">
                            <i class="fas fa-users"></i> ${w.enrolled_count}/${w.max_capacity} inscritos
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="workshopModule.editWorkshop(${w.id})"><i class="fas fa-edit"></i> Editar</button>
                    </div>
                </div>
            </div>
        `;
      })
      .join("");
  },

  // --- Modales y Formularios ---
  editInstructor(id) {
    const instructor = this.instructors.find((i) => i.id === id);
    if (!instructor)
      return showAdminToast(
        "Profesor no encontrado. Intenta recargar la página.",
        "error",
      );
    this.openInstructorForm(instructor);
  },

  async deleteInstructor(id) {
    const isConfirmed = await (window.customConfirm
      ? window.customConfirm(
          "¿Estás seguro de que quieres eliminar a este profesor? Esta acción no se puede deshacer.",
          "Eliminar Profesor",
        )
      : confirm("¿Estás seguro?"));

    if (!isConfirmed) return;

    const res = await wsPost({ action: "delete_instructor", id });
    if (res.success) {
      showAdminToast("Profesor eliminado correctamente");
      this.loadInstructors();
    } else {
      showAdminToast(res.error, "error");
    }
  },

  openInstructorForm(instructor = null) {
    const usernameEl = document.getElementById("instrUsername");
    const passwordEl = document.getElementById("instrPassword");
    const passwordHintEl = document.getElementById("instrPasswordHint");

    if (instructor) {
      document.getElementById("instrId").value = instructor.id;
      document.getElementById("instrName").value = instructor.full_name;
      document.getElementById("instrEmail").value = instructor.email;
      document.getElementById("instrPhone").value = instructor.phone;
      document.getElementById("instrSpecialty").value = instructor.specialty;
      document.getElementById("instrBio").value = instructor.bio;
      document.getElementById("instrModalTitle").innerHTML =
        '<i class="fas fa-user-tie"></i> Editar Profesor';

      if (usernameEl) {
        usernameEl.value = instructor.username || "";
        usernameEl.disabled = false;
      }
      if (passwordEl)
        passwordEl.placeholder =
          "Nueva contraseña (dejar vacío para no cambiar)";
      if (passwordHintEl)
        passwordHintEl.textContent = "(dejar vacío para no cambiar)";
    } else {
      document.getElementById("instrId").value = "";
      document.getElementById("instrName").value = "";
      document.getElementById("instrEmail").value = "";
      document.getElementById("instrPhone").value = "";
      document.getElementById("instrSpecialty").value = "";
      document.getElementById("instrBio").value = "";
      document.getElementById("instrModalTitle").innerHTML =
        '<i class="fas fa-user-tie"></i> Nuevo Profesor';

      if (usernameEl) {
        usernameEl.value = "";
        usernameEl.disabled = false;
      }
      if (passwordEl) passwordEl.placeholder = "Contraseña (mín. 8 caracteres)";
      if (passwordHintEl) passwordHintEl.textContent = "(mín. 8 caracteres)";
    }

    document.getElementById("instructorModal").classList.remove("hidden");
    document.getElementById("instructorModal").classList.add("show");
  },

  closeInstructorModal() {
    document.getElementById("instructorModal").classList.remove("show");
    document.getElementById("instructorModal").classList.add("hidden");
  },

  async editWorkshop(id) {
    const btns = document.querySelectorAll(
      `button[onclick="workshopModule.editWorkshop(${id})"]`,
    );
    const originalTexts = [];
    btns.forEach((btn) => {
      originalTexts.push(btn.innerHTML);
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    });

    const res = await wsFetch("list");

    btns.forEach((btn, index) => {
      btn.disabled = false;
      btn.innerHTML = originalTexts[index];
    });

    if (!res.success)
      return showAdminToast("No se pudo cargar el taller para editar", "error");

    const workshop = res.data.find((w) => w.id === id);
    if (!workshop) return showAdminToast("Taller no encontrado", "error");

    this.openWorkshopForm(workshop);
  },

  openWorkshopForm(workshop = null) {
    const title = document.getElementById("wsModalTitle");

    if (workshop) {
      title.innerHTML = '<i class="fas fa-chalkboard"></i> Editar Taller';
      document.getElementById("wsId").value = workshop.id;
      document.getElementById("wsName").value = workshop.name;
      document.getElementById("wsDescription").value = workshop.description;
      document.getElementById("wsInstructor").value =
        workshop.instructor_id || "";
      document.getElementById("wsInstructorSearch").value =
        workshop.instructor_name || "";
      document.getElementById("wsDate").value = workshop.schedule_date;
      document.getElementById("wsDateEnd").value = workshop.schedule_date_end;
      document.getElementById("wsTimeStart").value = workshop.schedule_start;
      document.getElementById("wsTimeEnd").value = workshop.schedule_end;
      document.getElementById("wsBuilding").value = workshop.building;
      document.getElementById("wsRoom").value = workshop.room;
      document.getElementById("wsLocation").value =
        workshop.location_type === "internal" ? workshop.location : "";
      document.getElementById("wsLocationExternal").value =
        workshop.location_type === "external" ? workshop.location : "";
      document.getElementById("wsCapacity").value = workshop.max_capacity;
      document.getElementById("wsStatus").value = workshop.status;
      document.getElementById("wsRequirements").value = workshop.requirements;

      this.tags.topics = workshop.topics || [];
      this.tags.materials = workshop.materials || [];

      this.loadImages(workshop.id);
      this.toggleLocationType(workshop.location_type || "internal");
    } else {
      title.innerHTML = '<i class="fas fa-chalkboard"></i> Nuevo Taller';
      document.getElementById("workshopForm").reset();
      document.getElementById("wsId").value = "";
      this.tags = { topics: [], materials: [] };
      document.getElementById("wsImageGrid").innerHTML = "";
      document.getElementById("wsMapImageGrid").innerHTML = "";
      this.toggleLocationType("internal");
    }

    this.renderTags("topics");
    this.renderTags("materials");

    document.getElementById("workshopModal").classList.remove("hidden");
    document.getElementById("workshopModal").classList.add("show");
  },

  closeWorkshopModal() {
    document.getElementById("workshopModal").classList.remove("show");
    document.getElementById("workshopModal").classList.add("hidden");
  },

  async openEnrollmentsModal(workshopId) {
    const modal = document.getElementById("wsEnrollmentsModal");
    const title = document.getElementById("wsEnrollmentsTitle");
    const list = document.getElementById("wsEnrollmentsList");
    if (!modal || !title || !list) return;

    list.innerHTML =
      '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Cargando alumnos...</div>';
    modal.classList.remove("hidden");
    modal.classList.add("show");

    const res = await wsFetch("enrollments", { workshop_id: workshopId });
    const workshopRes = await wsFetch("list");
    const workshop = workshopRes.data.find((w) => w.id === workshopId);
    if (workshop) title.textContent = workshop.name;

    if (!res.success) {
      list.innerHTML =
        '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>No se pudo cargar la lista.</p></div>';
      return;
    }
    if (res.data.length === 0) {
      list.innerHTML =
        '<div class="empty-state"><i class="fas fa-user-graduate"></i><p>Aún no hay alumnos inscritos en este taller.</p></div>';
      return;
    }
    list.innerHTML = `<div class="table-scroll"><table class="registros-table"><thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Escuela</th><th>Inscrito el</th></tr></thead><tbody>${res.data.map((s) => `<tr><td>${s.full_name || "N/A"}</td><td>${s.email || "N/A"}</td><td>${s.phone || "N/A"}</td><td>${s.school || "N/A"}</td><td>${new Date(s.enrolled_at).toLocaleString("es-MX")}</td></tr>`).join("")}</tbody></table></div>`;
  },

  closeEnrollmentsModal() {
    const modal = document.getElementById("wsEnrollmentsModal");
    if (modal) {
      modal.classList.remove("show");
      modal.classList.add("hidden");
    }
  },

  toggleLocationType(type) {
    document.getElementById("wsLocationTypeInternal").checked =
      type === "internal";
    document.getElementById("wsLocationTypeExternal").checked =
      type === "external";
    document.getElementById("wsInternalLocation").style.display =
      type === "internal" ? "block" : "none";
    document.getElementById("wsExternalLocation").style.display =
      type === "external" ? "block" : "none";
    document.getElementById("wsMapImagesSection").style.display =
      type === "external" ? "block" : "none";
  },

  // --- Etiquetas (Tags) ---
  addTag(type) {
    const input = document.getElementById(
      type === "topics" ? "wsTopicInput" : "wsMaterialInput",
    );
    const val = input.value.trim();
    if (val && !this.tags[type].includes(val)) {
      this.tags[type].push(val);
      input.value = "";
      this.renderTags(type);
    }
  },

  removeTag(type, val) {
    this.tags[type] = this.tags[type].filter((t) => t !== val);
    this.renderTags(type);
  },

  renderTags(type) {
    const container = document.getElementById(
      type === "topics" ? "wsTopicTags" : "wsMaterialTags",
    );
    if (!container) return;
    container.innerHTML = this.tags[type]
      .map(
        (t) => `
            <span class="badge badge-accent" style="margin-right:4px; margin-bottom:4px; display:inline-flex; align-items:center;">
                ${t} <i class="fas fa-times" style="cursor:pointer; margin-left:6px;" onclick="workshopModule.removeTag('${type}', '${t}')"></i>
            </span>
        `,
      )
      .join("");
  },

  // --- Guardado ---
  async saveInstructor() {
    const btn = document.querySelector("#instructorModal .btn-primary");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const id = document.getElementById("instrId").value;
    const payload = {
      action: "save_instructor",
      id: id,
      full_name: document.getElementById("instrName").value,
      email: document.getElementById("instrEmail").value,
      phone: document.getElementById("instrPhone").value,
      specialty: document.getElementById("instrSpecialty").value,
      bio: document.getElementById("instrBio").value,
      username: document.getElementById("instrUsername").value,
      password: document.getElementById("instrPassword").value,
      role_type: "instructor",
    };

    if (!payload.full_name) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
      return showAdminToast("El nombre es obligatorio", "error");
    }
    if (!id && !payload.username) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
      return showAdminToast(
        "El nombre de usuario es obligatorio para nuevos profesores",
        "error",
      );
    }

    const res = await wsPost(payload);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

    if (res.success) {
      showAdminToast("Profesor guardado con éxito", "success");
      this.closeInstructorModal();
      this.loadInstructors();
      this.loadWorkshops();
    } else {
      showAdminToast(res.error, "error");
    }
  },

  async saveWorkshop(isDraftForUpload = false) {
    const btn = document.querySelector("#workshopModal .btn-primary");
    const originalText = btn ? btn.innerHTML : "";
    if (btn && !isDraftForUpload) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const locType = document.getElementById("wsLocationTypeInternal").checked
      ? "internal"
      : "external";

    const payload = {
      action: "save_workshop",
      id: document.getElementById("wsId").value,
      name:
        document.getElementById("wsName").value ||
        (isDraftForUpload ? "Borrador sin nombre" : ""),
      description: document.getElementById("wsDescription").value,
      instructor_id: document.getElementById("wsInstructor").value,
      is_multi_day: 0,
      schedule_date: document.getElementById("wsDate").value,
      schedule_date_end: document.getElementById("wsDateEnd").value,
      schedule_start: document.getElementById("wsTimeStart").value,
      schedule_end: document.getElementById("wsTimeEnd").value,
      location_type: locType,
      building: document.getElementById("wsBuilding").value,
      room: document.getElementById("wsRoom").value,
      location:
        locType === "internal"
          ? document.getElementById("wsLocation").value
          : document.getElementById("wsLocationExternal").value,
      max_capacity: document.getElementById("wsCapacity").value,
      status: document.getElementById("wsStatus").value,
      requirements: document.getElementById("wsRequirements").value,
      topics: this.tags.topics,
      materials: this.tags.materials,
    };

    if (!isDraftForUpload && !payload.name) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
      return showAdminToast("El nombre del taller es obligatorio", "error");
    }

    const res = await wsPost(payload);

    if (btn && !isDraftForUpload) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

    if (res.success) {
      const workshopId = res.id;
      document.getElementById("wsId").value = workshopId;

      if (!isDraftForUpload) {
        showAdminToast("Taller guardado correctamente", "success");
        this.closeWorkshopModal();
        this.loadWorkshops();
      }
      return true;
    } else {
      showAdminToast(res.error, "error");
      return false;
    }
  },

  // --- Imágenes (Galería y Mapas) ---
  handleDrop(event, type) {
    const files = event.dataTransfer.files;
    if (!files || !files.length) return;
    if (type === "gallery") {
      this.uploadGalleryImages(files);
    } else if (type === "map") {
      this.uploadMapImage(files);
    }
  },

  async uploadGalleryImages(files = null) {
    let wsId = document.getElementById("wsId").value;
    if (!wsId) {
      showAdminToast("Guardando taller base para subir imágenes...", "info");
      const saved = await this.saveWorkshop(true);
      if (!saved) return;
      wsId = document.getElementById("wsId").value;
    }

    if (!files) {
      const input = document.getElementById("wsImageInput");
      files = input.files;
    }

    let fileArray = Array.from(files);
    if (!fileArray || !fileArray.length) return;

    // Limitar a máximo 3 imágenes en la galería
    const currentImages =
      document.querySelectorAll("#wsImageGrid > div").length;
    if (currentImages + fileArray.length > 3) {
      showAdminToast(
        "Solo puedes tener hasta 3 imágenes de galería/portada",
        "warning",
      );
      fileArray = fileArray.slice(0, Math.max(0, 3 - currentImages));
      if (fileArray.length === 0) return;
    }

    showAdminToast("Subiendo imágenes...", "info");
    const dropzone = document.getElementById("wsImageDropzone");
    if (dropzone) dropzone.style.opacity = "0.5";

    const progContainer = document.getElementById("wsImageProgressContainer");
    const progText = document.getElementById("wsImageProgressText");
    const progPercent = document.getElementById("wsImageProgressPercent");
    const progBar = document.getElementById("wsImageProgressBar");
    if (progContainer) progContainer.style.display = "block";

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      let file = fileArray[i];
      if (progText)
        progText.textContent = `Subiendo imagen ${i + 1} de ${fileArray.length}...`;
      if (progPercent) progPercent.textContent = "0%";
      if (progBar) progBar.style.width = "0%";

      const formData = new FormData();
      formData.append("action", "upload_image");
      formData.append("workshop_id", wsId);
      formData.append("image_type", "gallery");
      formData.append("image", file);

      const data = await wsUploadWithProgress(WS_API, formData, (percent) => {
        if (progPercent) progPercent.textContent = `${percent}%`;
        if (progBar) progBar.style.width = `${percent}%`;
      });

      if (data.success) {
        successCount++;
      } else {
        showAdminToast(data.error || "Error al subir", "error");
        errorCount++;
      }
    }

    const input = document.getElementById("wsImageInput");
    if (input) input.value = "";
    if (dropzone) dropzone.style.opacity = "1";
    if (progContainer) progContainer.style.display = "none";

    await this.loadImages(wsId);

    if (successCount > 0 && errorCount === 0) {
      showAdminToast(
        `${successCount} ${successCount === 1 ? "imagen subida" : "imágenes subidas"} correctamente`,
        "success",
      );
    } else if (successCount > 0 && errorCount > 0) {
      showAdminToast(
        `Se subieron ${successCount} imágenes, pero hubo ${errorCount} errores`,
        "warning",
      );
    }
  },

  async uploadMapImage(files = null) {
    let wsId = document.getElementById("wsId").value;
    if (!wsId)
      return showAdminToast(
        "Primero guarda el taller para añadir mapas",
        "warning",
      );

    if (!files) {
      const input = document.getElementById("wsMapImageInput");
      files = input.files;
    }
    let fileArray = Array.from(files);
    if (!fileArray || !fileArray.length) return;

    const currentImages = document.querySelectorAll(
      "#wsMapImageGrid > div",
    ).length;
    if (currentImages + fileArray.length > 2) {
      showAdminToast("Solo puedes tener hasta 2 mapas/cronogramas", "warning");
      fileArray = fileArray.slice(0, Math.max(0, 2 - currentImages));
      if (fileArray.length === 0) return;
    }

    showAdminToast("Subiendo mapas...", "info");
    const dropzone = document.getElementById("wsMapImageDropzone");
    if (dropzone) dropzone.style.opacity = "0.5";

    const progContainer = document.getElementById(
      "wsMapImageProgressContainer",
    );
    const progText = document.getElementById("wsMapImageProgressText");
    const progPercent = document.getElementById("wsMapImageProgressPercent");
    const progBar = document.getElementById("wsMapImageProgressBar");
    if (progContainer) progContainer.style.display = "block";

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fileArray.length; i++) {
      let file = fileArray[i];
      if (progText)
        progText.textContent = `Subiendo mapa ${i + 1} de ${fileArray.length}...`;
      if (progPercent) progPercent.textContent = "0%";
      if (progBar) progBar.style.width = "0%";

      const formData = new FormData();
      formData.append("action", "upload_image");
      formData.append("workshop_id", wsId);
      formData.append("image_type", "map");
      formData.append("image", file);

      const data = await wsUploadWithProgress(WS_API, formData, (percent) => {
        if (progPercent) progPercent.textContent = `${percent}%`;
        if (progBar) progBar.style.width = `${percent}%`;
      });

      if (data.success) {
        successCount++;
      } else {
        showAdminToast(data.error || "Error al subir", "error");
        errorCount++;
      }
    }

    const input = document.getElementById("wsMapImageInput");
    if (input) input.value = "";
    if (dropzone) dropzone.style.opacity = "1";
    if (progContainer) progContainer.style.display = "none";

    await this.loadImages(wsId);

    if (successCount > 0 && errorCount === 0) {
      showAdminToast(
        `${successCount} ${successCount === 1 ? "mapa subido" : "mapas subidos"} correctamente`,
        "success",
      );
    } else if (successCount > 0 && errorCount > 0) {
      showAdminToast(
        `Se subieron ${successCount} mapas, pero hubo ${errorCount} errores`,
        "warning",
      );
    }
  },

  async loadImages(wsId) {
    const res = await wsFetch("workshop_images", { workshop_id: wsId });
    if (!res.success) return;

    const gallery = res.data.filter((img) => img.image_type === "gallery");
    const maps = res.data.filter((img) => img.image_type === "map");

    const grid = document.getElementById("wsImageGrid");
    if (grid) {
      grid.innerHTML = gallery
        .map((img) => {
          const displayUrl = img.url.startsWith("/uploads/")
            ? "/app" + img.url
            : img.url;
          return `
                <div style="position:relative; width:120px; height:90px; border-radius:8px; overflow:hidden; border: ${img.is_cover ? "3px solid var(--accent)" : "1px solid var(--border-md)"}">
                    <img src="${displayUrl}" style="width:100%; height:100%; object-fit:cover;">
                    <div style="position:absolute; top:4px; right:4px; display:flex; gap:4px;">
                        <button type="button" onclick="workshopModule.setCover(${img.id})" class="btn btn-secondary" style="padding:4px 6px;"><i class="fas fa-star" style="color:${img.is_cover ? "var(--accent)" : "#fff"}"></i></button>
                        <button type="button" onclick="workshopModule.deleteImage(${img.id})" class="btn btn-danger" style="padding:4px 6px;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        })
        .join("");
    }

    const mapGrid = document.getElementById("wsMapImageGrid");
    if (mapGrid) {
      mapGrid.innerHTML = maps
        .map((img) => {
          const displayUrl = img.url.startsWith("/uploads/")
            ? "/app" + img.url
            : img.url;
          return `
                <div style="position:relative; width:120px; height:90px; border-radius:8px; overflow:hidden; border: 1px solid var(--green);">
                    <img src="${displayUrl}" style="width:100%; height:100%; object-fit:cover;">
                    <button type="button" onclick="workshopModule.deleteImage(${img.id})" class="btn btn-danger" style="position:absolute; top:4px; right:4px; padding:4px 6px;"><i class="fas fa-trash"></i></button>
                </div>
            `;
        })
        .join("");
    }
  },

  async setCover(imageId) {
    const wsId = document.getElementById("wsId").value;
    const res = await wsPost({
      action: "set_cover_image",
      workshop_id: wsId,
      image_id: imageId,
    });
    if (res.success) this.loadImages(wsId);
  },

  async deleteImage(imageId) {
    const isConfirmed = await (window.customConfirm
      ? window.customConfirm(
          "¿Estás seguro de que quieres eliminar esta imagen?",
          "Eliminar Foto",
        )
      : confirm("¿Eliminar imagen?"));
    if (!isConfirmed) return;

    const res = await wsPost({ action: "delete_image", image_id: imageId });
    if (res.success) this.loadImages(document.getElementById("wsId").value);
  },
};

// =========================================================
// MÓDULO: CONFERENCIAS
// =========================================================
const conferencesModule = {
  tags: [],

  init() {
    this.render();
  },

  async render() {
    const res = await wsFetch("list_conferences");
    const grid = document.getElementById("conferenceGrid");
    if (!grid || !res.success) return;

    let data = res.data;
    const filter = document.getElementById("confStatusFilter")
      ? document.getElementById("confStatusFilter").value
      : "";
    if (filter) data = data.filter((c) => c.status === filter);

    if (data.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column: 1/-1;"><i class="fas fa-microphone-alt"></i><h3>No hay conferencias</h3></div>';
      return;
    }

    grid.innerHTML = data
      .map(
        (c) => `
            <div class="content-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <h4 style="margin:0; font-size:16px; color:var(--primary-blue);">${c.name}</h4>
                    <span class="badge ${c.status === "published" ? "badge-approved" : "badge-pending"}">${c.status.toUpperCase()}</span>
                </div>
                <p style="font-size:13px; color:var(--text-mute); margin:0 0 10px 0;"><i class="fas fa-user-tie"></i> Ponente: <strong>${c.speaker_name || "Pendiente"}</strong></p>
                <p style="font-size:12px; color:var(--text-body); margin:0 0 14px 0;"><i class="fas fa-map-marker-alt"></i> ${c.location || "Por definir"} <br> <i class="fas fa-calendar"></i> ${c.conference_date || "Sin fecha"} | ${c.time_start || "--:--"}</p>
                <div style="text-align:right; border-top:1px solid var(--border); padding-top:12px;">
                    <button class="btn btn-secondary btn-small" onclick="conferencesModule.edit(${c.id})"><i class="fas fa-edit"></i> Editar Conf.</button>
                </div>
            </div>
        `,
      )
      .join("");
  },

  async edit(id) {
    const btns = document.querySelectorAll(
      `button[onclick="conferencesModule.edit(${id})"]`,
    );
    const originalTexts = [];
    btns.forEach((btn) => {
      originalTexts.push(btn.innerHTML);
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
    });

    const res = await wsFetch("list_conferences");

    btns.forEach((btn, index) => {
      btn.disabled = false;
      btn.innerHTML = originalTexts[index];
    });

    if (!res.success)
      return showAdminToast("No se pudo cargar la conferencia", "error");

    const conf = res.data.find((c) => c.id === id);
    if (!conf) return showAdminToast("Conferencia no encontrada", "error");

    this.openForm(conf);
  },

  openForm(conf = null) {
    const title = document.getElementById("confModalTitle");
    if (conf) {
      title.innerHTML =
        '<i class="fas fa-microphone-alt"></i> Editar Conferencia';
      document.getElementById("confId").value = conf.id;
      document.getElementById("confName").value = conf.name;
      document.getElementById("confDescription").value = conf.description;
      document.getElementById("confSpeakerName").value = conf.speaker_name;
      document.getElementById("confSpeakerTitle").value = conf.speaker_title;
      document.getElementById("confSpeakerOrg").value = conf.speaker_org;
      document.getElementById("confDate").value = conf.conference_date;
      document.getElementById("confTimeStart").value = conf.time_start;
      document.getElementById("confTimeEnd").value = conf.time_end;
      document.getElementById("confBuilding").value = conf.building || "";
      document.getElementById("confRoom").value = conf.room || "";
      document.getElementById("confLocation").value =
        conf.location_type === "internal" ? conf.location || "" : "";
      document.getElementById("confLocationExternal").value =
        conf.location_type === "external" ? conf.location || "" : "";
      document.getElementById("confCapacity").value = conf.capacity || "100";
      document.getElementById("confLanguage").value =
        conf.language || "Español";
      document.getElementById("confStatus").value = conf.status || "draft";
      document.getElementById("confLiveUrl").value = conf.live_stream_url || "";
      this.tags = conf.tags || [];
      this.toggleLocationType(conf.location_type || "internal");
    } else {
      title.innerHTML =
        '<i class="fas fa-microphone-alt"></i> Nueva Conferencia';
      document.getElementById("confId").value = "";
      document.getElementById("confName").value = "";
      document.getElementById("confDescription").value = "";
      document.getElementById("confSpeakerName").value = "";
      document.getElementById("confSpeakerTitle").value = "";
      document.getElementById("confSpeakerOrg").value = "";
      document.getElementById("confDate").value = "";
      document.getElementById("confTimeStart").value = "";
      document.getElementById("confTimeEnd").value = "";
      document.getElementById("confBuilding").value = "";
      document.getElementById("confRoom").value = "";
      document.getElementById("confLocation").value = "";
      document.getElementById("confLocationExternal").value = "";
      document.getElementById("confCapacity").value = "100";
      document.getElementById("confLanguage").value = "Español";
      document.getElementById("confStatus").value = "draft";
      document.getElementById("confLiveUrl").value = "";
      this.tags = [];
      this.toggleLocationType("internal");
    }

    this.renderTags();
    document.getElementById("conferenceModal").classList.remove("hidden");
    document.getElementById("conferenceModal").classList.add("show");
  },

  closeForm() {
    document.getElementById("conferenceModal").classList.remove("show");
    document.getElementById("conferenceModal").classList.add("hidden");
  },

  toggleLocationType(type) {
    document.querySelector(
      `input[name="confLocationType"][value="${type}"]`,
    ).checked = true;
    document.getElementById("confInternalLoc").style.display =
      type === "internal" ? "block" : "none";
    document.getElementById("confExternalLoc").style.display =
      type === "external" ? "block" : "none";
  },

  addTag() {
    const input = document.getElementById("confTagInput");
    if (!input) return;
    const val = input.value.trim();
    if (val && !this.tags.includes(val)) {
      this.tags.push(val);
      input.value = "";
      this.renderTags();
    }
  },

  removeTag(val) {
    this.tags = this.tags.filter((t) => t !== val);
    this.renderTags();
  },

  renderTags() {
    const container = document.getElementById("confTagContainer");
    if (!container) return;
    container.innerHTML = this.tags
      .map(
        (t) => `
            <span class="badge badge-accent" style="margin-right:4px; margin-bottom:4px; display:inline-flex; align-items:center;">
                ${t} <i class="fas fa-times" style="cursor:pointer; margin-left:6px;" onclick="conferencesModule.removeTag('${t}')"></i>
            </span>
        `,
      )
      .join("");
  },

  async save() {
    const btn = document.querySelector("#conferenceModal .btn-primary");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    }

    const locType = document.querySelector(
      'input[name="confLocationType"]:checked',
    ).value;
    const payload = {
      action: "save_conference",
      id: document.getElementById("confId").value,
      name: document.getElementById("confName").value,
      description: document.getElementById("confDescription").value,
      speaker_name: document.getElementById("confSpeakerName").value,
      speaker_title: document.getElementById("confSpeakerTitle").value,
      speaker_org: document.getElementById("confSpeakerOrg").value,
      location_type: locType,
      building: document.getElementById("confBuilding").value,
      room: document.getElementById("confRoom").value,
      location:
        locType === "internal"
          ? document.getElementById("confLocation").value
          : document.getElementById("confLocationExternal").value,
      conference_date: document.getElementById("confDate").value,
      time_start: document.getElementById("confTimeStart").value,
      time_end: document.getElementById("confTimeEnd").value,
      capacity: document.getElementById("confCapacity").value,
      language: document.getElementById("confLanguage").value,
      status: document.getElementById("confStatus").value,
      live_stream_url: document.getElementById("confLiveUrl").value,
      tags: this.tags,
    };

    if (!payload.name) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
      return showAdminToast(
        "El nombre de la conferencia es obligatorio",
        "error",
      );
    }

    const res = await wsPost(payload);

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }

    if (res.success) {
      showAdminToast("Conferencia guardada");
      this.closeForm();
      this.render();
    } else {
      showAdminToast(res.error, "error");
    }
  },
};

// Asegurarnos que existe "conferenceModule" como alias si lo llama el HTML
window.conferenceModule = conferencesModule;

// Inicialización al cargar el documento
document.addEventListener("DOMContentLoaded", () => {
  workshopModule.init();
  conferencesModule.init();
});
