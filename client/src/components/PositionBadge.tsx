import {
  GROUP_COLORS,
  POSITION_ABBREVIATIONS,
  POSITION_GROUP,
  POSITION_LABELS,
  type Position,
} from "../lib/positions";

/**
 * Posición abreviada con el color de su grupo (portero, defensa,
 * centrocampista o atacante). Al pasar el ratón muestra el nombre completo.
 */
function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      title={POSITION_LABELS[position]}
      className={`rounded px-2 py-1 text-xs font-semibold ${GROUP_COLORS[POSITION_GROUP[position]]}`}
    >
      {POSITION_ABBREVIATIONS[position]}
    </span>
  );
}

export default PositionBadge;