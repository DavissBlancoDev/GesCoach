import type { PlayerStatus } from "../api/players";
import { PLAYER_STATUS_LABELS } from "../lib/players";

// Símbolo y estilo de cada estado. Para cambiar un icono, edita esta tabla.
const STATUS_ICONS: Record<PlayerStatus, { symbol: string; className: string }> = {
  available: { symbol: "✅", className: "" },
  injured: { symbol: "✚", className: "font-bold text-red-600" }, // cruz roja
  suspended: { symbol: "⛔", className: "" },
  inactive: { symbol: "💤", className: "" },
};

/**
 * Icono del estado de un jugador. Al pasar el ratón muestra el nombre del
 * estado, y los lectores de pantalla lo leen gracias a aria-label.
 */
function StatusIcon({ status }: { status: PlayerStatus }) {
  const label = PLAYER_STATUS_LABELS[status];
  const { symbol, className } = STATUS_ICONS[status];

  return (
    <span role="img" aria-label={label} title={label} className={`cursor-default ${className}`}>
      {symbol}
    </span>
  );
}

export default StatusIcon;
