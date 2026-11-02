import { Link } from "react-router-dom";
import type { Match } from "../api/matches";
import {
  MATCH_STATUS_COLORS,
  MATCH_STATUS_LABELS,
  RESULT_STYLES,
  VENUE_ICONS,
  VENUE_LABELS,
  competitionLabel,
  formatMatchDate,
  matchTimeLabel,
  sidesOf,
} from "../lib/matches";
import { todayIso } from "../lib/trainings";
import DefaultBadge from "./DefaultBadge";

// Tarjetas de partido que se usan en la pantalla de Partidos y en el dashboard.

/** Icono de la sede, con su nombre al pasar el ratón y para los lectores de pantalla. */
export function VenueIcon({ venue }: { venue: Match["venue"] }) {
  return (
    <span role="img" title={VENUE_LABELS[venue]} aria-label={VENUE_LABELS[venue]}>
      {VENUE_ICONS[venue]}
    </span>
  );
}

/** Último partido, en modo destacado: color según el resultado, marcador grande y los dos equipos. */
export function LastMatchCard({
  match,
  teamName,
  division,
}: {
  match: Match;
  teamName: string;
  division: string;
}) {
  const style = match.result ? RESULT_STYLES[match.result] : undefined;
  const { left, right } = sidesOf(match, teamName);

  return (
    <Link
      to={`/partidos/${match.id}`}
      className={`block rounded border p-4 ${style?.box ?? "border-gray-200"}`}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-gray-700">
        <span>
          {competitionLabel(match.competition, division)} · {formatMatchDate(match.date)}
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
export function NextMatchCard({
  match,
  teamName,
  division,
}: {
  match: Match;
  teamName: string;
  division: string;
}) {
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
        <span className="text-sm text-gray-600">{competitionLabel(match.competition, division)}</span>
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
