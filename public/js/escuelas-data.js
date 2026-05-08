/**
 * escuelas-data.js — RENOVATEC 2026
 * Catálogo local de instituciones y carreras.
 * Estructura mejorada: tipo (universidad / preparatoria), país, estado.
 * v20260507
 */

// ─────────────────────────────────────────────────────────────────────────────
//  CATÁLOGO DE INSTITUCIONES
//  Cada entrada: { name, type: 'universidad'|'preparatoria', state, country }
// ─────────────────────────────────────────────────────────────────────────────

const INSTITUTIONS_CATALOG = [
  // ── Michoacán — Universidades ─────────────────────────────────────────────
  {
    name: "Instituto Tecnológico Superior de Uruapan",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Morelia",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Pátzcuaro",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Zamora",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Apatzingán",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Coalcomán",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Tacámbaro",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Tierra Caliente",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de La Región Sierra",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Universidad Politécnica de Uruapan",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Universidad Tecnológica de Morelia",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Universidad Michoacana de San Nicolás de Hidalgo (UMSNH)",
    type: "universidad",
    state: "Michoacán",
    country: "México",
  },
  // ── Michoacán — Preparatorias ─────────────────────────────────────────────
  {
    name: "Preparatoria Federal Lázaro Cárdenas (Uruapan)",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Preparatoria UMSNH",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CONALEP Uruapan",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CONALEP Morelia",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CONALEP Zamora",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CBTIS 82 Uruapan",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CBTIS 43 Morelia",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CBTIS 146 Zamora",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CBTIS 68 Lázaro Cárdenas",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "CECYTE Michoacán",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  {
    name: "Colegio de Bachilleres del Estado de Michoacán (COBAEM)",
    type: "preparatoria",
    state: "Michoacán",
    country: "México",
  },
  // ── Jalisco ───────────────────────────────────────────────────────────────
  {
    name: "Instituto Tecnológico de Guadalajara",
    type: "universidad",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "ITESO - Instituto Tecnológico y de Estudios Superiores de Occidente",
    type: "universidad",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "Universidad de Guadalajara (UdeG)",
    type: "universidad",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Guadalajara (UAG)",
    type: "universidad",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "Universidad Politécnica de Jalisco",
    type: "universidad",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "Universidad Tecnológica de Guadalajara",
    type: "universidad",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "Bachillerato UdeG (SEMS)",
    type: "preparatoria",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "CONALEP Guadalajara",
    type: "preparatoria",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "CECYTE Jalisco",
    type: "preparatoria",
    state: "Jalisco",
    country: "México",
  },
  {
    name: "Colegio de Bachilleres del Estado de Jalisco (COBAEJ)",
    type: "preparatoria",
    state: "Jalisco",
    country: "México",
  },
  // ── Guanajuato ───────────────────────────────────────────────────────────
  {
    name: "Instituto Tecnológico de León",
    type: "universidad",
    state: "Guanajuato",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Celaya",
    type: "universidad",
    state: "Guanajuato",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Irapuato",
    type: "universidad",
    state: "Guanajuato",
    country: "México",
  },
  {
    name: "Universidad de Guanajuato (UG)",
    type: "universidad",
    state: "Guanajuato",
    country: "México",
  },
  {
    name: "Universidad Politécnica de Guanajuato",
    type: "universidad",
    state: "Guanajuato",
    country: "México",
  },
  {
    name: "CECYTE Guanajuato",
    type: "preparatoria",
    state: "Guanajuato",
    country: "México",
  },
  // ── Ciudad de México ──────────────────────────────────────────────────────
  {
    name: "IPN - Instituto Politécnico Nacional",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "UNAM - Universidad Nacional Autónoma de México",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "Universidad Autónoma Metropolitana (UAM)",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Monterrey (ITESM)",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "Universidad Iberoamericana (Ibero)",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "Universidad Anáhuac México",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "Universidad La Salle México",
    type: "universidad",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "CCH-UNAM (Colegio de Ciencias y Humanidades)",
    type: "preparatoria",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "ENP-UNAM (Escuela Nacional Preparatoria)",
    type: "preparatoria",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "CETIS 1 Ciudad de México",
    type: "preparatoria",
    state: "Ciudad de México",
    country: "México",
  },
  // ── Nuevo León ───────────────────────────────────────────────────────────
  {
    name: "Universidad Autónoma de Nuevo León (UANL)",
    type: "universidad",
    state: "Nuevo León",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Monterrey (ITESM) Campus Monterrey",
    type: "universidad",
    state: "Nuevo León",
    country: "México",
  },
  {
    name: "Universidad de Monterrey (UDEM)",
    type: "universidad",
    state: "Nuevo León",
    country: "México",
  },
  {
    name: "Preparatoria UANL",
    type: "preparatoria",
    state: "Nuevo León",
    country: "México",
  },
  {
    name: "CONALEP Monterrey",
    type: "preparatoria",
    state: "Nuevo León",
    country: "México",
  },
  // ── Veracruz ─────────────────────────────────────────────────────────────
  {
    name: "Instituto Tecnológico de Veracruz",
    type: "universidad",
    state: "Veracruz",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Orizaba",
    type: "universidad",
    state: "Veracruz",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Xalapa",
    type: "universidad",
    state: "Veracruz",
    country: "México",
  },
  {
    name: "Universidad Veracruzana (UV)",
    type: "universidad",
    state: "Veracruz",
    country: "México",
  },
  {
    name: "Colegio de Bachilleres del Estado de Veracruz (COBAEV)",
    type: "preparatoria",
    state: "Veracruz",
    country: "México",
  },
  // ── Puebla ───────────────────────────────────────────────────────────────
  {
    name: "Instituto Tecnológico de Puebla",
    type: "universidad",
    state: "Puebla",
    country: "México",
  },
  {
    name: "Benemérita Universidad Autónoma de Puebla (BUAP)",
    type: "universidad",
    state: "Puebla",
    country: "México",
  },
  {
    name: "Universidad Iberoamericana Puebla",
    type: "universidad",
    state: "Puebla",
    country: "México",
  },
  {
    name: "Universidad Politécnica de Puebla",
    type: "universidad",
    state: "Puebla",
    country: "México",
  },
  {
    name: "Universidad Tecnológica de Puebla",
    type: "universidad",
    state: "Puebla",
    country: "México",
  },
  // ── Querétaro ────────────────────────────────────────────────────────────
  {
    name: "Instituto Tecnológico de Querétaro",
    type: "universidad",
    state: "Querétaro",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Querétaro (UAQ)",
    type: "universidad",
    state: "Querétaro",
    country: "México",
  },
  {
    name: "Universidad Politécnica de Querétaro",
    type: "universidad",
    state: "Querétaro",
    country: "México",
  },
  {
    name: "Universidad Tecnológica de Querétaro",
    type: "universidad",
    state: "Querétaro",
    country: "México",
  },
  // ── Otros estados México ─────────────────────────────────────────────────
  {
    name: "Instituto Tecnológico de Aguascalientes",
    type: "universidad",
    state: "Aguascalientes",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Saltillo",
    type: "universidad",
    state: "Coahuila",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Durango",
    type: "universidad",
    state: "Durango",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Mérida",
    type: "universidad",
    state: "Yucatán",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Cancún",
    type: "universidad",
    state: "Quintana Roo",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Tuxtla Gutiérrez",
    type: "universidad",
    state: "Chiapas",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Oaxaca",
    type: "universidad",
    state: "Oaxaca",
    country: "México",
  },
  {
    name: "Instituto Tecnológico Superior de Huatulco",
    type: "universidad",
    state: "Oaxaca",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Tijuana",
    type: "universidad",
    state: "Baja California",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Baja California (UABC)",
    type: "universidad",
    state: "Baja California",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Chihuahua",
    type: "universidad",
    state: "Chihuahua",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Hermosillo",
    type: "universidad",
    state: "Sonora",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Tampico",
    type: "universidad",
    state: "Tamaulipas",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Zacatecas",
    type: "universidad",
    state: "Zacatecas",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de San Luis Potosí",
    type: "universidad",
    state: "San Luis Potosí",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Culiacán",
    type: "universidad",
    state: "Sinaloa",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Colima",
    type: "universidad",
    state: "Colima",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Villahermosa",
    type: "universidad",
    state: "Tabasco",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de La Paz",
    type: "universidad",
    state: "Baja California Sur",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Cuernavaca",
    type: "universidad",
    state: "Morelos",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Toluca",
    type: "universidad",
    state: "Estado de México",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Pachuca",
    type: "universidad",
    state: "Hidalgo",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Tepic",
    type: "universidad",
    state: "Nayarit",
    country: "México",
  },
  {
    name: "Instituto Tecnológico de Apizaco",
    type: "universidad",
    state: "Tlaxcala",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Nuevo León (UANL)",
    type: "universidad",
    state: "Nuevo León",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Sinaloa (UAS)",
    type: "universidad",
    state: "Sinaloa",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Sonora (UNISON)",
    type: "universidad",
    state: "Sonora",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Aguascalientes (UAA)",
    type: "universidad",
    state: "Aguascalientes",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Chihuahua (UACH)",
    type: "universidad",
    state: "Chihuahua",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Coahuila (UAdeC)",
    type: "universidad",
    state: "Coahuila",
    country: "México",
  },
  {
    name: "Universidad Autónoma de San Luis Potosí (UASLP)",
    type: "universidad",
    state: "San Luis Potosí",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Nayarit (UAN)",
    type: "universidad",
    state: "Nayarit",
    country: "México",
  },
  {
    name: "Universidad de Colima (UCOL)",
    type: "universidad",
    state: "Colima",
    country: "México",
  },
  {
    name: "Universidad Autónoma Benito Juárez de Oaxaca (UABJO)",
    type: "universidad",
    state: "Oaxaca",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Chiapas (UNACH)",
    type: "universidad",
    state: "Chiapas",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Yucatán (UADY)",
    type: "universidad",
    state: "Yucatán",
    country: "México",
  },
  {
    name: "Universidad Autónoma del Estado de México (UAEM)",
    type: "universidad",
    state: "Estado de México",
    country: "México",
  },
  {
    name: "Universidad Autónoma del Estado de Morelos (UAEM)",
    type: "universidad",
    state: "Morelos",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Guerrero (UAGRO)",
    type: "universidad",
    state: "Guerrero",
    country: "México",
  },
  {
    name: "Universidad Autónoma del Estado de Hidalgo (UAEH)",
    type: "universidad",
    state: "Hidalgo",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Tamaulipas (UAT)",
    type: "universidad",
    state: "Tamaulipas",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Zacatecas (UAZ)",
    type: "universidad",
    state: "Zacatecas",
    country: "México",
  },
  {
    name: "Universidad Autónoma de Durango (UAD)",
    type: "universidad",
    state: "Durango",
    country: "México",
  },
  {
    name: "Universidad del Valle de México (UVM)",
    type: "universidad",
    state: "Nacional",
    country: "México",
  },
  {
    name: "Universidad Regiomontana (UR)",
    type: "universidad",
    state: "Nuevo León",
    country: "México",
  },
  {
    name: "Universidad CETYS",
    type: "universidad",
    state: "Baja California",
    country: "México",
  },
  {
    name: "Prepa Tec (ITESM)",
    type: "preparatoria",
    state: "Nacional",
    country: "México",
  },
  {
    name: "CCH-UNAM (Colegio de Ciencias y Humanidades)",
    type: "preparatoria",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "ENP-UNAM (Escuela Nacional Preparatoria)",
    type: "preparatoria",
    state: "Ciudad de México",
    country: "México",
  },
  {
    name: "Colegio de Bachilleres del Estado de Oaxaca (COBAO)",
    type: "preparatoria",
    state: "Oaxaca",
    country: "México",
  },
  {
    name: "Colegio de Bachilleres del Estado de México",
    type: "preparatoria",
    state: "Estado de México",
    country: "México",
  },
  {
    name: "TELEBACHILLERATO",
    type: "preparatoria",
    state: "Nacional",
    country: "México",
  },
  {
    name: "CECYTE Guanajuato",
    type: "preparatoria",
    state: "Guanajuato",
    country: "México",
  },
  {
    name: "CECYTE Guerrero",
    type: "preparatoria",
    state: "Guerrero",
    country: "México",
  },
  // ── Estados Unidos ────────────────────────────────────────────────────────
  {
    name: "MIT - Massachusetts Institute of Technology",
    type: "universidad",
    state: "Massachusetts",
    country: "Estados Unidos",
  },
  {
    name: "Stanford University",
    type: "universidad",
    state: "California",
    country: "Estados Unidos",
  },
  {
    name: "California Institute of Technology (Caltech)",
    type: "universidad",
    state: "California",
    country: "Estados Unidos",
  },
  {
    name: "Carnegie Mellon University",
    type: "universidad",
    state: "Pennsylvania",
    country: "Estados Unidos",
  },
  {
    name: "University of Texas at Austin",
    type: "universidad",
    state: "Texas",
    country: "Estados Unidos",
  },
  {
    name: "University of California, Berkeley",
    type: "universidad",
    state: "California",
    country: "Estados Unidos",
  },
  {
    name: "Harvard University",
    type: "universidad",
    state: "Massachusetts",
    country: "Estados Unidos",
  },
  {
    name: "Georgia Institute of Technology",
    type: "universidad",
    state: "Georgia",
    country: "Estados Unidos",
  },
  {
    name: "University of Michigan",
    type: "universidad",
    state: "Michigan",
    country: "Estados Unidos",
  },
  // ── Canadá ────────────────────────────────────────────────────────────────
  {
    name: "University of Toronto",
    type: "universidad",
    state: "Ontario",
    country: "Canadá",
  },
  {
    name: "University of British Columbia",
    type: "universidad",
    state: "British Columbia",
    country: "Canadá",
  },
  {
    name: "McGill University",
    type: "universidad",
    state: "Quebec",
    country: "Canadá",
  },
  {
    name: "McMaster University",
    type: "universidad",
    state: "Ontario",
    country: "Canadá",
  },
  {
    name: "University of Waterloo",
    type: "universidad",
    state: "Ontario",
    country: "Canadá",
  },
  // ── Guatemala ─────────────────────────────────────────────────────────────
  {
    name: "Universidad de San Carlos de Guatemala",
    type: "universidad",
    state: "",
    country: "Guatemala",
  },
  {
    name: "Universidad Rafael Landívar",
    type: "universidad",
    state: "",
    country: "Guatemala",
  },
  {
    name: "Universidad del Valle de Guatemala",
    type: "universidad",
    state: "",
    country: "Guatemala",
  },
  {
    name: "Instituto Tecnológico de Guatemala",
    type: "universidad",
    state: "",
    country: "Guatemala",
  },
  // ── El Salvador ───────────────────────────────────────────────────────────
  {
    name: "Universidad de El Salvador",
    type: "universidad",
    state: "",
    country: "El Salvador",
  },
  {
    name: "Universidad Don Bosco",
    type: "universidad",
    state: "",
    country: "El Salvador",
  },
  // ── Honduras ─────────────────────────────────────────────────────────────
  {
    name: "Universidad Nacional Autónoma de Honduras (UNAH)",
    type: "universidad",
    state: "",
    country: "Honduras",
  },
  {
    name: "Universidad Tecnológica Centroamericana (UNITEC)",
    type: "universidad",
    state: "",
    country: "Honduras",
  },
  // ── Costa Rica ───────────────────────────────────────────────────────────
  {
    name: "Universidad de Costa Rica (UCR)",
    type: "universidad",
    state: "",
    country: "Costa Rica",
  },
  {
    name: "Instituto Tecnológico de Costa Rica (TEC)",
    type: "universidad",
    state: "",
    country: "Costa Rica",
  },
  // ── Colombia ─────────────────────────────────────────────────────────────
  {
    name: "Universidad Nacional de Colombia",
    type: "universidad",
    state: "",
    country: "Colombia",
  },
  {
    name: "Universidad de los Andes",
    type: "universidad",
    state: "",
    country: "Colombia",
  },
  // ── Argentina ────────────────────────────────────────────────────────────
  {
    name: "Universidad de Buenos Aires (UBA)",
    type: "universidad",
    state: "",
    country: "Argentina",
  },
  {
    name: "Instituto Tecnológico de Buenos Aires (ITBA)",
    type: "universidad",
    state: "",
    country: "Argentina",
  },
  // ── España ───────────────────────────────────────────────────────────────
  {
    name: "Universidad Politécnica de Madrid",
    type: "universidad",
    state: "",
    country: "España",
  },
  {
    name: "Universidad de Barcelona",
    type: "universidad",
    state: "",
    country: "España",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  CATÁLOGO DE CARRERAS
//  type: 'universidad' (aplica para uni) | 'preparatoria' (aplica para prepa) | 'ambos'
// ─────────────────────────────────────────────────────────────────────────────

const CAREERS_CATALOG = {
  universidad: [
    // Ingenierías
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
    "Ingeniería en Software",
    "Ingeniería en Redes Computacionales",
    "Ingeniería en Ciberseguridad",
    "Ingeniería en Inteligencia Artificial",
    "Ingeniería en Gestión Empresarial",
    "Ingeniería en Ciencias de Datos",
    "Ingeniería en Nanotecnología",
    "Ingeniería en Manufactura",
    "Ingeniería Ambiental",
    "Ingeniería en Logística",
    "Ingeniería Aeronáutica",
    "Ingeniería en Alimentos",
    "Ingeniería en Geomática",
    // Licenciaturas
    "Licenciatura en Informática",
    "Licenciatura en Sistemas de Información",
    "Licenciatura en Física",
    "Licenciatura en Matemáticas",
    "Licenciatura en Química",
    "Licenciatura en Administración de Empresas",
    "Licenciatura en Contaduría",
    "Licenciatura en Mercadotecnia",
    "Licenciatura en Negocios Internacionales",
    "Licenciatura en Diseño Gráfico",
    "Licenciatura en Diseño Industrial",
    "Licenciatura en Animación Digital",
    "Licenciatura en Derecho",
    "Licenciatura en Comunicación",
    "Licenciatura en Educación",
    "Licenciatura en Psicología",
    "Licenciatura en Enfermería",
    "Médico Cirujano y Partero",
    "Arquitectura",
    // Técnico superior
    "Técnico Superior Universitario en Sistemas",
    "Técnico Superior Universitario en Electrónica",
    "Técnico Superior Universitario en Mecatrónica",
    "Técnico Superior Universitario en TIC",
  ],
  preparatoria: [
    // Especialidades / bachilleratos tecnológicos
    "Técnico en Programación",
    "Técnico en Mantenimiento Industrial",
    "Técnico en Redes",
    "Técnico en Electrónica",
    "Técnico en Mecatrónica",
    "Técnico en Administración",
    "Técnico en Contabilidad",
    "Técnico en Dibujo Arquitectónico",
    "Técnico en Enfermería General",
    "Bachillerato General",
    "Bachillerato Tecnológico",
    "Bachillerato Bivalente",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
//  API PÚBLICA — usada por acceso.js y admin
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna instituciones filtradas por país y tipo.
 * @param {string} country  - "México", "Estados Unidos", etc. ("" = todos)
 * @param {string} type     - "universidad" | "preparatoria" | "" = ambos
 * @returns {object[]}
 */
function getInstitutions(country = "", type = "") {
  return INSTITUTIONS_CATALOG.filter((inst) => {
    const matchCountry = !country || inst.country === country;
    const matchType = !type || inst.type === type;
    return matchCountry && matchType;
  });
}

/**
 * Retorna sólo los nombres para autocompletado.
 */
function getInstitutionNames(country = "", type = "") {
  return getInstitutions(country, type).map((i) => i.name);
}

/**
 * Retorna carreras según tipo de institución.
 * @param {string} type - "universidad" | "preparatoria"
 */
function getCareers(type = "universidad") {
  return CAREERS_CATALOG[type] || CAREERS_CATALOG.universidad;
}

/**
 * Agrega institución propuesta por usuario al catálogo local (en memoria).
 * En producción esto también debe ir al servidor vía API.
 */
function proposeInstitution(name, type, country) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const exists = INSTITUTIONS_CATALOG.some(
    (i) => i.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!exists) {
    INSTITUTIONS_CATALOG.push({
      name: trimmed,
      type: type || "universidad",
      state: "",
      country: country || "México",
      proposed: true, // marca para admin
    });
  }
  return true;
}

/**
 * Agrega carrera propuesta por usuario al catálogo local.
 */
function proposeCareer(name, institutionType) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const list = CAREERS_CATALOG[institutionType] || CAREERS_CATALOG.universidad;
  const exists = list.some((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (!exists) list.push(trimmed);
  return true;
}

/**
 * Lista países disponibles en el catálogo.
 */
function getAvailableCountries() {
  return [...new Set(INSTITUTIONS_CATALOG.map((i) => i.country))].sort();
}
