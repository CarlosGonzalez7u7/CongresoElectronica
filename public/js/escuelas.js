/**
 * escuelas.js — Base de datos local de escuelas de México
 * RENOVATEC 2026
 *
 * Estructura: { nombre: string, tipo: "universidad"|"preparatoria", estado: string }
 * Los alumnos pueden agregar nuevas escuelas que se guardan en localStorage
 * y se proponen al servidor, enriqueciendo la lista para futuros usuarios.
 */

window.ESCUELAS_DB = (function () {
  /* ============================================================
     LISTA BASE — Universidades y Tecnológicos de México
     ============================================================ */
  const ESCUELAS_BASE = [
    // ── TECNOLÓGICOS SUPERIORES (TecNM / SEP) ──────────────────
    { nombre: "Instituto Tecnológico Superior de Uruapan", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico de Morelia", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico de Estudios Superiores de Occidente (ITESO)", tipo: "universidad", estado: "Jalisco" },
    { nombre: "Instituto Tecnológico de Monterrey (ITESM)", tipo: "universidad", estado: "Nuevo León" },
    { nombre: "Instituto Tecnológico de Tijuana", tipo: "universidad", estado: "Baja California" },
    { nombre: "Instituto Tecnológico de Ciudad Juárez", tipo: "universidad", estado: "Chihuahua" },
    { nombre: "Instituto Tecnológico de Culiacán", tipo: "universidad", estado: "Sinaloa" },
    { nombre: "Instituto Tecnológico de Hermosillo", tipo: "universidad", estado: "Sonora" },
    { nombre: "Instituto Tecnológico de La Paz", tipo: "universidad", estado: "Baja California Sur" },
    { nombre: "Instituto Tecnológico de León", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Instituto Tecnológico de Celaya", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Instituto Tecnológico de Querétaro", tipo: "universidad", estado: "Querétaro" },
    { nombre: "Instituto Tecnológico de Aguascalientes", tipo: "universidad", estado: "Aguascalientes" },
    { nombre: "Instituto Tecnológico de Saltillo", tipo: "universidad", estado: "Coahuila" },
    { nombre: "Instituto Tecnológico de Durango", tipo: "universidad", estado: "Durango" },
    { nombre: "Instituto Tecnológico de Zacatecas", tipo: "universidad", estado: "Zacatecas" },
    { nombre: "Instituto Tecnológico de San Luis Potosí", tipo: "universidad", estado: "San Luis Potosí" },
    { nombre: "Instituto Tecnológico de Tepic", tipo: "universidad", estado: "Nayarit" },
    { nombre: "Instituto Tecnológico de Colima", tipo: "universidad", estado: "Colima" },
    { nombre: "Instituto Tecnológico de Manzanillo", tipo: "universidad", estado: "Colima" },
    { nombre: "Instituto Tecnológico de Apizaco", tipo: "universidad", estado: "Tlaxcala" },
    { nombre: "Instituto Tecnológico de Oaxaca", tipo: "universidad", estado: "Oaxaca" },
    { nombre: "Instituto Tecnológico de Tuxtla Gutiérrez", tipo: "universidad", estado: "Chiapas" },
    { nombre: "Instituto Tecnológico de Comitán", tipo: "universidad", estado: "Chiapas" },
    { nombre: "Instituto Tecnológico de Mérida", tipo: "universidad", estado: "Yucatán" },
    { nombre: "Instituto Tecnológico de Cancún", tipo: "universidad", estado: "Quintana Roo" },
    { nombre: "Instituto Tecnológico de Chetumal", tipo: "universidad", estado: "Quintana Roo" },
    { nombre: "Instituto Tecnológico de Campeche", tipo: "universidad", estado: "Campeche" },
    { nombre: "Instituto Tecnológico de Villahermosa", tipo: "universidad", estado: "Tabasco" },
    { nombre: "Instituto Tecnológico de Veracruz", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Instituto Tecnológico de Orizaba", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Instituto Tecnológico de Puebla", tipo: "universidad", estado: "Puebla" },
    { nombre: "Instituto Tecnológico de Toluca", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Instituto Tecnológico de Tlalnepantla", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Instituto Tecnológico de Cuautla", tipo: "universidad", estado: "Morelos" },
    { nombre: "Instituto Tecnológico de Cuernavaca", tipo: "universidad", estado: "Morelos" },
    { nombre: "Instituto Tecnológico Superior de Zongolica", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Instituto Tecnológico Superior de Perote", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Instituto Tecnológico Superior de Las Choapas", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Instituto Tecnológico Superior de Pátzcuaro", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de Coalcomán", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de Tacámbaro", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de Apatzingán", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de La Región Sierra", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de Tierra Caliente", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de Zamora", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Instituto Tecnológico Superior de Irapuato", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Instituto Tecnológico Superior de Salvatierra", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Instituto Tecnológico Superior del Sur de Guanajuato", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Instituto Tecnológico Superior de Purísima del Rincón", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Instituto Tecnológico Superior de Teposcolula", tipo: "universidad", estado: "Oaxaca" },
    { nombre: "Instituto Tecnológico Superior de Huatulco", tipo: "universidad", estado: "Oaxaca" },
    { nombre: "Instituto Tecnológico Superior de San Marcos", tipo: "universidad", estado: "Guerrero" },
    { nombre: "Instituto Tecnológico Superior de Tantoyuca", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Instituto Tecnológico Superior de Xalapa", tipo: "universidad", estado: "Veracruz" },

    // ── UNIVERSIDADES AUTÓNOMAS ────────────────────────────────
    { nombre: "Universidad Nacional Autónoma de México (UNAM)", tipo: "universidad", estado: "Ciudad de México" },
    { nombre: "Universidad Autónoma Metropolitana (UAM)", tipo: "universidad", estado: "Ciudad de México" },
    { nombre: "Universidad Autónoma de Nuevo León (UANL)", tipo: "universidad", estado: "Nuevo León" },
    { nombre: "Universidad Autónoma de Guadalajara (UAG)", tipo: "universidad", estado: "Jalisco" },
    { nombre: "Universidad de Guadalajara (UdeG)", tipo: "universidad", estado: "Jalisco" },
    { nombre: "Universidad Autónoma de Baja California (UABC)", tipo: "universidad", estado: "Baja California" },
    { nombre: "Universidad Autónoma de Chihuahua (UACH)", tipo: "universidad", estado: "Chihuahua" },
    { nombre: "Universidad Autónoma de Sinaloa (UAS)", tipo: "universidad", estado: "Sinaloa" },
    { nombre: "Universidad Autónoma de Sonora (UNISON)", tipo: "universidad", estado: "Sonora" },
    { nombre: "Universidad Autónoma de Aguascalientes (UAA)", tipo: "universidad", estado: "Aguascalientes" },
    { nombre: "Universidad Autónoma de Coahuila (UAdeC)", tipo: "universidad", estado: "Coahuila" },
    { nombre: "Universidad Autónoma de Durango (UAD)", tipo: "universidad", estado: "Durango" },
    { nombre: "Universidad Autónoma de Zacatecas (UAZ)", tipo: "universidad", estado: "Zacatecas" },
    { nombre: "Universidad Autónoma de San Luis Potosí (UASLP)", tipo: "universidad", estado: "San Luis Potosí" },
    { nombre: "Universidad Autónoma de Nayarit (UAN)", tipo: "universidad", estado: "Nayarit" },
    { nombre: "Universidad de Colima (UCOL)", tipo: "universidad", estado: "Colima" },
    { nombre: "Universidad Autónoma de Tlaxcala (UAT)", tipo: "universidad", estado: "Tlaxcala" },
    { nombre: "Universidad Autónoma Benito Juárez de Oaxaca (UABJO)", tipo: "universidad", estado: "Oaxaca" },
    { nombre: "Universidad Autónoma de Chiapas (UNACH)", tipo: "universidad", estado: "Chiapas" },
    { nombre: "Universidad Autónoma de Yucatán (UADY)", tipo: "universidad", estado: "Yucatán" },
    { nombre: "Universidad Autónoma de Campeche (UAC)", tipo: "universidad", estado: "Campeche" },
    { nombre: "Universidad Juárez Autónoma de Tabasco (UJAT)", tipo: "universidad", estado: "Tabasco" },
    { nombre: "Universidad Veracruzana (UV)", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Benemérita Universidad Autónoma de Puebla (BUAP)", tipo: "universidad", estado: "Puebla" },
    { nombre: "Universidad Autónoma del Estado de México (UAEM)", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Universidad Autónoma del Estado de Morelos (UAEM)", tipo: "universidad", estado: "Morelos" },
    { nombre: "Universidad Autónoma de Guerrero (UAGRO)", tipo: "universidad", estado: "Guerrero" },
    { nombre: "Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Universidad Autónoma del Estado de Hidalgo (UAEH)", tipo: "universidad", estado: "Hidalgo" },
    { nombre: "Universidad de Guanajuato (UG)", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Universidad Autónoma de Querétaro (UAQ)", tipo: "universidad", estado: "Querétaro" },
    { nombre: "Universidad Autónoma de Tamaulipas (UAT)", tipo: "universidad", estado: "Tamaulipas" },

    // ── UNIVERSIDADES POLITÉCNICAS / IPN ──────────────────────
    { nombre: "Instituto Politécnico Nacional (IPN)", tipo: "universidad", estado: "Ciudad de México" },
    { nombre: "Universidad Politécnica de Uruapan", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Universidad Politécnica de Guanajuato", tipo: "universidad", estado: "Guanajuato" },
    { nombre: "Universidad Politécnica de Querétaro", tipo: "universidad", estado: "Querétaro" },
    { nombre: "Universidad Politécnica de Aguascalientes", tipo: "universidad", estado: "Aguascalientes" },
    { nombre: "Universidad Politécnica de Chiapas", tipo: "universidad", estado: "Chiapas" },
    { nombre: "Universidad Politécnica de Sinaloa", tipo: "universidad", estado: "Sinaloa" },
    { nombre: "Universidad Politécnica de Pachuca", tipo: "universidad", estado: "Hidalgo" },
    { nombre: "Universidad Politécnica de Tulancingo", tipo: "universidad", estado: "Hidalgo" },
    { nombre: "Universidad Politécnica del Valle de México", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Universidad Politécnica de Cuautitlán Izcalli", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Universidad Politécnica de Puebla", tipo: "universidad", estado: "Puebla" },
    { nombre: "Universidad Politécnica de Tlaxcala", tipo: "universidad", estado: "Tlaxcala" },
    { nombre: "Universidad Politécnica de Altamira", tipo: "universidad", estado: "Tamaulipas" },
    { nombre: "Universidad Politécnica de Tamaulipas", tipo: "universidad", estado: "Tamaulipas" },
    { nombre: "Universidad Politécnica de Zacatecas", tipo: "universidad", estado: "Zacatecas" },
    { nombre: "Universidad Politécnica de San Luis Potosí", tipo: "universidad", estado: "San Luis Potosí" },

    // ── UNIVERSIDADES TECNOLÓGICAS ─────────────────────────────
    { nombre: "Universidad Tecnológica de Morelia", tipo: "universidad", estado: "Michoacán" },
    { nombre: "Universidad Tecnológica de la Zona Metropolitana del Valle de México", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Universidad Tecnológica de Puebla", tipo: "universidad", estado: "Puebla" },
    { nombre: "Universidad Tecnológica de Querétaro", tipo: "universidad", estado: "Querétaro" },
    { nombre: "Universidad Tecnológica de Aguascalientes", tipo: "universidad", estado: "Aguascalientes" },
    { nombre: "Universidad Tecnológica de Durango", tipo: "universidad", estado: "Durango" },
    { nombre: "Universidad Tecnológica de Gutiérrez Zamora", tipo: "universidad", estado: "Veracruz" },
    { nombre: "Universidad Tecnológica de Tabasco", tipo: "universidad", estado: "Tabasco" },
    { nombre: "Universidad Tecnológica de Cancún", tipo: "universidad", estado: "Quintana Roo" },
    { nombre: "Universidad Tecnológica de Manzanillo", tipo: "universidad", estado: "Colima" },
    { nombre: "Universidad Tecnológica de Nayarit", tipo: "universidad", estado: "Nayarit" },
    { nombre: "Universidad Tecnológica de Coahuila", tipo: "universidad", estado: "Coahuila" },
    { nombre: "Universidad Tecnológica de Ciudad Juárez", tipo: "universidad", estado: "Chihuahua" },
    { nombre: "Universidad Tecnológica de Chihuahua", tipo: "universidad", estado: "Chihuahua" },
    { nombre: "Universidad Tecnológica de Tula-Tepeji", tipo: "universidad", estado: "Hidalgo" },
    { nombre: "Universidad Tecnológica de Xicotepec de Juárez", tipo: "universidad", estado: "Puebla" },
    { nombre: "Universidad Tecnológica de San Juan del Río", tipo: "universidad", estado: "Querétaro" },
    { nombre: "Universidad Tecnológica del Valle de Toluca", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Universidad Tecnológica de Jalisco", tipo: "universidad", estado: "Jalisco" },
    { nombre: "Universidad Tecnológica de Guadalajara", tipo: "universidad", estado: "Jalisco" },

    // ── UNIVERSIDADES PRIVADAS ─────────────────────────────────
    { nombre: "Universidad Iberoamericana (Ibero)", tipo: "universidad", estado: "Ciudad de México" },
    { nombre: "Universidad La Salle México", tipo: "universidad", estado: "Ciudad de México" },
    { nombre: "Universidad Anáhuac México", tipo: "universidad", estado: "Estado de México" },
    { nombre: "Universidad del Valle de México (UVM)", tipo: "universidad", estado: "Nacional" },
    { nombre: "Universidad CETYS", tipo: "universidad", estado: "Baja California" },
    { nombre: "Universidad Autónoma de Occidente (UAO)", tipo: "universidad", estado: "Sinaloa" },
    { nombre: "Universidad Cuauhtémoc", tipo: "universidad", estado: "Aguascalientes" },
    { nombre: "Universidad de Monterrey (UDEM)", tipo: "universidad", estado: "Nuevo León" },
    { nombre: "Universidad Regiomontana (UR)", tipo: "universidad", estado: "Nuevo León" },
    { nombre: "EGADE Business School", tipo: "universidad", estado: "Nuevo León" },
    { nombre: "Universidad Panamericana (UP)", tipo: "universidad", estado: "Ciudad de México" },

    // ── COLEGIOS NACIONALES / CECYTE / CETIS / CBTIS ──────────
    { nombre: "CONALEP Uruapan", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CONALEP Morelia", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CONALEP Zamora", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CONALEP Monterrey", tipo: "preparatoria", estado: "Nuevo León" },
    { nombre: "CONALEP Guadalajara", tipo: "preparatoria", estado: "Jalisco" },
    { nombre: "CONALEP Tijuana", tipo: "preparatoria", estado: "Baja California" },
    { nombre: "CECYTE Michoacán", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CECYTE Guanajuato", tipo: "preparatoria", estado: "Guanajuato" },
    { nombre: "CECYTE Jalisco", tipo: "preparatoria", estado: "Jalisco" },
    { nombre: "CECYTE Guerrero", tipo: "preparatoria", estado: "Guerrero" },
    { nombre: "CBTIS 82 Uruapan", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CBTIS 43 Morelia", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CBTIS 146 Zamora", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CBTIS 68 Lázaro Cárdenas", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CETIS 1 Ciudad de México", tipo: "preparatoria", estado: "Ciudad de México" },
    { nombre: "CETIS 7 Ciudad de México", tipo: "preparatoria", estado: "Ciudad de México" },

    // ── PREPARATORIAS / BACHILLERATOS ─────────────────────────
    { nombre: "Preparatoria Federal Lázaro Cárdenas (Uruapan)", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "Preparatoria UMSNH", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "Preparatoria Nocturna UMSNH", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "CCH-UNAM (Colegio de Ciencias y Humanidades)", tipo: "preparatoria", estado: "Ciudad de México" },
    { nombre: "ENP-UNAM (Escuela Nacional Preparatoria)", tipo: "preparatoria", estado: "Ciudad de México" },
    { nombre: "Prepa Tec (ITESM)", tipo: "preparatoria", estado: "Nacional" },
    { nombre: "Bachillerato UdeG (SEMS)", tipo: "preparatoria", estado: "Jalisco" },
    { nombre: "Preparatoria UANL", tipo: "preparatoria", estado: "Nuevo León" },
    { nombre: "Preparatoria UAQ", tipo: "preparatoria", estado: "Querétaro" },
    { nombre: "Preparatoria BUAP", tipo: "preparatoria", estado: "Puebla" },
    { nombre: "Preparatoria UAEH", tipo: "preparatoria", estado: "Hidalgo" },
    { nombre: "Preparatoria UAEM", tipo: "preparatoria", estado: "Estado de México" },
    { nombre: "Colegio de Bachilleres del Estado de Michoacán (COBAEM)", tipo: "preparatoria", estado: "Michoacán" },
    { nombre: "Colegio de Bachilleres del Estado de Jalisco (COBAEJ)", tipo: "preparatoria", estado: "Jalisco" },
    { nombre: "Colegio de Bachilleres del Estado de Guerrero (COBAG)", tipo: "preparatoria", estado: "Guerrero" },
    { nombre: "Colegio de Bachilleres del Estado de México (COBAEM)", tipo: "preparatoria", estado: "Estado de México" },
    { nombre: "Colegio de Bachilleres del Estado de Oaxaca (COBAO)", tipo: "preparatoria", estado: "Oaxaca" },
    { nombre: "Colegio de Bachilleres del Estado de Veracruz (COBAEV)", tipo: "preparatoria", estado: "Veracruz" },
    { nombre: "Bachillerato Estatal (Quintana Roo)", tipo: "preparatoria", estado: "Quintana Roo" },
    { nombre: "TELEBACHILLERATO", tipo: "preparatoria", estado: "Nacional" },

    // ── OTRA / EXTRANJERA ──────────────────────────────────────
    { nombre: "Otra institución", tipo: "universidad", estado: "" },
  ];

  /* ============================================================
     CARRERAS BASE
     ============================================================ */
  const CARRERAS_BASE = [
    // Ingeniería
    "Ingeniería Electrónica",
    "Ingeniería en Sistemas Computacionales",
    "Ingeniería en Tecnologías de la Información",
    "Ingeniería Mecatrónica",
    "Ingeniería Eléctrica",
    "Ingeniería Mecánica",
    "Ingeniería Industrial",
    "Ingeniería Civil",
    "Ingeniería Química",
    "Ingeniería Biomédica",
    "Ingeniería en Robótica",
    "Ingeniería en Automatización",
    "Ingeniería en Comunicaciones y Electrónica",
    "Ingeniería en Energías Renovables",
    "Ingeniería en Aeronáutica",
    "Ingeniería en Nanotecnología",
    "Ingeniería en Software",
    "Ingeniería en Redes Computacionales",
    "Ingeniería en Ciberseguridad",
    "Ingeniería en Inteligencia Artificial",
    "Ingeniería en Gestión Empresarial",
    "Ingeniería en Logística",
    "Ingeniería en Alimentos",
    "Ingeniería Ambiental",
    "Ingeniería Geofísica",
    "Ingeniería en Geomática",
    "Ingeniería en Manufactura",
    "Ingeniería en Materiales",
    "Ingeniería en Ciencias de la Computación",
    // Tecnologías / Informática
    "Licenciatura en Informática",
    "Licenciatura en Sistemas de Información",
    "Ingeniería en Ciencias de Datos",
    "Técnico Superior en Sistemas",
    "Técnico en Electrónica",
    "Técnico en Programación",
    // Ciencias
    "Licenciatura en Física",
    "Licenciatura en Matemáticas",
    "Licenciatura en Química",
    "Licenciatura en Biología",
    "Licenciatura en Ciencias Computacionales",
    // Administración
    "Licenciatura en Administración de Empresas",
    "Licenciatura en Contaduría",
    "Licenciatura en Mercadotecnia",
    "Licenciatura en Economía",
    "Licenciatura en Negocios Internacionales",
    // Diseño
    "Licenciatura en Diseño Gráfico",
    "Licenciatura en Diseño Industrial",
    "Licenciatura en Animación Digital",
    // Medicina / Salud
    "Médico Cirujano y Partero",
    "Licenciatura en Enfermería",
    "Licenciatura en Odontología",
    "Licenciatura en Nutrición",
    "Licenciatura en Psicología",
    // Arquitectura
    "Arquitectura",
    "Urbanismo",
    // Humanidades
    "Licenciatura en Derecho",
    "Licenciatura en Comunicación",
    "Licenciatura en Educación",
    "Licenciatura en Pedagogía",
    "Licenciatura en Sociología",
    // Otra
    "Otra carrera",
  ];

  /* ============================================================
     CLAVE PARA localStorage — propuestas de alumnos
     ============================================================ */
  const LS_KEY_SCHOOLS = "rnvtc_schools_proposed_v1";
  const LS_KEY_CAREERS = "rnvtc_careers_proposed_v1";

  /**
   * Retorna propuestas guardadas localmente.
   * @param {string} key
   * @returns {string[]}
   */
  function getLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Guarda un nuevo valor propuesto localmente si no existe.
   * @param {string} key
   * @param {string} value
   * @returns {boolean} true si se agregó como nuevo
   */
  function saveLocal(key, value) {
    if (!value || value.trim().length < 3) return false;
    const current = getLocal(key);
    const normalized = value.trim();
    if (current.some((s) => s.toLowerCase() === normalized.toLowerCase()))
      return false;
    current.push(normalized);
    try {
      localStorage.setItem(key, JSON.stringify(current));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retorna la lista combinada de escuelas: base + propuestas locales.
   * Los items de la base se deduran contra las propuestas.
   * @returns {{ nombre: string, tipo: string, estado: string, esPropuesta?: boolean }[]}
   */
  function getAllSchools() {
    const proposed = getLocal(LS_KEY_SCHOOLS).map((nombre) => ({
      nombre,
      tipo: "universidad",
      estado: "",
      esPropuesta: true,
    }));
    // Filtrar propuestas que ya están en la base
    const baseNames = new Set(
      ESCUELAS_BASE.map((e) => e.nombre.toLowerCase())
    );
    const nuevas = proposed.filter(
      (p) => !baseNames.has(p.nombre.toLowerCase())
    );
    return [...ESCUELAS_BASE, ...nuevas];
  }

  /**
   * Retorna la lista combinada de carreras: base + propuestas locales.
   * @returns {string[]}
   */
  function getAllCareers() {
    const proposed = getLocal(LS_KEY_CAREERS);
    const baseSet = new Set(CARRERAS_BASE.map((c) => c.toLowerCase()));
    const nuevas = proposed.filter((c) => !baseSet.has(c.toLowerCase()));
    return [...CARRERAS_BASE, ...nuevas];
  }

  /**
   * Busca escuelas cuyo nombre contenga el término (case-insensitive).
   * @param {string} term
   * @param {number} [limit=10]
   * @returns {{ nombre: string, tipo: string, estado: string }[]}
   */
  function searchSchools(term, limit = 10) {
    if (!term || term.length < 2) return [];
    const t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return getAllSchools()
      .filter((e) => {
        const n = e.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return n.includes(t);
      })
      .slice(0, limit);
  }

  /**
   * Busca carreras cuyo nombre contenga el término.
   * @param {string} term
   * @param {number} [limit=8]
   * @returns {string[]}
   */
  function searchCareers(term, limit = 8) {
    if (!term || term.length < 2) return [];
    const t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return getAllCareers()
      .filter((c) => {
        const n = c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return n.includes(t);
      })
      .slice(0, limit);
  }

  /**
   * Propone una nueva escuela (la guarda localmente).
   * @param {string} nombre
   * @returns {boolean}
   */
  function proposeSchool(nombre) {
    return saveLocal(LS_KEY_SCHOOLS, nombre);
  }

  /**
   * Propone una nueva carrera (la guarda localmente).
   * @param {string} nombre
   * @returns {boolean}
   */
  function proposeCareer(nombre) {
    return saveLocal(LS_KEY_CAREERS, nombre);
  }

  /**
   * Retorna todos los nombres de escuelas como array plano (para datalist simple).
   * @returns {string[]}
   */
  function getAllSchoolNames() {
    return getAllSchools().map((e) => e.nombre);
  }

  return {
    searchSchools,
    searchCareers,
    proposeSchool,
    proposeCareer,
    getAllSchoolNames,
    getAllCareers,
    ESCUELAS_BASE,
    CARRERAS_BASE,
  };
})();
