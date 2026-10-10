import { Link, useNavigate } from "react-router-dom";
import type { SquadPlayer } from "../api/players";
import { STAT_COLUMNS, isGoalkeeper } from "../lib/stats";
import Flag from "./Flag";
import PositionBadge from "./PositionBadge";
import StatusIcon from "./StatusIcon";

interface SquadTableProps {
  players: SquadPlayer[];
  // false para los roles que no pueden ver estadísticas (por ejemplo, médico)
  showStats: boolean;
}

/**
 * Plantilla en formato tabla, a todo el ancho: dorsal, nombre futbolístico,
 * bandera, posición y estadísticas. Pulsar una fila abre la ficha del
 * jugador.
 *
 * Para evitar el desplazamiento lateral, en pantallas pequeñas se ocultan
 * las columnas marcadas con hideOnMobile (ver lib/stats.ts). Si aun así no
 * cabe, la tabla se puede desplazar y la columna del jugador queda fija.
 */
function SquadTable({ players, showStats }: SquadTableProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left sm:px-3">
                Jugador
              </th>
              <th className="px-1 py-2 sm:px-2" aria-label="Nacionalidad" />
              <th className="px-1 py-2 text-left sm:px-2">Pos</th>
              {showStats &&
                STAT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    title={col.title}
                    className={`px-1 py-2 text-center sm:px-2 ${
                      col.hideOnMobile ? "hidden md:table-cell" : ""
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {players.map((player) => {
              const goalkeeper = isGoalkeeper(player);
              // Si no tiene nombre futbolístico, mostramos el nombre completo
              const displayName = player.nickname || `${player.name} ${player.surname}`;

              return (
                <tr
                  key={player.id}
                  onClick={() => navigate(`/plantilla/${player.id}`)}
                  className="group cursor-pointer"
                >
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 group-hover:bg-gray-50 sm:px-3">
                    <div className="flex items-center gap-2">
                      {/* Dorsal redondeado, o un guion si no tiene */}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                        {player.jerseyNumber ?? "–"}
                      </span>
                      {/* El enlace permite navegar con teclado; stopPropagation evita navegar dos veces */}
                      <Link
                        to={`/plantilla/${player.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-26 truncate font-medium hover:underline sm:max-w-none"
                      >
                        {displayName}
                      </Link>
                      <StatusIcon status={player.status} />
                    </div>
                  </td>
                  <td className="px-1 py-2 text-center group-hover:bg-gray-50 sm:px-2">
                    <Flag code={player.nationality} />
                  </td>
                  <td className="px-1 py-2 group-hover:bg-gray-50 sm:px-2">
                    <PositionBadge position={player.mainPosition} />
                  </td>
                  {showStats &&
                    STAT_COLUMNS.map((col) => {
                      const value = player.stats?.[col.key];
                      // Los datos de portero solo se muestran a quien lo es
                      const text = col.goalkeeperOnly && !goalkeeper ? "–" : (value ?? "–");
                      return (
                        <td
                          key={col.key}
                          className={`px-1 py-2 text-center tabular-nums group-hover:bg-gray-50 sm:px-2 ${
                            col.hideOnMobile ? "hidden md:table-cell" : ""
                          }`}
                        >
                          {text}
                        </td>
                      );
                    })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda: en el móvil no hay "pasar el ratón", así que se explica aquí */}
      {showStats && (
        <p className="mt-2 text-xs text-gray-500">
          {STAT_COLUMNS.map((col) => `${col.header} = ${col.title}`).join(" · ")}
        </p>
      )}
    </>
  );
}

export default SquadTable;
