import { useState } from "react";
import { Link } from "react-router-dom";
import type { Match } from "../api/matches";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { todayIso } from "../lib/trainings";
import {
  COMPETITION_LABELS,
  MATCH_STATUS_COLORS,
  MATCH_STATUS_LABELS,
  RESULT_STYLES,
  VENUE_ICONS,
  VENUE_LABELS,
  byDateAsc,
  canManageMatches,
  finishedNewestFirst,
  formatMatchDate,
  formatMatchDateShort,
  matchTimeLabel,
  nextMatch,
  sidesOf,
} from "../lib/matches";
import DefaultBadge from "../components/DefaultBadge";
import MatchForm from "../components/MatchForm";

/** Icono de la sede, con su nombre al pasar el ratón y para los lectores de pantalla. */
function VenueIcon({ venue }: { venue: Match["venue"] }) {
  return (
    <span role="img" title={VENUE_LABELS[venue]} aria-label={VENUE_LABELS[venue]}>
      {VENUE_ICONS[venue]}
    </span>
  );
}

/** Último partido, en modo destacado: color según el resultado, marcador grande y los dos equipos. */
function LastMatchCard({ match, teamName }: { match: Match; teamName: string }) {
  const style = match.result ? RESULT_STYLES[match.result] : undefined;
  const { left, right } = sidesOf(match, teamName);

  return (
    <Link
      to={`/partidos/${match.id}`}
      className={`block rounded border p-4 ${style?.box ?? "border-gray-200"}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-gray-700">
        <span>
          {COMPETITION_LABELS[match.competition]} · {formatMatchDate(match.date)}
        </span>
        <span className="flex items-center gap-1">
          <VenueIcon venue={match.venue} />
          {style && <strong>{style.label}</strong>}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <DefaultBadge className="h-10 w-10" />
          <span className="max-w-full truncate font-medium">{left.name}</span>
        </div>
        <span className="text-3xl font-bold tabular-nums sm:text-4xl">
          {left.goals} - {right.goals}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
          <DefaultBadge className="h-10 w-10" />
          <span className="max-w-full truncate font-medium">{right.name}</span>
        </div>
      </div>
    </Link>
  );
}

/** Próximo partido (o el que se está jugando): fecha, hora, sede y convocatoria. */
function NextMatchCard({ match, teamName }: { match: Match; teamName: string }) {
  const playing = match.status === "playing";
  const overdue = match.status === "pending" && match.date.slice(0, 10) < todayIso();
  const { left, right } = sidesOf(match, teamName);
  const place = [match.fieldName, match.city].filter(Boolean).join(", ");

  return (
    <Link
      to={`/partidos/${match.id}`}
      className="block rounded border border-gray-200 p-4 hover:bg-gray-50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-600">{COMPETITION_LABELS[match.competition]}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${MATCH_STATUS_COLORS[match.status]}`}>
          {playing ? "En juego" : MATCH_STATUS_LABELS[match.status]}
        </span>
      </div>
      <p className="mt-2 text-lg font-semibold">
        {left.name} {playing ? `${left.goals} - ${right.goals}` : "vs"} {right.name}
      </p>
      <p className="mt-1 text-sm text-gray-700">
        {formatMatchDate(match.date)} · {matchTimeLabel(match)}
      </p>
      <p className="text-sm text-gray-600">
        <VenueIcon venue={match.venue} /> {VENUE_LABELS[match.venue]}
        {place && ` · ${place}`}
      </p>
      {overdue && (
        <p className="mt-2 text-sm text-amber-700">
          La fecha ya ha pasado: actualiza el estado del partido.
        </p>
      )}
      {match.callup && (
        <p className="mt-2 text-sm text-gray-600">
          Convocados: {match.callup.length}
          {match.maxCallup !== null && ` de ${match.maxCallup}`}
        </p>
      )}
    </Link>
  );
}

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
function MatchRow({ match }: { match: Match }) {
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
            {COMPETITION_LABELS[match.competition]}
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
  const [showForm, setShowForm] = useState(false);

  // RequireTeam garantiza que hay equipo; esto cubre el instante de carga
  if (!current || !current.team || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  const team = current.team;
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
              <LastMatchCard match={last} teamName={team.name} />
            ) : (
              <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                Aún no has jugado ningún partido esta temporada.
              </p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-lg font-semibold">Próximo partido</h2>
            {next ? (
              <NextMatchCard match={next} teamName={team.name} />
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
                  <MatchRow key={m.id} match={m} />
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
