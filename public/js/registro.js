// ===== FUNCIONAMIENTO PÁGINA DE REGISTRO =====

document.addEventListener("DOMContentLoaded", () => {
  initRegistroPage();
});

function initRegistroPage() {
  const form = document.getElementById("registroForm");
  const locationSelect = document.getElementById("locationSelect");
  const schoolSelect = document.getElementById("schoolSelect");
  const schoolCustom = document.getElementById("schoolCustom");
  const fileUpload = document.getElementById("fileUpload");
  const paymentFile = document.getElementById("paymentFile");
  const filePreview = document.getElementById("filePreview");

  // Listener para cambios en ubicación
  if (locationSelect) {
    locationSelect.addEventListener("change", () => {
      updateSchools(locationSelect.value, schoolSelect, schoolCustom);
      clearFieldError(locationSelect);
    });
  }

  // Listener para selección de escuela
  if (schoolSelect) {
    schoolSelect.addEventListener("change", () => {
      if (schoolSelect.value === "other") {
        schoolCustom.style.display = "block";
        schoolCustom.required = true;
        schoolSelect.required = false;
      } else {
        schoolCustom.style.display = "none";
        schoolCustom.required = false;
        schoolSelect.required = true;
      }
      clearFieldError(schoolSelect);
    });
  }

  if (form) {
    // Validación del formulario
    form.addEventListener("submit", handleFormSubmit);

    // Validación en tiempo real
    const inputs = form.querySelectorAll("[required]");
    inputs.forEach((input) => {
      input.addEventListener("change", () => clearFieldError(input));
      input.addEventListener("blur", () => validateField(input));
    });
  }

  // Manejo de carga de archivo
  if (fileUpload) {
    // Click en área de carga
    fileUpload.addEventListener("click", (e) => {
      if (e.target === fileUpload) {
        paymentFile.click();
      }
    });

    // Drag and drop
    fileUpload.addEventListener("dragover", handleDragOver);
    fileUpload.addEventListener("dragleave", handleDragLeave);
    fileUpload.addEventListener("drop", handleFileDrop);

    // Selección de archivo
    paymentFile.addEventListener("change", handleFileSelect);
  }

  // Botón de remover archivo
  const removeBtn = document.querySelector(".btn-remove-file");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      paymentFile.value = "";
      filePreview.style.display = "none";
      document.querySelector(".file-upload-content").style.display = "block";
    });
  }
}

/**
 * Actualiza las opciones de escuelas según la ubicación seleccionada
 */
function updateSchools(location, schoolSelect, schoolCustom) {
  const schools = getSchoolsByLocation(location);

  // Limpiar opciones previas
  schoolSelect.innerHTML =
    '<option value="">-- Selecciona tu escuela --</option>';

  if (location && schools.length > 0) {
    // Agregar opciones de escuelas
    schools.forEach((school) => {
      const option = document.createElement("option");
      option.value = school;
      option.textContent = school;
      schoolSelect.appendChild(option);
    });

    // Agregar opción para escribir otra
    const otherOption = document.createElement("option");
    otherOption.value = "other";
    otherOption.textContent = "--- Otra escuela (escriba la suya) ---";
    schoolSelect.appendChild(otherOption);

    schoolCustom.style.display = "none";
    schoolCustom.value = "";
  } else if (location === "other") {
    // Para "Otro País" mostrar solo opción de escritura
    const otherOption = document.createElement("option");
    otherOption.value = "other";
    otherOption.textContent = "--- Escriba el nombre de su escuela ---";
    schoolSelect.appendChild(otherOption);
    schoolSelect.value = "other";
    schoolCustom.style.display = "block";
    schoolCustom.required = true;
  }
}

/**
 * Valida un campo individual
 */
function validateField(field) {
  const name = field.name;
  const value = field.value.trim();

  // Campo requerido
  if (!value) {
    markFieldError(field, "Este campo es obligatorio");
    return false;
  }

  // Validaciones específicas
  if (name === "email") {
    if (!validateEmail(value)) {
      markFieldError(field, "Email inválido");
      return false;
    }
  }

  if (name === "phone") {
    if (!validatePhone(value)) {
      markFieldError(field, "Teléfono inválido (mínimo 10 dígitos)");
      return false;
    }
  }

  clearFieldError(field);
  return true;
}

/**
 * Manejo de drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("fileUpload").classList.add("drag-over");
}

/**
 * Manejo de drag leave
 */
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("fileUpload").classList.remove("drag-over");
}

/**
 * Manejo de drop de archivo
 */
function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById("fileUpload").classList.remove("drag-over");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

/**
 * Manejo de selección de archivo
 */
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}

/**
 * Procesa y valida el archivo seleccionado
 */
function processFile(file) {
  const paymentFile = document.getElementById("paymentFile");
  const filePreview = document.getElementById("filePreview");
  const fileUploadContent = document.querySelector(".file-upload-content");

  // Validar tipo de archivo
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    markFieldError(paymentFile, "Solo se aceptan PDF, JPG o PNG");
    return;
  }

  // Validar tamaño (máximo 5MB)
  if (!validateFileSize(file, 5)) {
    markFieldError(paymentFile, "El archivo no debe superar 5MB");
    return;
  }

  // Mostrar vista previa
  document.getElementById("fileName").textContent = file.name;
  filePreview.style.display = "block";
  fileUploadContent.style.display = "none";

  clearFieldError(paymentFile);
}

/**
 * Maneja envío del formulario
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validar formulario
  if (!validateRegistroForm()) {
    return;
  }

  // Obtener datos del formulario
  const formData = new FormData(document.getElementById("registroForm"));

  // Simular envío (en producción sería a un servidor)
  await simulateFormSubmission(formData);
}

/**
 * Valida el formulario completo
 */
function validateRegistroForm() {
  const form = document.getElementById("registroForm");
  const inputs = form.querySelectorAll("[required]");
  let isValid = true;

  inputs.forEach((input) => {
    if (!validateField(input)) {
      isValid = false;
    }
  });

  // Validar cantidad de integrantes (mínimo 1 capitán, máximo 3 total)
  const captainName = form.querySelector('[name="captainName"]').value.trim();
  const member2 = form.querySelector('[name="member2"]').value.trim();
  const member3 = form.querySelector('[name="member3"]').value.trim();

  if (!captainName) {
    // Esto ya debería estar validado por el campo required, pero por seguridad
    isValid = false;
  }

  // Mensaje informativo de integrantes
  const totalMembers =
    (captainName ? 1 : 0) + (member2 ? 1 : 0) + (member3 ? 1 : 0);
  console.log(`Integrantes: ${totalMembers}/3`);

  // Validar que haya archivo de pago
  const paymentFile = document.getElementById("paymentFile");
  if (!paymentFile.files.length) {
    markFieldError(paymentFile, "Debes subir un comprobante de pago");
    isValid = false;
  }

  return isValid;
}

/**
 * Simula el envío del formulario
 */
async function simulateFormSubmission(formData) {
  const button = document.querySelector('button[type="submit"]');
  const originalText = button.innerHTML;

  try {
    // Mostrar estado de carga
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    // Simular delay de envío
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Obtener datos
    const data = {
      folio: generateFolio(),
      state: formData.get("state"),
      school: formData.get("school"),
      category: formData.get("category"),
      robotName: formData.get("robotName"),
      captainName: formData.get("captainName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      member2: formData.get("member2") || "",
      member3: formData.get("member3") || "",
      timestamp: new Date().toISOString(),
      paymentStatus: "verified",
    };

    // Guardar en localStorage (simulando base de datos)
    const existingData = getFromStorage("registros", []);
    existingData.push(data);
    saveToStorage("registros", existingData);

    // Generar QR
    const qrData = {
      folio: data.folio,
      robot: data.robotName,
      category: data.category,
      captain: data.captainName,
      school: data.school,
      email: data.email,
      timestamp: data.timestamp,
    };
    saveToStorage("lastRegistro", qrData);

    // Redirigir a página de confirmación
    setTimeout(() => {
      window.location.href = "/confirmacion";
    }, 500);
  } catch (error) {
    handleError(error, "en el registro");
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

/**
 * Resetea el formulario
 */
function resetRegistroForm() {
  document.getElementById("registroForm").reset();
  document.getElementById("filePreview").style.display = "none";
  document.querySelector(".file-upload-content").style.display = "block";

  // Limpiar errores
  document.querySelectorAll(".has-error").forEach((el) => {
    el.classList.remove("has-error");
  });
  document.querySelectorAll(".error-message").forEach((el) => {
    el.textContent = "";
  });
}
