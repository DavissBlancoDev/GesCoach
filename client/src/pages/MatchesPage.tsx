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
import {
  LastMatchCard,
  NextMatchCard,
  VenueIcon,
} from "../components/MatchCards";
import MatchForm from "../components/MatchForm";
import { leaguePoints, matchRecord } from "../lib/dashboard";

type MatchTab = "all" | "upcoming" | "played" | "home" | "away";

const MATCH_TABS: { value: MatchTab; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "upcoming", label: "Por jugar" },
  { value: "played", label: "Jugados" },
  { value: "home", label: "En casa" },
  { value: "away", label: "Fuera" },
];

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
        <span className="min-w-0 flex-1 truncate font-medium">
          {match.opponent.name}
        </span>
        <span className="font-bold tabular-nums">
          {match.goalsFor} - {match.goalsAgainst}
        </span>
        <span
          title={style?.label}
          className="w-5 text-center text-xs font-bold"
        >
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
          <span
            className={`rounded px-2 py-0.5 text-xs ${MATCH_STATUS_COLORS.pending}`}
          >
            {MATCH_STATUS_LABELS.pending}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {match.status === "playing" && (
              <span
                className={`rounded px-2 py-0.5 text-xs ${MATCH_STATUS_COLORS.playing}`}
              >
                {MATCH_STATUS_LABELS.playing}
              </span>
            )}
            <span className="font-bold tabular-nums">
              {match.goalsFor} - {match.goalsAgainst}
            </span>
            {style && (
              <span
                title={style.label}
                className="w-5 text-center text-xs font-bold"
              >
                {style.letter}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}

function ResultBar({
  record,
}: {
  record: { wins: number; draws: number; losses: number; played: number };
}) {
  if (record.played === 0) return null;

  return (
    <div
      role="img"
      aria-label={`${record.wins} victorias, ${record.draws} empates y ${record.losses} derrotas`}
      className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-100"
    >
      <span
        className="bg-green-500"
        style={{ flexGrow: record.wins, flexBasis: 0 }}
        title="Victorias"
      />
      <span
        className="bg-amber-400"
        style={{ flexGrow: record.draws, flexBasis: 0 }}
        title="Empates"
      />
      <span
        className="bg-red-500"
        style={{ flexGrow: record.losses, flexBasis: 0 }}
        title="Derrotas"
      />
    </div>
  );
}

function LeagueSummary({ matches }: { matches: Match[] }) {
  const [scope, setScope] = useState<"all" | "league">("all");
  const finished = matches.filter((match) => match.status === "finished");
  const record = matchRecord(
    scope === "league"
      ? finished.filter((match) => match.competition === "league")
      : finished,
  );
  const points = leaguePoints(matches);
  const winRate = record.played > 0 ? (record.wins / record.played) * 100 : 0;

  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Temporada</h2>
        <div
          className="flex gap-1 border-b border-gray-200"
          role="tablist"
          aria-label="Resumen de temporada"
        >
          {(["all", "league"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={scope === value}
              onClick={() => setScope(value)}
              className={`px-2 py-1 text-xs font-medium ${scope === value ? "border-b-2 border-green-700 text-green-800" : "text-gray-500 hover:text-gray-800"}`}
            >
              {value === "all" ? "Todos" : "Liga"}
            </button>
          ))}
        </div>
      </div>

      {scope === "all" ? (
        record.played === 0 ? (
          <p className="text-sm text-gray-600">
            Todavía no hay partidos jugados.
          </p>
        ) : (
          <>
            <p>
              <span className="text-4xl font-bold tabular-nums">
                {winRate.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
              </span>{" "}
              <span className="text-lg text-gray-600">tasa de victoria</span>
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-green-50 p-2">
                <p className="text-xl font-bold text-green-800">
                  {record.wins}
                </p>
                <p className="text-xs text-gray-600">V</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2">
                <p className="text-xl font-bold text-amber-800">
                  {record.draws}
                </p>
                <p className="text-xs text-gray-600">E</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
                <p className="text-xl font-bold text-red-800">
                  {record.losses}
                </p>
                <p className="text-xs text-gray-600">D</p>
              </div>
            </div>
            <ResultBar record={record} />
          </>
        )
      ) : points.played === 0 ? (
        <p className="text-sm text-gray-600">
          Todavía no hay partidos de liga jugados.
        </p>
      ) : (
        <>
          <p>
            <span className="text-4xl font-bold tabular-nums">
              {points.points}
            </span>{" "}
            <span className="text-lg text-gray-600">
              puntos de {points.maxPoints}
            </span>
          </p>
          <p className="mt-1 text-base font-semibold text-gray-700">
            {(points.points / points.played).toLocaleString("es-ES", {
              maximumFractionDigits: 2,
            })}{" "}
            puntos por partido
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-green-50 p-2">
              <p className="text-xl font-bold text-green-800">{record.wins}</p>
              <p className="text-xs text-gray-600">V</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2">
              <p className="text-xl font-bold text-amber-800">{record.draws}</p>
              <p className="text-xs text-gray-600">E</p>
            </div>
            <div className="rounded-lg bg-red-50 p-2">
              <p className="text-xl font-bold text-red-800">{record.losses}</p>
              <p className="text-xs text-gray-600">D</p>
            </div>
          </div>
          <ResultBar record={record} />
        </>
      )}
    </section>
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
    Boolean((location.state as { openForm?: boolean } | null)?.openForm),
  );
  const [activeTab, setActiveTab] = useState<MatchTab>("all");

  // RequireTeam garantiza que hay equipo; esto cubre el instante de carga
  if (!current || !current.team || !current.currentSeason)
    return <p className="p-6">Cargando...</p>;

  const team = current.team;
  const division = current.currentSeason.division;
  const canManage = canManageMatches(current.role);

  const finished = matches ? finishedNewestFirst(matches) : [];
  const last = finished[0];
  const next = matches ? nextMatch(matches) : undefined;
  const recent = finished.slice(0, 5);
  const all = matches ? [...matches].sort(byDateAsc).reverse() : [];
  const filteredMatches = all.filter((match) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming")
      return match.status === "pending" || match.status === "playing";
    if (activeTab === "played") return match.status === "finished";
    return match.venue === activeTab;
  });

  const programButton = (
    <button
      onClick={() => setShowForm(true)}
      className="rounded bg-green-700 px-4 py-2 text-white"
    >
      Programar partido
    </button>
  );

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-6 lg:px-8">
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
      {isError && (
        <p className="text-red-600">No se han podido cargar los partidos.</p>
      )}

      {matches && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">Último partido</h2>
            {last ? (
              <LastMatchCard
                match={last}
                teamName={team.name}
                division={division}
              />
            ) : (
              <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                Aún no has jugado ningún partido esta temporada.
              </p>
            )}
          </section>

          <section className="rounded border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-lg font-semibold">Próximo partido</h2>
            {next ? (
              <NextMatchCard
                match={next}
                teamName={team.name}
                division={division}
              />
            ) : (
              <div className="rounded border border-dashed border-gray-300 p-4 text-center">
                <p className="text-gray-600">No hay partidos programados</p>
                {canManage && !showForm && (
                  <div className="mt-3">{programButton}</div>
                )}
              </div>
            )}
          </section>

          <section className="lg:col-start-3 lg:row-start-2 rounded border border-gray-200 bg-white p-4">
            {recent.length > 0 ? (
              <>
                <h2 className="mb-2 text-lg font-semibold">
                  Partidos recientes
                </h2>
                <ul className="space-y-2">
                  {recent.map((m) => (
                    <RecentRow key={m.id} match={m} />
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-lg font-semibold">
                  Partidos recientes
                </h2>
                <p className="text-sm text-gray-600">
                  Todavía no hay partidos recientes.
                </p>
              </>
            )}
          </section>

          <section className="lg:col-span-2 rounded border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Todos los partidos</h2>
            <div
              className="mb-4 flex flex-wrap justify-end gap-1 border-b border-gray-200 pb-2"
              role="tablist"
              aria-label="Filtrar partidos"
            >
              {MATCH_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.value
                      ? "bg-white text-green-800 shadow-sm"
                      : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {filteredMatches.length === 0 ? (
              <p className="text-sm text-gray-600">
                No hay partidos en esta categoría.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredMatches.map((m) => (
                  <MatchRow key={m.id} match={m} division={division} />
                ))}
              </ul>
            )}
          </section>

          <div className="lg:col-start-3 lg:row-start-1">
            <LeagueSummary matches={finished} />
          </div>
        </div>
      )}
    </main>
  );
}

export default MatchesPage;
