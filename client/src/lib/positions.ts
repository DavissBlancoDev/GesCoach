// Posiciones concretas. Deben coincidir con las del servidor
// (server/src/lib/positions.ts).
export const POSITIONS = [
  "portero",
  "central",
  "lateral_izquierdo",
  "lateral_derecho",
  "carrilero_izquierdo",
  "carrilero_derecho",
  "libero",
  "pivote",
  "mediapunta",
  "interior_derecho",
  "interior_izquierdo",
  "mediocentro",
  "extremo_derecho",
  "extremo_izquierdo",
  "segundo_delantero",
  "delantero_centro",
] as const;

export type Position = (typeof POSITIONS)[number];

export type PositionGroup = "portero" | "defensa" | "centrocampista" | "atacante";

// Orden en el que se muestran los grupos en los desplegables
export const POSITION_GROUPS: PositionGroup[] = [
  "portero",
  "defensa",
  "centrocampista",
  "atacante",
];

export const GROUP_LABELS: Record<PositionGroup, string> = {
  portero: "Portero",
  defensa: "Defensas",
  centrocampista: "Centrocampistas",
  atacante: "Atacantes",
};

// Al ser un Record<Position, ...>, TypeScript obliga a incluir todas las
// posiciones: si añades una nueva y olvidas alguna tabla, no compila.
export const POSITION_GROUP: Record<Position, PositionGroup> = {
  portero: "portero",
  central: "defensa",
  lateral_izquierdo: "defensa",
  lateral_derecho: "defensa",
  carrilero_izquierdo: "defensa",
  carrilero_derecho: "defensa",
  libero: "defensa",
  pivote: "centrocampista",
  mediapunta: "centrocampista",
  interior_derecho: "centrocampista",
  interior_izquierdo: "centrocampista",
  mediocentro: "centrocampista",
  extremo_derecho: "atacante",
  extremo_izquierdo: "atacante",
  segundo_delantero: "atacante",
  delantero_centro: "atacante",
};

// Nombre completo, para fichas y formularios
export const POSITION_LABELS: Record<Position, string> = {
  portero: "Portero",
  central: "Central",
  lateral_izquierdo: "Lateral izquierdo",
  lateral_derecho: "Lateral derecho",
  carrilero_izquierdo: "Carrilero izquierdo",
  carrilero_derecho: "Carrilero derecho",
  libero: "Líbero",
  pivote: "Pivote",
  mediapunta: "Mediapunta",
  interior_derecho: "Interior derecho",
  interior_izquierdo: "Interior izquierdo",
  mediocentro: "Mediocentro",
  extremo_derecho: "Extremo derecho",
  extremo_izquierdo: "Extremo izquierdo",
  segundo_delantero: "Segundo delantero",
  delantero_centro: "Delantero centro",
};

// Abreviatura para vistas compactas como la lista de la plantilla
export const POSITION_ABBREVIATIONS: Record<Position, string> = {
  portero: "POR",
  central: "DFC",
  lateral_izquierdo: "LI",
  lateral_derecho: "LD",
  carrilero_izquierdo: "CAI",
  carrilero_derecho: "CAD",
  libero: "LIB",
  pivote: "PIV",
  mediapunta: "MP",
  interior_derecho: "ID",
  interior_izquierdo: "II",
  mediocentro: "MC",
  extremo_derecho: "ED",
  extremo_izquierdo: "EI",
  segundo_delantero: "SD",
  delantero_centro: "DC",
};

// Colores de la etiqueta según el grupo. Las clases de Tailwind van
// escritas completas (no se pueden construir con texto) para que Tailwind
// las detecte al compilar.
export const GROUP_COLORS: Record<PositionGroup, string> = {
  portero: "bg-amber-100 text-amber-800",
  defensa: "bg-blue-100 text-blue-800",
  centrocampista: "bg-green-100 text-green-800",
  atacante: "bg-red-100 text-red-800",
};