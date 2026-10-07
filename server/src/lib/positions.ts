// Posiciones concretas. Esta es la lista que se guarda en la base de datos.
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

/**
 * Grupo al que pertenece cada posición. Al ser un Record<Position, ...>,
 * TypeScript obliga a incluir TODAS las posiciones: si añades una nueva a
 * la lista de arriba y olvidas asignarle grupo, el código no compila.
 */
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