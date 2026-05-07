// ===== FUNCIONAMIENTO PÁGINA DE REGISTRO - VERSIÓN 2 =====

let robotCount = 1;
let memberCount = 0;
let selectedPaymentFile = null;
let currentWizardStep = 1;
const WIZARD_STEP_TITLES = {
  1: "Origen",
  2: "Robots",
  3: "Tripulación",
  4: "Revisión y Pago",
  5: "Finalizar",
};
const DRAFT_STORAGE_KEY = "renovatec_registro_draft_v1";
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 48;
let draftSaveTimer = null;
let isRestoringDraft = false;

function showAppMessage(message, type = "info") {
  let container = document.getElementById("appToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "appToastContainer";
    container.className = "app-toast-container";
    document.body.appendChild(container);
  }

  const iconByType = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
  };

  const toast = document.createElement("div");
  toast.className = `app-toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${iconByType[type] || iconByType.info}"></i>
    <p>${message}</p>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (container && !container.children.length) {
      container.remove();
    }
  }, 3800);
}

function renderReviewSummary() {
  const reviewContent = document.getElementById("reviewSummaryContent");
  if (!reviewContent) {
    return;
  }

  const captainName =
    document.querySelector('[name="captain-name"]')?.value?.trim() || "-";
  const captainEmail =
    document.querySelector('[name="captain-email"]')?.value?.trim() || "-";
  const captainPhone =
    document.querySelector('[name="captain-phone"]')?.value?.trim() || "-";
  const escuela = document.getElementById("escuelaValue")?.value || "-";

  const robots = [];
  document.querySelectorAll(".robot-row").forEach((row) => {
    const categoryText = row
      .querySelector(".robot-category option:checked")
      ?.textContent?.trim();
    const name = row.querySelector(".robot-name")?.value?.trim();
    if (categoryText && name) {
      robots.push(`${name} (${categoryText})`);
    }
  });

  const members = [];
  members.push(`Capitán: ${captainName}`);
  document.querySelectorAll(".member-name").forEach((input, index) => {
    if (input.value.trim()) {
      members.push(`Integrante ${index + 2}: ${input.value.trim()}`);
    }
  });

  const robotsList = robots.length
    ? `<ul>${robots.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "<p>No hay robots capturados.</p>";

  const membersList = members.length
    ? `<ul>${members.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "<p>No hay integrantes capturados.</p>";

  reviewContent.innerHTML = `
    <div class="review-summary-panel">
      <h4>Datos del Capitán</h4>
      <ul>
        <li>Nombre: ${captainName}</li>
        <li>Email: ${captainEmail}</li>
        <li>Teléfono: ${captainPhone}</li>
        <li>Escuela: ${escuela}</li>
      </ul>
    </div>
    <div class="review-summary-panel">
      <h4>Robots Registrados</h4>
      ${robotsList}
    </div>
    <div class="review-summary-panel">
      <h4>Integrantes</h4>
      ${membersList}
    </div>
    <div class="review-summary-panel">
      <h4>Pago Estimado</h4>
      <ul>
        <li>Robots: ${document.getElementById("summary-robots-count")?.textContent || "0"}</li>
        <li>Precio por robot: ${document.getElementById("summary-price-per-robot")?.textContent || "$0 MXN"}</li>
        <li>Total: ${document.getElementById("summary-total-cost")?.textContent || "$0 MXN"}</li>
      </ul>
    </div>
  `;
}

function getProjectBasePath() {
  return "";
}

function getApiUrl(endpoint) {
  return `/app/api/${endpoint}`;
}

function getDraftData() {
  const robots = [];
  document.querySelectorAll(".robot-row").forEach((row) => {
    robots.push({
      category: row.querySelector(".robot-category")?.value || "",
      name: row.querySelector(".robot-name")?.value?.trim() || "",
    });
  });

  const members = [];
  document.querySelectorAll(".member-name").forEach((input) => {
    if (input.value.trim()) {
      members.push(input.value.trim());
    }
  });

  return {
    savedAt: Date.now(),
    paisOrigen:
      document.querySelector('input[name="pais_origen"]:checked')?.value ||
      "mexico",
    estadoValue: document.getElementById("estadoValue")?.value || "",
    estadoSearch: document.getElementById("estadoSearch")?.value || "",
    paisValue: document.getElementById("paisValue")?.value || "",
    paisCustom: document.getElementById("paisCustom")?.value || "",
    tipoInstitucion:
      document.querySelector('input[name="tipo_institucion"]:checked')?.value ||
      "preparatoria",
    escuelaSearch: document.getElementById("escuelaSearch")?.value || "",
    escuelaValue: document.getElementById("escuelaValue")?.value || "",
    captainName: document.querySelector('[name="captain-name"]')?.value || "",
    captainEmail: document.querySelector('[name="captain-email"]')?.value || "",
    captainPhone: document.querySelector('[name="captain-phone"]')?.value || "",
    members,
    robots,
    acceptance: document.getElementById("acceptanceCheckbox")?.checked || false,
    selectedStageKey:
      typeof getSelectedStageKey === "function" ? getSelectedStageKey() : null,
  };
}

function saveDraftNow() {
  if (isRestoringDraft) {
    return;
  }
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(getDraftData()));
  } catch {
    showAppMessage("No se pudo guardar el borrador local", "warning");
  }
}

function scheduleDraftSave() {
  if (isRestoringDraft) {
    return;
  }
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(saveDraftNow, 300);
}

function clearDraft(showMessage = true) {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
  if (showMessage) {
    showAppMessage("Borrador eliminado", "info");
  }
}

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    return;
  }

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    clearDraft(false);
    return;
  }

  if (!draft?.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
    clearDraft(false);
    return;
  }

  isRestoringDraft = true;

  // Origen
  const paisOrigen = draft.paisOrigen || "mexico";
  const originRadio = document.querySelector(
    `input[name="pais_origen"][value="${paisOrigen}"]`,
  );
  if (originRadio) {
    originRadio.checked = true;
    originRadio.dispatchEvent(new Event("change"));
  }

  document.getElementById("estadoValue").value = draft.estadoValue || "";
  document.getElementById("estadoSearch").value = draft.estadoSearch || "";
  document.getElementById("paisValue").value = draft.paisValue || "";
  document.getElementById("paisCustom").value = draft.paisCustom || "";

  const tipoInstitucion = draft.tipoInstitucion || "preparatoria";
  const tipoRadio = document.querySelector(
    `input[name="tipo_institucion"][value="${tipoInstitucion}"]`,
  );
  if (tipoRadio) {
    tipoRadio.checked = true;
    tipoRadio.dispatchEvent(new Event("change"));
  }

  document.getElementById("escuelaSearch").value = draft.escuelaSearch || "";
  document.getElementById("escuelaValue").value = draft.escuelaValue || "";

  // Capitán
  document.querySelector('[name="captain-name"]').value =
    draft.captainName || "";
  document.querySelector('[name="captain-email"]').value =
    draft.captainEmail || "";
  document.querySelector('[name="captain-phone"]').value =
    draft.captainPhone || "";

  // Robots dinámicos
  const robots = Array.isArray(draft.robots) ? draft.robots : [];
  const firstRow = document.querySelector(".robot-row");
  if (robots.length && firstRow) {
    firstRow.querySelector(".robot-category").value = robots[0].category || "";
    firstRow.querySelector(".robot-name").value = robots[0].name || "";

    for (let i = 1; i < robots.length; i++) {
      addRobotRow();
      const rows = document.querySelectorAll(".robot-row");
      const row = rows[rows.length - 1];
      row.querySelector(".robot-category").value = robots[i].category || "";
      row.querySelector(".robot-name").value = robots[i].name || "";
    }
  }

  // Integrantes dinámicos
  const members = Array.isArray(draft.members) ? draft.members : [];
  members.forEach((memberName) => {
    addMemberRow();
    const memberInputs = document.querySelectorAll(".member-name");
    const input = memberInputs[memberInputs.length - 1];
    if (input) {
      input.value = memberName;
    }
  });

  const acceptance = document.getElementById("acceptanceCheckbox");
  if (acceptance) {
    acceptance.checked = Boolean(draft.acceptance);
  }

  updateRobotsCost();
  isRestoringDraft = false;
  showAppMessage("Borrador recuperado automáticamente", "success");
}

const mexicanStates = {
  "mx-aguascalientes": "Aguascalientes",
  "mx-bajacalifornia": "Baja California",
  "mx-bajacaliforniasur": "Baja California Sur",
  "mx-campeche": "Campeche",
  "mx-chiapas": "Chiapas",
  "mx-chihuahua": "Chihuahua",
  "mx-cdmx": "Ciudad de México",
  "mx-coahuila": "Coahuila",
  "mx-colima": "Colima",
  "mx-durango": "Durango",
  "mx-estadomexico": "Estado de México",
  "mx-guanajuato": "Guanajuato",
  "mx-guerrero": "Guerrero",
  "mx-hidalgo": "Hidalgo",
  "mx-jalisco": "Jalisco",
  "mx-michoacan": "Michoacán",
  "mx-morelos": "Morelos",
  "mx-nayarit": "Nayarit",
  "mx-nuevoleon": "Nuevo León",
  "mx-oaxaca": "Oaxaca",
  "mx-puebla": "Puebla",
  "mx-queretaro": "Querétaro",
  "mx-quintanaroo": "Quintana Roo",
  "mx-sanluis": "San Luis Potosí",
  "mx-sinaloa": "Sinaloa",
  "mx-sonora": "Sonora",
  "mx-tabasco": "Tabasco",
  "mx-tamaulipas": "Tamaulipas",
  "mx-tlaxcala": "Tlaxcala",
  "mx-veracruz": "Veracruz",
  "mx-yucatan": "Yucatán",
  "mx-zacatecas": "Zacatecas",
};

const internationalCountries = {
  us: "Estados Unidos",
  ca: "Canadá",
  gt: "Guatemala",
  bz: "Belice",
  sv: "El Salvador",
  hn: "Honduras",
  ni: "Nicaragua",
  cr: "Costa Rica",
  pa: "Panamá",
};

document.addEventListener("DOMContentLoaded", () => {
  initRegistroPage();
});

function initRegistroPage() {
  const form = document.getElementById("registroForm");
  const btnNextStep1 = document.getElementById("btnNextStep1");
  const btnPrevStep2 = document.getElementById("btnPrevStep2");
  const btnNextStep2 = document.getElementById("btnNextStep2");
  const btnPrevStep3 = document.getElementById("btnPrevStep3");
  const btnGoToReview = document.getElementById("btnGoToReview");
  const btnPrevStep4 = document.getElementById("btnPrevStep4");
  const btnNextStep4 = document.getElementById("btnNextStep4");
  const btnPrevStep5 = document.getElementById("btnPrevStep5");
  const block4 = document.getElementById("block-4");
  const liabilityBlock = document.getElementById("liabilityBlock");
  const finalSubmitSection = document.getElementById("finalSubmitSection");
  const btnClearDraft = document.getElementById("btnClearDraft");

  if (block4) block4.style.display = "none";
  if (liabilityBlock) liabilityBlock.style.display = "none";
  if (finalSubmitSection) finalSubmitSection.style.display = "none";
  setWizardStep(1, false);

  // ===== Bloque 1: Origen (México/Exterior) =====
  const paisOrigenRadios = document.querySelectorAll(
    'input[name="pais_origen"]',
  );
  const mexicoSection = document.getElementById("mexico-section");
  const exteriorSection = document.getElementById("exterior-section");
  const estadoSearch = document.getElementById("estadoSearch");
  const estadoList = document.getElementById("estadoList");
  const paisCustom = document.getElementById("paisCustom");

  paisOrigenRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "mexico") {
        mexicoSection.style.display = "block";
        exteriorSection.style.display = "none";
        document.getElementById("estadoValue").required = true;
        document.getElementById("paisValue").required = false;
      } else {
        mexicoSection.style.display = "none";
        exteriorSection.style.display = "block";
        document.getElementById("estadoValue").required = false;
        document.getElementById("paisValue").required = true;
      }
    });
  });

  // Búsqueda de Estados
  estadoSearch.addEventListener("input", () => {
    const searchTerm = estadoSearch.value.toLowerCase();
    const matches = Object.entries(mexicanStates).filter(([key, value]) =>
      value.toLowerCase().includes(searchTerm),
    );

    if (matches.length > 0 && searchTerm) {
      estadoList.innerHTML = matches
        .map(
          ([key, value]) =>
            `<div class="search-item" data-value="${key}">${value}</div>`,
        )
        .join("");
      estadoList.style.display = "block";

      document.querySelectorAll(".search-item").forEach((item) => {
        item.addEventListener("click", () => {
          const value = item.getAttribute("data-value");
          document.getElementById("estadoValue").value = value;
          estadoSearch.value = mexicanStates[value];
          estadoList.style.display = "none";
          updateEscuelas("preparatoria", value);
        });
      });
    } else {
      estadoList.style.display = "none";
    }
  });

  // País personalizado
  paisCustom.addEventListener("change", () => {
    document.getElementById("paisValue").value = paisCustom.value;
  });

  // ===== Tipo de Institución (Preparatoria/Universidad) =====
  const tipoInstitucionRadios = document.querySelectorAll(
    'input[name="tipo_institucion"]',
  );
  const escuelaSearch = document.getElementById("escuelaSearch");

  tipoInstitucionRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const estado = document.getElementById("estadoValue").value;
      if (estado) {
        updateEscuelas(radio.value, estado);
      }
      escuelaSearch.value = "";
      document.getElementById("escuelaValue").value = "";
    });
  });

  // ===== Búsqueda de Escuelas (Autocompletado) =====
  escuelaSearch.addEventListener("input", () => {
    const searchTerm = escuelaSearch.value.toLowerCase();
    const estado = document.getElementById("estadoValue").value;
    const escuelaList = document.getElementById("escuelaList");

    if (
      !estado &&
      document.querySelector('input[name="pais_origen"]:checked')?.value !==
        "mexico"
    ) {
      escuelaList.style.display = "none";
      return;
    }

    const schools = getSchoolsByLocation(estado) || [];
    const matches = schools.filter((school) =>
      school.toLowerCase().includes(searchTerm),
    );

    if (matches.length > 0 && searchTerm) {
      escuelaList.innerHTML = matches
        .map(
          (school) =>
            `<div class="search-item" data-value="${school}"><i class="fas fa-graduation-cap"></i> ${school}</div>`,
        )
        .join("");
      escuelaList.style.display = "block";

      document.querySelectorAll(".search-item").forEach((item) => {
        item.addEventListener("click", () => {
          const value = item.getAttribute("data-value");
          document.getElementById("escuelaValue").value = value;
          escuelaSearch.value = value;
          escuelaList.style.display = "none";
        });
      });
    } else if (searchTerm) {
      escuelaList.innerHTML = `<div class="search-item-no-results">
        <i class="fas fa-info-circle"></i> No encontrada en la lista. Perfecto, puedes seguir con lo que escribiste.
      </div>`;
      escuelaList.style.display = "block";
    } else {
      escuelaList.style.display = "none";
    }
  });

  // Guardar la escuela escribida si no se selecciona de la lista
  escuelaSearch.addEventListener("blur", () => {
    const escuelaValue = document.getElementById("escuelaValue");
    if (!escuelaValue.value && escuelaSearch.value.trim()) {
      escuelaValue.value = escuelaSearch.value.trim();
    }
  });

  escuelaSearch.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const escuelaValue = document.getElementById("escuelaValue");
      if (!escuelaValue.value && escuelaSearch.value.trim()) {
        escuelaValue.value = escuelaSearch.value.trim();
      }
      document.getElementById("escuelaList").style.display = "none";
    }
  });

  // ===== Bloque 2: Tabla Dinámica de Robots =====
  const btnAddRobot = document.getElementById("btnAddRobot");
  btnAddRobot.addEventListener("click", addRobotRow);

  // ===== Bloque 3: Tabla Dinámica de Participantes =====
  const btnAddMember = document.getElementById("btnAddMember");
  btnAddMember.addEventListener("click", addMemberRow);

  // ===== Manejo de carga de archivo =====
  const fileUpload = document.getElementById("fileUpload");
  const paymentFile = document.getElementById("paymentFile");
  const filePreview = document.getElementById("filePreview");

  if (fileUpload) {
    fileUpload.addEventListener("click", (e) => {
      if (e.target.closest(".btn-remove-file")) return;
      paymentFile.click();
    });

    fileUpload.addEventListener("dragover", handleDragOver);
    fileUpload.addEventListener("dragleave", handleDragLeave);
    fileUpload.addEventListener("drop", handleFileDrop);
    paymentFile.addEventListener("change", handleFileSelect);
  }

  const removeBtn = document.querySelector(".btn-remove-file");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      paymentFile.value = "";
      selectedPaymentFile = null;
      filePreview.style.display = "none";
      document.querySelector(".file-upload-content").style.display = "block";
    });
  }

  // ===== Envío del formulario =====
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("input", scheduleDraftSave);
    form.addEventListener("change", scheduleDraftSave);
  }

  window.addEventListener("beforeunload", saveDraftNow);

  if (btnClearDraft) {
    btnClearDraft.addEventListener("click", () => clearDraft(true));
  }

  if (btnNextStep1) {
    btnNextStep1.addEventListener("click", () => {
      if (!validateStep1()) return;
      setWizardStep(2);
    });
  }

  if (btnPrevStep2) {
    btnPrevStep2.addEventListener("click", () => setWizardStep(1));
  }

  if (btnNextStep2) {
    btnNextStep2.addEventListener("click", () => {
      if (!validateStep2()) return;
      setWizardStep(3);
    });
  }

  if (btnPrevStep3) {
    btnPrevStep3.addEventListener("click", () => setWizardStep(2));
  }

  if (btnGoToReview) {
    btnGoToReview.addEventListener("click", () => {
      if (!validateStep3()) return;
      renderReviewSummary();
      setWizardStep(4);
      showAppMessage(
        "Revisión lista. Verifica tu resumen y continúa al Paso 5.",
        "info",
      );
    });
  }

  if (btnPrevStep4) {
    btnPrevStep4.addEventListener("click", () => setWizardStep(3));
  }

  if (btnNextStep4) {
    btnNextStep4.addEventListener("click", () => {
      if (!validateStep4()) return;
      setWizardStep(5);
    });
  }

  if (btnPrevStep5) {
    btnPrevStep5.addEventListener("click", () => setWizardStep(4));
  }

  // Inicializar resumen de costos con el precio vigente
  updateRobotsCost();

  // Recuperar borrador si existe
  restoreDraft();
}

function updateEscuelas(tipoInstitucion, estado) {
  const escuelaSearch = document.getElementById("escuelaSearch");
  escuelaSearch.value = "";
  document.getElementById("escuelaValue").value = "";
}

function updateWizardProgress(currentStep) {
  document.querySelectorAll(".progress-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step || 0);
    step.classList.remove("active", "completed");
    if (stepNumber < currentStep) {
      step.classList.add("completed");
    } else if (stepNumber === currentStep) {
      step.classList.add("active");
    }
  });
}

function updateWizardStepIndicator(step) {
  const indicator = document.getElementById("wizardStepIndicator");
  if (!indicator) return;
  const label = WIZARD_STEP_TITLES[step] || "Registro";
  indicator.textContent = `Paso ${step} de 5: ${label}`;
}

function setWizardStep(step, smoothScroll = true) {
  currentWizardStep = Math.max(1, Math.min(5, step));

  const block1 = document.getElementById("block-1");
  const block2 = document.getElementById("block-2");
  const block3 = document.getElementById("block-3");
  const block4 = document.getElementById("block-4");
  const liabilityBlock = document.getElementById("liabilityBlock");
  const finalSubmitSection = document.getElementById("finalSubmitSection");

  [block1, block2, block3, block4].forEach((block, index) => {
    if (!block) return;
    const blockStep = index + 1;
    const isCurrent = blockStep === currentWizardStep;
    block.classList.toggle("is-hidden-step", !isCurrent);
    block.style.display = isCurrent ? "block" : "none";
  });

  const showFinal = currentWizardStep === 5;
  if (liabilityBlock)
    liabilityBlock.style.display = showFinal ? "block" : "none";
  if (finalSubmitSection)
    finalSubmitSection.style.display = showFinal ? "block" : "none";

  updateWizardProgress(currentWizardStep);
  updateWizardStepIndicator(currentWizardStep);

  if (smoothScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function validateStep1() {
  const paisOrigen = document.querySelector(
    'input[name="pais_origen"]:checked',
  )?.value;

  if (
    paisOrigen === "mexico" &&
    !document.getElementById("estadoValue").value
  ) {
    showAppMessage("Por favor, selecciona un estado", "warning");
    return false;
  }

  if (
    paisOrigen === "exterior" &&
    !document.getElementById("paisCustom").value.trim()
  ) {
    showAppMessage("Por favor, escribe tu país", "warning");
    return false;
  }

  const escuelaValue = document.getElementById("escuelaValue").value;
  if (!escuelaValue) {
    showAppMessage("Por favor, selecciona o escribe una escuela", "warning");
    return false;
  }

  return true;
}

function validateStep2() {
  const robots = document.querySelectorAll(".robot-row");
  if (!robots.length) {
    showAppMessage("Debes agregar al menos un robot", "warning");
    return false;
  }

  let robotsValid = true;
  robots.forEach((row) => {
    const category = row.querySelector(".robot-category").value;
    const name = row.querySelector(".robot-name").value.trim();
    if (!category || !name) robotsValid = false;
  });

  if (!robotsValid) {
    showAppMessage(
      "Por favor, completa todos los datos de los robots",
      "warning",
    );
    return false;
  }

  return true;
}

function validateStep3() {
  const captainName = document
    .querySelector('[name="captain-name"]')
    .value.trim();
  const captainEmail = document
    .querySelector('[name="captain-email"]')
    .value.trim();
  const captainPhone = document
    .querySelector('[name="captain-phone"]')
    .value.trim();

  if (!captainName || !captainEmail || !captainPhone) {
    showAppMessage(
      "Por favor, completa todos los datos del capitán",
      "warning",
    );
    return false;
  }

  return true;
}

function validateStep4() {
  // Paso 4 es solo revisión visual del resumen.
  return true;
}

function addRobotRow() {
  const tbody = document.getElementById("robotsTableBody");
  const rowIndex = robotCount;

  const newRow = document.createElement("tr");
  newRow.className = "robot-row";
  newRow.setAttribute("data-robot-index", rowIndex);
  newRow.innerHTML = `
    <td>${robotCount + 1}</td>
    <td>
      <select name="robot-category" class="form-control robot-category" required>
        <option value="">-- Selecciona --</option>
        <option value="robot-guerra-1lb">Robot de guerra 1 lb</option>
        <option value="robot-guerra-3lb">Robot de guerra 3lb</option>
        <option value="seguidor-linea-profesional">Seguidor de línea profesional</option>
        <option value="seguidor-linea-amateur">Seguidor de línea amateur</option>
        <option value="carros-rc">Carros RC</option>
        <option value="soccer-rc">Soccer RC</option>
        <option value="mini-sumo-rc">Mini sumo RC</option>
        <option value="robot-insecto">Robot insecto</option>
      </select>
    </td>
    <td>
      <input type="text" name="robot-name" class="form-control robot-name" placeholder="Ej: Terminator X" required />
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-danger btn-remove-robot" data-robot-index="${rowIndex}">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(newRow);

  // Agregar evento a botón de eliminar
  const removeBtn = newRow.querySelector(".btn-remove-robot");
  removeBtn.addEventListener("click", () => {
    newRow.remove();
    updateRobotsCost();
  });

  robotCount++;
  updateRobotsCost();
}

function updateRobotsCost() {
  const robotRows = document.querySelectorAll(".robot-row");
  const totalRobots = robotRows.length;
  const costPerRobot =
    typeof getCurrentPrice === "function" && getCurrentPrice() > 0
      ? getCurrentPrice()
      : 500;
  const totalCost = totalRobots * costPerRobot;

  document.getElementById("total-robots-cost").textContent =
    `Total a pagar: $${totalCost.toLocaleString()} MXN (${totalRobots} ${totalRobots === 1 ? "robot" : "robots"})`;

  document.getElementById("summary-robots-count").textContent = totalRobots;
  document.getElementById("summary-total-cost").textContent =
    `$${totalCost.toLocaleString()} MXN`;

  const summaryPrice = document.getElementById("summary-price-per-robot");
  if (summaryPrice) {
    summaryPrice.textContent = `$${costPerRobot.toLocaleString()} MXN`;
  }
}

function addMemberRow() {
  const tbody = document.getElementById("membersTableBody");
  const rowIndex = memberCount;

  // Máximo 3 participantes totales (incluyendo capitán)
  if (memberCount >= 2) {
    showAppMessage("Máximo 3 participantes (incluyendo capitán)", "warning");
    return;
  }

  const newRow = document.createElement("tr");
  newRow.setAttribute("data-member-index", rowIndex);
  newRow.innerHTML = `
    <td>${rowIndex + 2}</td>
    <td>
      <input type="text" name="member-name" class="form-control member-name" placeholder="Nombre del participante" required />
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-danger btn-remove-member" data-member-index="${rowIndex}">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;

  tbody.appendChild(newRow);

  const removeBtn = newRow.querySelector(".btn-remove-member");
  removeBtn.addEventListener("click", () => {
    newRow.remove();
    memberCount--;
  });

  memberCount++;
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("fileUpload").classList.add("drag-over");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("fileUpload").classList.remove("drag-over");
}

function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("fileUpload").classList.remove("drag-over");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

function processFile(file) {
  const paymentFile = document.getElementById("paymentFile");
  const filePreview = document.getElementById("filePreview");
  const fileUploadContent = document.querySelector(".file-upload-content");

  // Validaciones
  const validTypes = ["application/pdf", "image/jpeg", "image/png"];
  const validExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const fileName = String(file.name || "").toLowerCase();
  const hasValidExtension = validExtensions.some((ext) =>
    fileName.endsWith(ext),
  );

  if (!validTypes.includes(file.type) && !hasValidExtension) {
    showAppMessage("Solo se aceptan PDF e imágenes JPG/PNG", "warning");
    return;
  }

  if (file.size > maxSize) {
    showAppMessage("El archivo no debe superar 5MB", "warning");
    return;
  }

  selectedPaymentFile = file;

  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    paymentFile.files = dt.files;
  } catch {
    // En algunos navegadores no se permite reasignar files.
  }

  // Mostrar preview
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("fileName").textContent = file.name;
    filePreview.style.display = "block";
    fileUploadContent.style.display = "none";
  };
  reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const button = form.querySelector('button[type="submit"]');
  const originalText = button.innerHTML;

  try {
    // Validar formulario
    if (!validateRegistrationForm(form)) {
      return;
    }

    button.disabled = true;
    updateWizardProgress(5);
    button.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Procesando registro...';

    // Recopilar datos
    const captainName = document.querySelector('[name="captain-name"]').value;
    const captainEmail = document.querySelector('[name="captain-email"]').value;
    const captainPhone = document.querySelector('[name="captain-phone"]').value;
    const escuela = document.getElementById("escuelaValue").value;

    // Recopilar robots
    const robots = [];
    document.querySelectorAll(".robot-row").forEach((row) => {
      const category = row.querySelector(".robot-category").value;
      const name = row.querySelector(".robot-name").value;
      if (category && name) {
        robots.push({ category, name });
      }
    });

    // Recopilar participantes adicionales (sin el capitán)
    const members = [];
    document.querySelectorAll(".member-name").forEach((input) => {
      if (input.value.trim()) {
        members.push(input.value.trim());
      }
    });

    const registrationData = {
      paisOrigen: document.querySelector('input[name="pais_origen"]:checked')
        .value,
      estadoId: document.getElementById("estadoValue").value,
      estadoNombre:
        document.getElementById("estadoLabel")?.textContent ||
        document.getElementById("estadoValue").value,
      paisNombre:
        document.getElementById("paisCustom").value ||
        document.getElementById("paisValue").value,
      tipoInstitucion: document.querySelector(
        'input[name="tipo_institucion"]:checked',
      ).value,
      escuela,
      captainName,
      captainEmail,
      captainPhone,
      members,
      robots,
      selectedStageKey:
        typeof getSelectedStageKey === "function"
          ? getSelectedStageKey()
          : null,
      acceptance: document.getElementById("acceptanceCheckbox").checked,
    };

    const response = await fetch(getApiUrl("register-team.php"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(registrationData),
    });

    const rawResponse = await response.text();
    let result;
    try {
      result = JSON.parse(rawResponse);
    } catch {
      throw new Error(
        "El servidor no respondió JSON válido. Verifica la ruta del backend y el servidor PHP.",
      );
    }

    if (!response.ok) {
      throw new Error(result.error || `Error HTTP ${response.status}`);
    }

    if (!result.success) {
      throw new Error(result.error || "Error al registrar el equipo");
    }

    // Subir comprobante de pago asociado al team_id
    const fileToUpload = getSelectedPaymentFile();
    if (fileToUpload) {
      const formData = new FormData();
      formData.append("team_id", String(result.data.team_id));
      formData.append("receipt", fileToUpload);

      const uploadResponse = await fetch(getApiUrl("upload-receipt.php"), {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formData,
      });

      const uploadRaw = await uploadResponse.text();
      let uploadResult;
      try {
        uploadResult = JSON.parse(uploadRaw);
      } catch {
        throw new Error("Respuesta inválida al subir comprobante");
      }

      if (!uploadResponse.ok) {
        throw new Error(
          uploadResult.error || `Error HTTP ${uploadResponse.status}`,
        );
      }

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Error al subir comprobante");
      }
    }

    // Guardar último registro para QR
    localStorage.setItem("lastRegistro", JSON.stringify(result.data));
    localStorage.setItem("registroFolio", result.data.folio);
    clearDraft(false);

    // Redirigir a confirmación con folio
    setTimeout(() => {
      window.location.href = `/confirmacion?folio=${result.data.folio}`;
    }, 500);
  } catch (error) {
    console.error("Error en registro:", error);
    showAppMessage(`Error: ${error.message}`, "error");
    updateWizardProgress(4);
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

function getSelectedPaymentFile() {
  const paymentFileInput = document.getElementById("paymentFile");
  if (paymentFileInput?.files?.length) {
    return paymentFileInput.files[0];
  }
  return selectedPaymentFile;
}

function validateRegistrationForm(form) {
  if (!validateRegistrationCore()) {
    return false;
  }

  // Validar archivo de pago
  const paymentFile = getSelectedPaymentFile();
  if (!paymentFile) {
    showAppMessage("Por favor, sube el comprobante de pago", "warning");
    return false;
  }

  // Validar Bloque 1: Origen
  const acceptanceCheckbox = document.getElementById("acceptanceCheckbox");
  if (!acceptanceCheckbox || !acceptanceCheckbox.checked) {
    showAppMessage("Debes aceptar los términos de responsabilidad", "warning");
    return false;
  }

  return true;
}

function validateRegistrationCore() {
  return validateStep1() && validateStep2() && validateStep3();
}
