/**
 * CONFIGURACIÓN GLOBAL DE RENOVATEC
 * Etapas, Precios, Fechas
 */

// ===== MODO PRUEBA =====
// true: habilita registro aunque no esté en rango de fechas
const TEST_MODE_ENABLE_ALL_STAGES = false;
const TEST_MODE_DEFAULT_STAGE_KEY = "stage1";
const STAGE_QUERY_PARAM = "stage";

// ===== AÑO ACTIVO DEL EVENTO =====
const __now = new Date();
const __currentYearEventEnd = new Date(__now.getFullYear(), 9, 23, 17, 0, 0);
const EVENT_YEAR =
  __now <= __currentYearEventEnd
    ? __now.getFullYear()
    : __now.getFullYear() + 1;

// ===== FECHAS DE ETAPAS =====
const REGISTRATION_STAGES = {
  stage1: {
    name: "Etapa 1",
    startDate: new Date(EVENT_YEAR, 3, 1, 0, 0, 0), // 1 de Abril
    endDate: new Date(EVENT_YEAR, 5, 30, 23, 59, 59), // 30 de Junio
    price: 130,
    color: "#28a745",
  },
  stage2: {
    name: "Etapa 2",
    startDate: new Date(EVENT_YEAR, 6, 1, 0, 0, 0), // 1 de Julio
    endDate: new Date(EVENT_YEAR, 7, 31, 23, 59, 59), // 31 de Agosto
    price: 200,
    color: "#007bff",
  },
  stage3: {
    name: "Etapa 3",
    startDate: new Date(EVENT_YEAR, 8, 1, 0, 0, 0), // 1 de Septiembre
    endDate: new Date(EVENT_YEAR, 9, 23, 23, 59, 59), // 23 de Octubre
    price: 350,
    color: "#fd7e14",
  },
};

// ===== FECHA DEL EVENTO =====
const EVENT_DATE = new Date(EVENT_YEAR, 9, 23, 9, 0, 0); // 23 de Octubre 9:00 AM
const EVENT_END_DATE = new Date(EVENT_YEAR, 9, 23, 17, 0, 0); // 23 de Octubre 5:00 PM

function getStageByKey(stageKey) {
  if (!stageKey) {
    return null;
  }

  const stage = REGISTRATION_STAGES[stageKey];
  if (!stage) {
    return null;
  }

  return {
    key: stageKey,
    ...stage,
  };
}

function getSelectedStageKey() {
  const params = new URLSearchParams(window.location.search);
  const stageFromQuery = params.get(STAGE_QUERY_PARAM);

  if (stageFromQuery && REGISTRATION_STAGES[stageFromQuery]) {
    sessionStorage.setItem("selectedStageKey", stageFromQuery);
    return stageFromQuery;
  }

  const stored = sessionStorage.getItem("selectedStageKey");
  if (stored && REGISTRATION_STAGES[stored]) {
    return stored;
  }

  return null;
}

function getSelectedStage() {
  const selectedKey = getSelectedStageKey();
  return selectedKey ? getStageByKey(selectedKey) : null;
}

/**
 * Obtiene la etapa actual basada en la fecha
 * @returns {Object} Objeto con info de etapa o null si no hay etapa activa
 */
function getCurrentStage() {
  const now = new Date();

  if (TEST_MODE_ENABLE_ALL_STAGES) {
    const selectedStage = getSelectedStage();
    if (selectedStage) {
      return {
        ...selectedStage,
        isTestMode: true,
      };
    }
  }

  for (const [stageKey, stage] of Object.entries(REGISTRATION_STAGES)) {
    if (now >= stage.startDate && now <= stage.endDate) {
      return {
        key: stageKey,
        ...stage,
      };
    }
  }

  if (TEST_MODE_ENABLE_ALL_STAGES) {
    const fallback = getStageByKey(TEST_MODE_DEFAULT_STAGE_KEY);
    return {
      ...fallback,
      isTestMode: true,
    };
  }

  return null;
}

/**
 * Obtiene el precio actual según la etapa
 * @returns {number} Precio en MXN
 */
function getCurrentPrice() {
  const stage = getCurrentStage();
  return stage ? stage.price : 0;
}

/**
 * Verifica si el registro está abierto
 * @returns {boolean} True si hay una etapa activa
 */
function isRegistrationOpen() {
  if (TEST_MODE_ENABLE_ALL_STAGES) {
    return true;
  }
  return getCurrentStage() !== null;
}

/**
 * Formatea una fecha en formato amigable
 * @param {Date} date
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("es-MX", options);
}

/**
 * Formatea una fecha con hora
 * @param {Date} date
 * @returns {string} Fecha y hora formateadas
 */
function formatDateTime(date) {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("es-MX", options);
}
