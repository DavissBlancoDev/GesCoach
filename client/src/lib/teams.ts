import type { Category, Modality, Role } from "../api/teams";

// Nombre para mostrar de cada categoría (en la base de datos van sin tildes)
export const CATEGORY_LABELS: Record<Category, string> = {
  prebenjamin: "Prebenjamín",
  benjamin: "Benjamín",
  alevin: "Alevín",
  infantil: "Infantil",
  cadete: "Cadete",
  juvenil: "Juvenil",
  senior: "Senior",
  veteranos: "Veteranos",
};

export const MODALITY_LABELS: Record<Modality, string> = {
  f7: "Fútbol 7",
  f8: "Fútbol 8",
  f11: "Fútbol 11",
};

export const ROLE_LABELS: Record<Role, string> = {
  head_coach: "Entrenador principal",
  assistant_coach: "Segundo entrenador",
  delegate: "Delegado",
  team_manager: "Directivo de equipo",
  medical: "Médico",
};

/**
 * Modalidad que suele corresponder a cada categoría. Es solo una sugerencia
 * orientativa: cada federación regional lo decide, así que el usuario
 * siempre puede cambiarla.
 */
export function suggestedModality(category: Category): Modality {
  switch (category) {
    case "prebenjamin":
    case "benjamin":
      return "f8";
    case "alevin":
      return "f7";
    default:
      return "f11";
  }
}

/** Convierte 2026 en "2026/2027". */
export function seasonLabel(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

/**
 * Año de inicio de la temporada en curso. Las temporadas empiezan en
 * verano, así que de julio en adelante cuenta el año actual y antes de
 * julio, el anterior.
 */
export function currentSeasonStartYear(): number {
  const hoy = new Date();
  return hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
}