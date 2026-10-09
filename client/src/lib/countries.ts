// Códigos de país ISO 3166-1 (2 letras): estados reconocidos más Kosovo (XK)
// y Palestina (PS). Para añadir o quitar un país, edita esta lista.
const COUNTRY_CODES =
  "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ " +
  "CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET " +
  "FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT " +
  "JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY " +
  "MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM " +
  "PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR " +
  "SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS " +
  "XK YE ZA ZM ZW";

// El propio navegador traduce el código al nombre del país en español
const regionNames = new Intl.DisplayNames(["es"], { type: "region" });

/** Nombre del país en español a partir de su código ("ES" -> "España"). */
export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    // Si el código no es válido, mostramos el código tal cual
    return code;
  }
}

/**
 * Opciones para el desplegable de nacionalidad: España primero y el resto
 * por orden alfabético.
 */
export const COUNTRY_OPTIONS = COUNTRY_CODES.split(" ")
  .map((code) => ({ value: code, label: countryName(code) }))
  .sort((a, b) => {
    if (a.value === "ES") return -1;
    if (b.value === "ES") return 1;
    return a.label.localeCompare(b.label, "es");
  });