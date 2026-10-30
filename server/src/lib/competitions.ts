import type { MatchCompetition } from "../models/Match";

/**
 * Máximo de convocados según el tipo de partido. null = sin límite.
 * Es una regla de la competición, no de la pantalla: por eso vive aquí y el
 * servidor la comprueba al guardar la convocatoria.
 */
export const MAX_CALLUP: Record<MatchCompetition, number | null> = {
  league: 16,
  cup: null,
  tournament: null,
  friendly: null,
};
