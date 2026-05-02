/**
 * BASE DE DATOS DE ESCUELAS POR ESTADO
 * Datos de instituciones educativas en México y países seleccionados
 */

const schoolsData = {
  "mx-michoacan": [
    "Instituto Tecnológico Superior de Uruapan",
    "Instituto Tecnológico de Morelia",
    "UMSNH - Universidad Michoacana",
    "Instituto Tecnológico de Lázaro Cárdenas",
    "Tecnológico de Estudios Superiores de Zamora",
    "Instituto Tecnológico del Valle de México",
    "Centro Universitario de Aguascalientes",
    "Colegio de Ingenieros de Michoacán",
    "UPN - Universidad Pedagógica Nacional",
    "CBTis de Uruapan",
    "CBTa de Apatzingán",
    "Preparatoria Regional de Morelia",
  ],
  "mx-jalisco": [
    "Instituto Tecnológico de Guadalajara",
    "ITESO - Instituto Tecnológico y de Estudios Superiores de Occidente",
    "Universidad de Guadalajara",
    "Universidad Autónoma de Guadalajara",
    "Instituto Politécnico Nacional (IPN)",
    "CBTis Guadalajara",
    "Universidad del Valle de Atemajac",
  ],
  "mx-guanajuato": [
    "Instituto Tecnológico de León",
    "Instituto Tecnológico de Celaya",
    "Universidad de Guanajuato",
    "ITESM Campus León",
    "Universidad Iberoamericana León",
    "CBTis León",
    "UNIDEG Guanajuato",
  ],
  "mx-cdmx": [
    "IPN - Instituto Politécnico Nacional",
    "UNAM - Universidad Nacional Autónoma de México",
    "ITESM Campus Ciudad de México",
    "Colegio de Ingenieros de México",
    "Universidad Anáhuac",
    "Universidad la Salle",
    "Ibero - Universidad Iberoamericana",
    "TEC - Tecnológico de Monterrey",
  ],
  "mx-coahuila": [
    "Instituto Tecnológico de La Laguna",
    "TEC de Monterrey Campus Saltillo",
    "Universidad Autónoma de Coahuila",
    "Universidad de Coahuila",
    "CBTis Saltillo",
  ],
  "mx-nuevoleon": [
    "TEC de Monterrey Campus Monterrey",
    "Universidad del Zulia",
    "Universidad de Monterrey",
    "FIME - Facultad de Ingeniería Mecánica y Eléctrica",
    "UanL - Universidad Autónoma de Nuevo León",
    "CBTis Monterrey",
  ],
  "mx-veracruz": [
    "Instituto Tecnológico de Veracruz",
    "Universidad Veracruzana",
    "Instituto Tecnológico de Orizaba",
    "Instituto Tecnológico de Xalapa",
    "UNIVE - Universidad de Veracruz",
    "CBTis Veracruz",
  ],
  "mx-puebla": [
    "Instituto Tecnológico de Puebla",
    "BUAP - Benemérita Universidad Autónoma de Puebla",
    "Universidad Iberoamericana Puebla",
    "UPA - Universidad Popular Autónoma de Puebla",
    "CBTis Puebla",
  ],
  "mx-tabasco": [
    "Instituto Tecnológico de Villahermosa",
    "Universidad Juárez Autónoma de Tabasco",
    "CBTis Villahermosa",
  ],
  "mx-campeche": [
    "Instituto Tecnológico de Campeche",
    "Universidad Autónoma de Campeche",
    "CBTis Campeche",
  ],
  "mx-chiapas": [
    "Instituto Tecnológico de Tuxtla Gutiérrez",
    "Universidad de Ciencias y Artes de Chiapas",
    "CBTis Chiapas",
  ],
  "mx-yucatan": [
    "Instituto Tecnológico de Mérida",
    "Universidad Autónoma de Yucatán",
    "ITESM Campus Mérida",
    "CBTis Mérida",
  ],
  "mx-quintanaroo": ["Instituto Tecnológico de Cancún", "CBTis Cancún"],
  "mx-chihuahua": [
    "Instituto Tecnológico de Chihuahua",
    "Universidad Autónoma de Chihuahua",
    "CBTis Chihuahua",
  ],
  "mx-durango": [
    "Instituto Tecnológico de Durango",
    "Universidad Juárez del Estado de Durango",
    "CBTis Durango",
  ],
  "mx-sinaloa": [
    "Instituto Tecnológico de Sinaloa",
    "Universidad Autónoma de Sinaloa",
    "CBTis Sinaloa",
  ],
  "mx-sonora": [
    "Instituto Tecnológico de Hermosillo",
    "Universidad de Sonora",
    "CBTis Hermosillo",
  ],
  "mx-tamaulipas": [
    "Instituto Tecnológico de Tampico",
    "Universidad Autónoma de Tamaulipas",
    "CBTis Tampico",
  ],
  "mx-bajacalifornia": [
    "Instituto Tecnológico de Tijuana",
    "Universidad Autónoma de Baja California",
    "CBTis Tijuana",
  ],
  "mx-bajacaliforniasur": ["Instituto Tecnológico de La Paz", "CBTis La Paz"],
  "mx-colima": [
    "Instituto Tecnológico de Colima",
    "Universidad de Colima",
    "CBTis Colima",
  ],
  "mx-hidalgo": [
    "Instituto Tecnológico de Pachuca",
    "Universidad Autónoma del Estado de Hidalgo",
    "CBTis Pachuca",
  ],
  "mx-morelos": [
    "Instituto Tecnológico de Morelos",
    "Universidad Autónoma del Estado de Morelos",
    "CBTis Cuernavaca",
  ],
  "mx-nayarit": [
    "Instituto Tecnológico de Nayarit",
    "Universidad Autónoma de Nayarit",
    "CBTis Tepic",
  ],
  "mx-oaxaca": [
    "Instituto Tecnológico de Oaxaca",
    "Universidad Autónoma Benito Juárez de Oaxaca",
    "CBTis Oaxaca",
  ],
  "mx-queretaro": [
    "Instituto Tecnológico de Querétaro",
    "Universidad Autónoma de Querétaro",
    "ITESM Campus Querétaro",
    "CBTis Querétaro",
  ],
  "mx-sanluis": [
    "Instituto Tecnológico de San Luis Potosí",
    "Universidad Autónoma de San Luis Potosí",
    "CBTis San Luis Potosí",
  ],
  "mx-tlaxcala": [
    "Instituto Tecnológico de Tlaxcala",
    "Universidad Autónoma de Tlaxcala",
    "CBTis Tlaxcala",
  ],
  "mx-aguascalientes": [
    "Instituto Tecnológico de Aguascalientes",
    "Universidad Autónoma de Aguascalientes",
    "CBTis Aguascalientes",
  ],
  "mx-zacatecas": [
    "Instituto Tecnológico de Zacatecas",
    "Universidad Autónoma de Zacatecas",
    "CBTis Zacatecas",
  ],
  "mx-estadomexico": [
    "Instituto Tecnológico del Estado de México",
    "ITESM Campus Toluca",
    "Universidad Autónoma del Estado de México",
    "CBTis Toluca",
  ],
  "mx-guerrero": [
    "Instituto Tecnológico de Acapulco",
    "Universidad Autónoma de Guerrero",
    "CBTis Acapulco",
  ],
  us: [
    "MIT - Massachusetts Institute of Technology",
    "Stanford University",
    "California Institute of Technology",
    "Carnegie Mellon University",
    "University of Texas at Austin",
    "University of California, Berkeley",
    "Harvard University",
  ],
  ca: [
    "University of Toronto",
    "University of British Columbia",
    "McGill University",
    "McMaster University",
  ],
  gt: [
    "Universidad de San Carlos de Guatemala",
    "Universidad Rafael Landívar",
    "Instituto Tecnológico de Guatemala",
  ],
  other: [],
};

/**
 * Obtiene las escuelas de una ubicación
 */
function getSchoolsByLocation(location) {
  return schoolsData[location] || [];
}

/**
 * Obtiene el nombre legible de una ubicación
 */
function getLocationName(locationCode) {
  const names = {
    "mx-michoacan": "Michoacán",
    "mx-jalisco": "Jalisco",
    "mx-guanajuato": "Guanajuato",
    "mx-cdmx": "Ciudad de México",
    "mx-coahuila": "Coahuila",
    "mx-nuevoleon": "Nuevo León",
    "mx-veracruz": "Veracruz",
    "mx-puebla": "Puebla",
    "mx-tabasco": "Tabasco",
    "mx-campeche": "Campeche",
    "mx-chiapas": "Chiapas",
    "mx-yucatan": "Yucatán",
    "mx-quintanaroo": "Quintana Roo",
    "mx-chihuahua": "Chihuahua",
    "mx-durango": "Durango",
    "mx-sinaloa": "Sinaloa",
    "mx-sonora": "Sonora",
    "mx-tamaulipas": "Tamaulipas",
    "mx-bajacalifornia": "Baja California",
    "mx-bajacaliforniasur": "Baja California Sur",
    "mx-colima": "Colima",
    "mx-hidalgo": "Hidalgo",
    "mx-morelos": "Morelos",
    "mx-nayarit": "Nayarit",
    "mx-oaxaca": "Oaxaca",
    "mx-queretaro": "Querétaro",
    "mx-sanluis": "San Luis Potosí",
    "mx-tlaxcala": "Tlaxcala",
    "mx-aguascalientes": "Aguascalientes",
    "mx-zacatecas": "Zacatecas",
    "mx-estadomexico": "Estado de México",
    "mx-guerrero": "Guerrero",
    us: "Estados Unidos",
    ca: "Canadá",
    gt: "Guatemala",
    bz: "Belice",
    sv: "El Salvador",
    hn: "Honduras",
    ni: "Nicaragua",
    cr: "Costa Rica",
    pa: "Panamá",
    other: "Otro País",
  };
  return names[locationCode] || locationCode;
}
