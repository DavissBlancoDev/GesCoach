import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { PlayerStats, SquadPlayer } from "../api/players";
import { STAT_COLUMNS, isGoalkeeper } from "../lib/stats";
import { licenseLabel } from "../lib/players";
import Flag from "./Flag";
import PositionBadge from "./PositionBadge";
import StatusIcon from "./StatusIcon";

interface SquadTableProps {
  players: SquadPlayer[];
  // false para los roles que no pueden ver estadísticas (por ejemplo, médico)
  showStats: boolean;
}

type SortKey =
  | "jerseyNumber"
  | "player"
  | "nationality"
  | "mainPosition"
  | "license"
  | keyof PlayerStats;
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  sort,
  selected,
  direction,
  onSort,
  title,
}: {
  label: string;
  sort: SortKey;
  selected: boolean;
  direction: SortDirection;
  onSort: (sort: SortKey) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sort)}
      aria-label={`Ordenar por ${label}`}
      title={title}
      className="inline-flex items-center gap-1 font-semibold hover:text-green-700"
    >
      {label}
      <span className={selected ? "text-green-700" : "text-gray-400"} aria-hidden="true">
        {selected ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
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
  const [sortKey, setSortKey] = useState<SortKey>("player");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (sortKey === "jerseyNumber") {
        // Los jugadores sin dorsal siempre quedan al final.
        if (a.jerseyNumber == null && b.jerseyNumber == null) return 0;
        if (a.jerseyNumber == null) return 1;
        if (b.jerseyNumber == null) return -1;
        const result = a.jerseyNumber - b.jerseyNumber;
        return sortDirection === "asc" ? result : -result;
      }

      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      if (sortKey === "player") {
        aValue = a.nickname || `${a.name} ${a.surname}`;
        bValue = b.nickname || `${b.name} ${b.surname}`;
      } else if (sortKey === "license") {
        aValue = licenseLabel(a.licenseCategory, a.licenseLetter);
        bValue = licenseLabel(b.licenseCategory, b.licenseLetter);
      } else if (sortKey in (a.stats || {})) {
        aValue = a.stats?.[sortKey as keyof PlayerStats];
        bValue = b.stats?.[sortKey as keyof PlayerStats];
      } else {
        aValue = a[sortKey as "nationality" | "mainPosition"];
        bValue = b[sortKey as "nationality" | "mainPosition"];
      }

      // Los valores vacíos quedan al final en ambos sentidos.
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      const result = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), "es", { sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
  }, [players, sortDirection, sortKey]);

  function changeSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-2 text-left sm:px-3">
                <SortHeader label="Dorsal" sort="jerseyNumber" selected={sortKey === "jerseyNumber"} direction={sortDirection} onSort={changeSort} />
              </th>
              <th className="sticky left-0 z-10 bg-gray-50 px-2 py-2 text-left sm:px-3">
                <SortHeader label="Jugador" sort="player" selected={sortKey === "player"} direction={sortDirection} onSort={changeSort} />
              </th>
              <th className="px-1 py-2 text-center sm:px-2">
                <SortHeader label="Nac." sort="nationality" title="Nacionalidad" selected={sortKey === "nationality"} direction={sortDirection} onSort={changeSort} />
              </th>
              <th className="px-1 py-2 text-left sm:px-2">
                <SortHeader label="Pos" sort="mainPosition" title="Posición" selected={sortKey === "mainPosition"} direction={sortDirection} onSort={changeSort} />
              </th>
              <th className="hidden px-2 py-2 text-left md:table-cell">
                <SortHeader label="Ficha" sort="license" selected={sortKey === "license"} direction={sortDirection} onSort={changeSort} />
              </th>
              {showStats &&
                STAT_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    title={col.title}
                    className={`px-1 py-2 text-center sm:px-2 ${
                      col.hideOnMobile ? "hidden md:table-cell" : ""
                    }`}
                  >
                    <SortHeader label={col.header} sort={col.key} title={col.title} selected={sortKey === col.key} direction={sortDirection} onSort={changeSort} />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPlayers.map((player) => {
              const goalkeeper = isGoalkeeper(player);
              // Si no tiene nombre futbolístico, mostramos el nombre completo
              const displayName = player.nickname || `${player.name} ${player.surname}`;

              return (
                <tr
                  key={player.id}
                  onClick={() => navigate(`/plantilla/${player.id}`)}
                  className="group cursor-pointer"
                >
                  <td className="px-2 py-2 text-center group-hover:bg-gray-50 sm:px-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                      {player.jerseyNumber ?? "–"}
                    </span>
                  </td>
                  <td className="sticky left-0 z-10 bg-white px-2 py-2 group-hover:bg-gray-50 sm:px-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/plantilla/${player.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-[6.5rem] truncate font-medium hover:underline sm:max-w-none"
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
                  <td className="hidden whitespace-nowrap px-2 py-2 group-hover:bg-gray-50 md:table-cell">
                    {licenseLabel(player.licenseCategory, player.licenseLetter)}
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
