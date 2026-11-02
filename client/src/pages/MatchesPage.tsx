import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Match } from "../api/matches";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import {
  MATCH_STATUS_COLORS,
  MATCH_STATUS_LABELS,
  RESULT_STYLES,
  byDateAsc,
  canManageMatches,
  competitionLabel,
  finishedNewestFirst,
  formatMatchDateShort,
  matchTimeLabel,
  nextMatch,
} from "../lib/matches";
import DefaultBadge from "../components/DefaultBadge";
import { LastMatchCard, NextMatchCard, VenueIcon } from "../components/MatchCards";
import MatchForm from "../components/MatchForm";

/** Fila muy resumida de un partido reciente: sede, escudo del rival, nombre y marcador. */
function RecentRow({ match }: { match: Match }) {
  const style = match.result ? RESULT_STYLES[match.result] : undefined;

  return (
    <li>
      <Link
        to={`/partidos/${match.id}`}
        className={`flex items-center gap-3 rounded border p-2 ${style?.box ?? "border-gray-200"}`}
      >
        <VenueIcon venue={match.venue} />
        <DefaultBadge />
        <span className="min-w-0 flex-1 truncate font-medium">{match.opponent.name}</span>
        <span className="font-bold tabular-nums">
          {match.goalsFor} - {match.goalsAgainst}
        </span>
        <span title={style?.label} className="w-5 text-center text-xs font-bold">
          {style?.letter}
        </span>
      </Link>
    </li>
  );
}

/** Fila del listado completo de partidos. */
function MatchRow({ match, division }: { match: Match; division: string }) {
  const style = match.result ? RESULT_STYLES[match.result] : undefined;

  return (
    <li>
      <Link
        to={`/partidos/${match.id}`}
        className="flex items-center gap-3 rounded border border-gray-200 p-3 hover:bg-gray-50"
      >
        <VenueIcon venue={match.venue} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{match.opponent.name}</p>
          <p className="text-xs text-gray-600">
            {formatMatchDateShort(match.date)} · {matchTimeLabel(match)} ·{" "}
            {competitionLabel(match.competition, division)}
          </p>
        </div>
        {match.status === "pending" ? (
          <span className={`rounded px-2 py-0.5 text-xs ${MATCH_STATUS_COLORS.pending}`}>
            {MATCH_STATUS_LABELS.pending}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {match.status === "playing" && (
              <span className={`rounded px-2 py-0.5 text-xs ${MATCH_STATUS_COLORS.playing}`}>
                {MATCH_STATUS_LABELS.playing}
              </span>
            )}
            <span className="font-bold tabular-nums">
              {match.goalsFor} - {match.goalsAgainst}
            </span>
            {style && (
              <span title={style.label} className="w-5 text-center text-xs font-bold">
                {style.letter}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * Pantalla principal de Partidos: botón para programar, último partido,
 * próximo partido, los cinco recientes y el listado completo.
 */
function MatchesPage() {
  const { current } = useCurrentTeam();
  const { data: matches, isPending, isError } = useMatches(current?.team?._id);
  // Desde el dashboard se llega con el formulario de programar ya abierto
  const location = useLocation();
  const [showForm, setShowForm] = useState(
    Boolean((location.state as { openForm?: boolean } | null)?.openForm)
  );

  // RequireTeam garantiza que hay equipo; esto cubre el instante de carga
  if (!current || !current.team || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  const team = current.team;
  const division = current.currentSeason.division;
  const canManage = canManageMatches(current.role);

  const finished = matches ? finishedNewestFirst(matches) : [];
  const last = finished[0];
  const next = matches ? nextMatch(matches) : undefined;
  const recent = finished.slice(0, 5);
  const all = matches ? [...matches].sort(byDateAsc).reverse() : [];

  const programButton = (
    <button onClick={() => setShowForm(true)} className="rounded bg-green-700 px-4 py-2 text-white">
      Programar partido
    </button>
  );

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Partidos</h1>
        {canManage && !showForm && programButton}
      </div>

      {showForm && (
        <div className="mb-6">
          <MatchForm
            teamId={team._id}
            division={current.currentSeason.division}
            defaultFieldName={team.fieldName}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {isPending && <p>Cargando partidos...</p>}
      {isError && <p className="text-red-600">No se han podido cargar los partidos.</p>}

      {matches && (
        <>
          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Último partido</h2>
            {last ? (
              <LastMatchCard match={last} teamName={team.name} division={division} />
            ) : (
              <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                Aún no has jugado ningún partido esta temporada.
              </p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Próximo partido</h2>
            {next ? (
              <NextMatchCard match={next} teamName={team.name} division={division} />
            ) : (
              <div className="rounded border border-dashed border-gray-300 p-4 text-center">
                <p className="text-gray-600">No hay partidos programados</p>
                {canManage && !showForm && <div className="mt-3">{programButton}</div>}
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-lg font-semibold">Partidos recientes</h2>
              <ul className="space-y-2">
                {recent.map((m) => (
                  <RecentRow key={m.id} match={m} />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">Todos los partidos</h2>
            {all.length === 0 ? (
              <p className="text-sm text-gray-600">Todavía no hay partidos esta temporada.</p>
            ) : (
              <ul className="space-y-2">
                {all.map((m) => (
                  <MatchRow key={m.id} match={m} division={division} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default MatchesPage;
