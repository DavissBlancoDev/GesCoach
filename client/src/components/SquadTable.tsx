import type { PlayerStats, SquadPlayer } from "../api/players";
import Flag from "./Flag";
import PositionBadge from "./PositionBadge";
import StatusIcon from "./StatusIcon";

// Una columna de estadística: cómo se llama el dato, cómo se abrevia en la
// cabecera y qué significa. Las marcadas como "goalkeeperOnly" solo tienen
// sentido para porteros.
interface StatColumn {
  key: keyof PlayerStats;
  header: string;
  title: string;
  goalkeeperOnly?: boolean;
}

const STAT_COLUMNS: StatColumn[] = [
  { key: "calledUp", header: "Conv", title: "Partidos convocado" },
  { key: "played", header: "PJ", title: "Partidos jugados" },
  { key: "started", header: "PT", title: "Partidos como titular" },
  { key: "minutes", header: "Min", title: "Minutos jugados" },
  { key: "goals", header: "G", title: "Goles" },
  { key: "assists", header: "A", title: "Asistencias" },
  { key: "yellowCards", header: "🟨", title: "Tarjetas amarillas" },
  { key: "redCards", header: "🟥", title: "Tarjetas rojas" },
  { key: "cleanSheets", header: "P0", title: "Porterías a cero", goalkeeperOnly: true },
  { key: "goalsConceded", header: "GE", title: "Goles encajados", goalkeeperOnly: true },
];

interface SquadTableProps {
  players: SquadPlayer[];
  // false para los roles que no pueden ver estadísticas (por ejemplo, médico)
  showStats: boolean;
}

/**
 * Plantilla en formato tabla: una fila por jugador, con su posición, edad,
 * estado y estadísticas. La columna del jugador queda fija al desplazar
 * en horizontal, para que en el móvil no se pierda de vista quién es quién.
 */
function SquadTable({ players, showStats }: SquadTableProps) {
  return (
    <>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left">Jugador</th>
              <th className="px-2 py-2 text-left">Pos</th>
              <th className="px-2 py-2 text-center">Edad</th>
              <th className="px-2 py-2 text-center">Estado</th>
              {showStats &&
                STAT_COLUMNS.map((col) => (
                  <th key={col.key} title={col.title} className="px-2 py-2 text-center">
                    {col.header}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {players.map((player) => {
              // Los datos de portero solo se muestran a quien lo es (principal o secundaria)
              const isGoalkeeper =
                player.mainPosition === "portero" ||
                player.secondaryPositions.includes("portero");

              return (
                <tr key={player.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center font-bold text-gray-500">
                        {player.jerseyNumber ?? "–"}
                      </span>
                      <span className="font-medium">
                        {player.name} {player.surname}
                      </span>
                      {player.nickname && (
                        <span className="text-gray-500">· {player.nickname}</span>
                      )}
                      <Flag code={player.nationality} />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <PositionBadge position={player.mainPosition} />
                  </td>
                  <td className="px-2 py-2 text-center">{player.age}</td>
                  <td className="px-2 py-2 text-center">
                    <StatusIcon status={player.status} />
                  </td>
                  {showStats &&
                    STAT_COLUMNS.map((col) => {
                      const value = player.stats?.[col.key];
                      const text = col.goalkeeperOnly && !isGoalkeeper ? "–" : (value ?? "–");
                      return (
                        <td key={col.key} className="px-2 py-2 text-center tabular-nums">
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
