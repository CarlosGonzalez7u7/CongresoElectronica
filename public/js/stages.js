/**
 * INICIALIZADOR DE CONTADOR Y ETAPAS
 */

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar contador en página de inicio
  if (document.getElementById("days")) {
    initCountdown();
    initPublicStageInfo();
  }

  // Inicializar sistema de etapas en página de registro
  if (document.getElementById("stageBanner")) {
    initStageSystem();
  }
});

/**
 * Inicializa el contador de regresión hacia el evento
 */
function initCountdown() {
  const countdownNote = document.getElementById("countdownNote");

  function updateCountdown() {
    const now = new Date();
    const target = EVENT_DATE;
    const difference = target - now;

    if (now >= EVENT_DATE && now <= EVENT_END_DATE) {
      document.getElementById("days").textContent = "00";
      document.getElementById("hours").textContent = "00";
      document.getElementById("minutes").textContent = "00";
      document.getElementById("seconds").textContent = "00";
      if (countdownNote) {
        countdownNote.textContent = "RENOVATEC está en curso en este momento.";
      }
      return;
    }

    if (difference > 0) {
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      document.getElementById("days").textContent = String(days).padStart(
        2,
        "0",
      );
      document.getElementById("hours").textContent = String(hours).padStart(
        2,
        "0",
      );
      document.getElementById("minutes").textContent = String(minutes).padStart(
        2,
        "0",
      );
      document.getElementById("seconds").textContent = String(seconds).padStart(
        2,
        "0",
      );
      if (countdownNote) {
        countdownNote.textContent = `Cuenta regresiva al 23 de octubre de ${EVENT_YEAR}, 9:00 AM.`;
      }
    } else {
      // Respaldo visual en caso de fecha no esperada
      document.getElementById("days").textContent = "00";
      document.getElementById("hours").textContent = "00";
      document.getElementById("minutes").textContent = "00";
      document.getElementById("seconds").textContent = "00";
      if (countdownNote) {
        countdownNote.textContent =
          "La cuenta regresiva se actualizará automáticamente.";
      }
    }
  }

  // Actualizar inmediatamente
  updateCountdown();

  // Actualizar cada segundo
  setInterval(updateCountdown, 1000);
}

function initPublicStageInfo() {
  const stageText = document.getElementById("landingStageText");
  const stage1 = REGISTRATION_STAGES.stage1;
  const now = new Date();
  const currentStage = getCurrentStage();

  const stageCards = [
    { key: "stage1", data: stage1 },
    { key: "stage2", data: REGISTRATION_STAGES.stage2 },
    { key: "stage3", data: REGISTRATION_STAGES.stage3 },
  ];

  stageCards.forEach(({ key, data }) => {
    const statusEl = document.getElementById(`${key}Status`);
    const registerBtn = document.getElementById(`${key}RegisterBtn`);
    const phaseCard = document.querySelector(
      `.phase-card[data-stage-key="${key}"]`,
    );
    if (!statusEl) {
      return;
    }

    if (phaseCard) {
      phaseCard.classList.remove("is-blocked", "is-expired", "is-active");
    }

    if (now < data.startDate) {
      statusEl.textContent = "Bloqueado";
      statusEl.className = "phase-status blocked";
      if (phaseCard) {
        phaseCard.classList.add("is-blocked");
      }
      if (registerBtn) {
        registerBtn.classList.add("is-disabled");
        registerBtn.setAttribute("aria-disabled", "true");
        registerBtn.setAttribute("tabindex", "-1");
        registerBtn.textContent = "Bloqueado por fecha";
        registerBtn.href = "#";
      }
    } else if (now >= data.startDate && now <= data.endDate) {
      statusEl.textContent = "Activa";
      statusEl.className = "phase-status active";
      if (phaseCard) {
        phaseCard.classList.add("is-active");
      }
      if (registerBtn) {
        registerBtn.classList.remove("is-disabled");
        registerBtn.removeAttribute("aria-disabled");
        registerBtn.removeAttribute("tabindex");
        registerBtn.innerHTML = `Inscribirme en ${data.name}`;
        registerBtn.href = `/registro?stage=${key}`;
      }
    } else {
      statusEl.textContent = "Vencido";
      statusEl.className = "phase-status expired";
      if (phaseCard) {
        phaseCard.classList.add("is-expired");
      }
      if (registerBtn) {
        registerBtn.classList.add("is-disabled");
        registerBtn.setAttribute("aria-disabled", "true");
        registerBtn.setAttribute("tabindex", "-1");
        registerBtn.textContent = "Fecha de inscripción vencida";
        registerBtn.href = "#";
      }
    }
  });

  if (!stageText) {
    return;
  }

  if (currentStage) {
    stageText.textContent = `${currentStage.name} ACTIVA: $${currentStage.price} MXN por robot.`;
    return;
  }

  if (now < stage1.startDate) {
    stageText.textContent = `Registro bloqueado por calendario. Inicia el ${formatDate(stage1.startDate)} con Etapa 1 ($${stage1.price} MXN).`;
    return;
  }

  const stage3 = REGISTRATION_STAGES.stage3;
  if (now > stage3.endDate) {
    stageText.textContent =
      "Registro vencido para esta edición. Próximamente se publicarán nuevas fechas.";
    return;
  }

  stageText.textContent =
    "No disponible por calendario en este momento. Revisa las fechas de cada etapa.";
}

/**
 * Inicializa el sistema de etapas de registro
 */
function initStageSystem() {
  const currentStage = getCurrentStage();
  const stage1 = REGISTRATION_STAGES.stage1;
  const stage3 = REGISTRATION_STAGES.stage3;
  const now = new Date();
  const stageBanner = document.getElementById("stageBanner");
  const closedBanner = document.getElementById("closedBanner");
  const closedTitle = document.getElementById("closedBannerTitle");
  const closedText = document.getElementById("closedBannerText");
  const registroForm = document.getElementById("registroForm");

  if (currentStage) {
    // Registro abierto
    stageBanner.style.display = "block";
    closedBanner.style.display = "none";
    registroForm.style.opacity = "1";
    registroForm.style.pointerEvents = "auto";

    document.getElementById("stageBannerTitle").textContent =
      `Estado: ${currentStage.name} activa`;
    document.getElementById("stageBannerText").textContent =
      `Registro activo | Precio $${currentStage.price} MXN por robot | Vigencia hasta ${formatDate(currentStage.endDate)}`;

    // Actualizar precio dinámico
    updatePriceDisplay(currentStage.price);
  } else {
    // Registro cerrado
    stageBanner.style.display = "none";
    closedBanner.style.display = "block";
    registroForm.style.opacity = "0.5";
    registroForm.style.pointerEvents = "none";

    if (closedTitle && closedText) {
      if (now < stage1.startDate) {
        closedTitle.textContent = "Registro bloqueado por calendario";
        closedText.textContent = `Aún no abre el periodo de inscripción. Inicio oficial: ${formatDate(stage1.startDate)}.`;
      } else if (now > stage3.endDate) {
        closedTitle.textContent = "Registro vencido";
        closedText.textContent =
          "La etapa de registro para esta edición ya terminó. Espera la publicación de la siguiente convocatoria.";
      } else {
        closedTitle.textContent = "No disponible en este momento";
        closedText.textContent =
          "No hay una etapa activa hoy. Revisa nuevamente en la fecha de apertura correspondiente.";
      }
    }
  }
}

/**
 * Actualiza el precio mostrado en la tabla de robots
 * @param {number} price - Precio actual
 */
function updatePriceDisplay(price) {
  const priceElements = document.querySelectorAll(".robot-price");
  priceElements.forEach((el) => {
    el.textContent = `$${price.toLocaleString("es-MX")} MXN`;
  });

  // Actualizar costo total
  updateRobotsCost();
}

/**
 * Actualiza el costo total de robots basado en precio dinámico
 */
function updateRobotsCost() {
  const robotRows = document.querySelectorAll(".robot-row");
  const currentPrice = getCurrentPrice();
  const totalCost = robotRows.length * currentPrice;

  const totalCostEl = document.getElementById("total-robots-cost");
  if (totalCostEl) {
    totalCostEl.textContent = `Total a pagar: $${totalCost.toLocaleString("es-MX")} MXN (${robotRows.length} ${robotRows.length === 1 ? "robot" : "robots"})`;
  }

  // Actualizar resumen
  const summaryTotal = document.getElementById("summary-total-cost");
  if (summaryTotal) {
    summaryTotal.textContent = `$${totalCost.toLocaleString("es-MX")} MXN`;
  }
}
