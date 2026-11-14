import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteMatch,
  updateMatchScore,
  updateMatchStatus,
  type Match,
  type MatchEvent,
  type MatchStatus,
} from "../api/matches";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { usePlayers } from "../hooks/usePlayers";
import {
  MATCH_STATUS_COLORS,
  MATCH_STATUS_LABELS,
  RESULT_STYLES,
  VENUE_ICONS,
  VENUE_LABELS,
  canEditCallup,
  canManageMatches,
  canRecordMatch,
  competitionLabel,
  formatMatchDate,
  matchTimeLabel,
} from "../lib/matches";
import { getFieldErrors } from "../api/client";
import { GROUP_COLORS, type Position } from "../lib/positions";
import CallupPanel from "../components/CallupPanel";
import LineupPanel, { FORMATIONS } from "../components/LineupPanel";
import MatchEventsPanel, { EventIcon } from "../components/MatchEventsPanel";
import DefaultBadge from "../components/DefaultBadge";
import MatchForm from "../components/MatchForm";

function MatchSummary({
  match,
  teamName,
  players,
}: {
  match: Match;
  teamName: string;
  players?: Array<{
    id: string;
    name: string;
    surname: string;
    nickname?: string;
    jerseyNumber?: number;
    mainPosition: Position;
  }>;
}) {
  const nameOf = (id?: string) => {
    const player = players?.find((item) => item.id === id);
    return player ? player.nickname || `${player.name} ${player.surname}` : "Jugador";
  };
  const starters = (match.lineup?.players ?? []).filter((player) => player.starter);
  const formation = match.lineup?.formation ?? "4-4-2";
  const playerBySlot = new Map(
    starters
      .filter((starter) => starter.slot)
      .map((starter) => [starter.slot as string, starter]),
  );
  const goalkeeper =
    starters.find((starter) => starter.player === match.lineup?.goalkeeper) ??
    starters.find((starter) => starter.slot === "gk");
  const jerseyOf = (playerId: string, matchJersey?: number) =>
    matchJersey ?? players?.find((player) => player.id === playerId)?.jerseyNumber;
  const playerOf = (playerId: string) => players?.find((player) => player.id === playerId);
  const goals = (match.events ?? [])
    .filter((event) => event.type === "goal")
    .sort((a, b) => a.minute - b.minute);
  const statistics = [
    ["Goles", match.goalsFor ?? 0, match.goalsAgainst ?? 0],
    ["Tiros", "—", "—"],
    ["Tiros a puerta", "—", "—"],
    ["Faltas", "—", "—"],
    ["Córners", "—", "—"],
    ["Fueras de juego", "—", "—"],
  ] as const;

  const sideName = (event: MatchEvent) =>
    event.side === "for" ? teamName : match.opponent.name;
  const isGoalOnRight = (event: MatchEvent) =>
    match.venue === "away" ? event.side === "for" : event.side !== "for";
  const goalDescription = (event: MatchEvent) =>
    event.ownGoal
      ? "Gol en propia meta"
      : event.side === "against"
        ? "Gol rival"
        : event.penalty
          ? "Gol de penalti"
          : "Gol";
  const goalActor = (event: MatchEvent) =>
    event.player && (event.side === "for" || event.ownGoal)
      ? nameOf(event.player)
      : sideName(event);

  return (
    <section className="mt-6 space-y-4" aria-label="Resumen del partido">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">11 inicial</h2>
          {starters.length > 0 ? (
            <div
              className="relative mt-3 overflow-hidden rounded-lg border-4 border-green-800 bg-green-600 px-3 py-4"
              aria-label={`Alineación inicial${match.lineup?.formation ? ` en ${match.lineup.formation}` : ""}`}
            >
              <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-white/80" />
              <div className="pointer-events-none absolute -bottom-14 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full border-2 border-white/70" />
              <div className="pointer-events-none absolute inset-x-[14%] top-0 h-28 border-x-2 border-b-2 border-white/60" />
              <div className="pointer-events-none absolute inset-x-[30%] top-0 h-12 border-x-2 border-b-2 border-white/60" />
              <div className="relative z-10 flex min-h-[22rem] flex-col justify-between gap-5 py-2 pb-5">
                <div className="flex justify-center">
                  {goalkeeper && (
                    <div
                      className="flex min-w-0 max-w-[5rem] flex-col items-center text-center text-xs text-white"
                      title={nameOf(goalkeeper.player)}
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white font-bold shadow ${GROUP_COLORS.portero}`}>
                        {jerseyOf(goalkeeper.player, goalkeeper.jerseyNumber) ?? "—"}
                      </span>
                      <span className="mt-1 truncate font-bold">{nameOf(goalkeeper.player)}</span>
                    </div>
                  )}
                </div>
                {FORMATIONS[formation].map((rowSlots) => (
                  <div
                    key={rowSlots.map((slot) => slot.id).join("-")}
                    className="grid items-start gap-1"
                    style={{ gridTemplateColumns: `repeat(${rowSlots.length}, minmax(0, 1fr))` }}
                  >
                    {rowSlots.map((slot) => {
                      const starter = playerBySlot.get(slot.id);
                      return (
                        <div key={slot.id} className="flex min-h-[3.75rem] justify-center">
                          {starter && (
                            <div
                              className="flex min-w-0 max-w-[5rem] flex-col items-center text-center text-xs text-white"
                              title={nameOf(starter.player)}
                            >
                              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white font-bold shadow ${GROUP_COLORS[slot.group]}`}>
                                {jerseyOf(starter.player, starter.jerseyNumber) ?? "—"}
                              </span>
                              <span className="mt-1 truncate font-bold">{nameOf(starter.player)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Aún no hay alineación registrada.</p>
          )}
        </section>

        <section className="rounded border border-gray-200 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Goles</h2>
            <span className="text-sm text-gray-500">{goals.length} registrados</span>
          </div>
          {goals.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100 rounded border border-gray-200">
              {goals.map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-[minmax(0,1fr)_4rem_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-sm"
                >
                  <span
                    className={`row-start-1 flex min-w-0 items-center gap-2 ${
                      isGoalOnRight(event)
                        ? "col-start-3 justify-start text-left"
                        : "col-start-1 justify-end text-right"
                    }`}
                  >
                    {isGoalOnRight(event) ? (
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {goalActor(event)}
                        </span>
                        <span className="block truncate text-xs text-gray-600">
                          {goalDescription(event)}
                        </span>
                      </span>
                    ) : (
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">
                          {goalActor(event)}
                        </span>
                        <span className="block truncate text-xs text-gray-600">
                          {goalDescription(event)}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="col-start-2 row-start-1 flex flex-col items-center justify-center gap-0.5 text-gray-500">
                    <EventIcon
                      kind={event.ownGoal ? "ownGoal" : event.penalty ? "penalty" : "goal"}
                    />
                    <span className="font-semibold tabular-nums">{event.minute}'</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Todavía no hay goles registrados.</p>
          )}
        </section>
      </div>

      <section className="rounded border border-gray-200 p-4">
        <h2 className="text-lg font-semibold">Estadísticas del partido</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead className="border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Estadística</th>
                <th className="px-3 py-2 text-center font-medium">{teamName}</th>
                <th className="px-3 py-2 text-center font-medium">{match.opponent.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statistics.map(([label, ours, theirs]) => (
                <tr key={label}>
                  <th className="px-3 py-2 text-left font-normal text-gray-700">{label}</th>
                  <td className="px-3 py-2 text-center font-semibold tabular-nums">{ours}</td>
                  <td className="px-3 py-2 text-center font-semibold tabular-nums">{theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Las estadísticas detalladas se podrán registrar más adelante.
        </p>
      </section>
    </section>
  );
}

interface ScoreboardProps {
  match: Match;
  teamName: string;
  // true si se puede cambiar el resultado (partido en juego y rol con permiso)
  editable: boolean;
  busy: boolean;
  onChange: (side: "us" | "them", delta: number) => void;
}

/**
 * Marcador del partido: los dos equipos en el orden en que se anuncian
 * (fuera va primero el rival) y, si se puede editar, botones para sumar o
 * quitar un gol a cada lado. Con el partido finalizado se colorea según el
 * resultado.
 */
function Scoreboard({
  match,
  teamName,
  editable,
  busy,
  onChange,
}: ScoreboardProps) {
  const us = { key: "us" as const, name: teamName, goals: match.goalsFor };
  const them = {
    key: "them" as const,
    name: match.opponent.name,
    goals: match.goalsAgainst,
  };
  const [left, right] = match.venue === "away" ? [them, us] : [us, them];

  const started = match.status !== "pending";
  const style = match.result ? RESULT_STYLES[match.result] : undefined;

  const renderSide = (side: typeof us | typeof them) => (
    <div
      key={side.key}
      className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
    >
      <DefaultBadge className="h-12 w-12" />
      <span className="max-w-full truncate font-medium">{side.name}</span>
      {started && (
        <span className="text-4xl font-bold tabular-nums">
          {side.goals ?? 0}
        </span>
      )}
      {editable && (
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            disabled={busy || (side.goals ?? 0) <= 0}
            aria-label={`Quitar un gol a ${side.name}`}
            onClick={() => onChange(side.key, -1)}
            className="h-10 w-10 rounded border border-gray-300 text-xl disabled:opacity-40"
          >
            −
          </button>
          <button
            type="button"
            disabled={busy || (side.goals ?? 0) >= 99}
            aria-label={`Añadir un gol a ${side.name}`}
            onClick={() => onChange(side.key, 1)}
            className="h-10 w-10 rounded bg-green-700 text-xl text-white disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  return (
    <section
      className={`mt-6 rounded border p-4 ${style?.box ?? "border-gray-200"}`}
    >
      <div className="flex items-start justify-center gap-2 sm:gap-6">
        {renderSide(left)}
        {started && <span className="pt-20 text-2xl text-gray-400">-</span>}
        {renderSide(right)}
      </div>
      {!started && (
        <p className="mt-3 text-center text-sm text-gray-600">
          El partido aún no ha empezado.
        </p>
      )}
      {style && (
        <p className="mt-3 text-center text-sm font-semibold">{style.label}</p>
      )}
    </section>
  );
}

/**
 * Ficha de un partido: datos, marcador (que se edita en directo mientras se
 * juega), botones para cambiar el estado, convocatoria y, para quien puede,
 * editar y eliminar. Los datos se sacan de la lista de partidos ya cargada.
 */
function MatchDetailPage() {
  const { matchId } = useParams();
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const { data: matches, isPending, isError } = useMatches(teamId);
  const { data: players } = usePlayers(teamId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "summary" | "events" | "callup" | "lineup"
  >("summary");

  /** Sustituye un partido en la lista que está en caché, sin esperar a recargarla. */
  const patchMatchInCache = (changes: Partial<Match>) =>
    queryClient.setQueryData<Match[]>(["matches", teamId], (old) =>
      old?.map((m) => (m.id === matchId ? { ...m, ...changes } : m)),
    );

  const statusMutation = useMutation({
    mutationFn: (status: MatchStatus) =>
      updateMatchStatus(teamId as string, matchId as string, status),
    onSuccess: (data) =>
      patchMatchInCache({
        status: data.status,
        goalsFor: data.goalsFor,
        goalsAgainst: data.goalsAgainst,
        result: data.result,
      }),
  });

  const scoreMutation = useMutation({
    mutationFn: (score: { goalsFor: number; goalsAgainst: number }) =>
      updateMatchScore(
        teamId as string,
        matchId as string,
        score.goalsFor,
        score.goalsAgainst,
      ),
    onSuccess: (data) =>
      patchMatchInCache({
        goalsFor: data.goalsFor,
        goalsAgainst: data.goalsAgainst,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMatch(teamId as string, matchId as string),
    onSuccess: () => {
      // Quitamos el partido de la caché antes de volver a la lista
      queryClient.setQueryData<Match[]>(["matches", teamId], (old) =>
        old?.filter((m) => m.id !== matchId),
      );
      navigate("/partidos", { replace: true });
      void queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
    },
  });

  if (!current || isPending) return <p className="p-6">Cargando...</p>;
  if (isError)
    return (
      <p className="p-6 text-red-600">No se ha podido cargar el partido.</p>
    );

  const match = matches?.find((m) => m.id === matchId);
  if (!match || !current.team || !current.currentSeason) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p>Partido no encontrado.</p>
        <Link to="/partidos" className="text-green-700 underline">
          Volver a los partidos
        </Link>
      </main>
    );
  }

  const team = current.team;
  const role = current.role;
  const canManage = canManageMatches(role);
  const canRecord = canRecordMatch(role);
  const place = [match.fieldName, match.city].filter(Boolean).join(", ");
  const hasGoals = Boolean(match.goalsFor) || Boolean(match.goalsAgainst);

  /** Suma o resta un gol a un lado, respetando el rango de 0 a 99. */
  function changeScore(side: "us" | "them", delta: number) {
    const goalsFor = (match?.goalsFor ?? 0) + (side === "us" ? delta : 0);
    const goalsAgainst =
      (match?.goalsAgainst ?? 0) + (side === "them" ? delta : 0);
    if (goalsFor < 0 || goalsAgainst < 0 || goalsFor > 99 || goalsAgainst > 99)
      return;
    scoreMutation.mutate({ goalsFor, goalsAgainst });
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:px-6">
      <Link to="/partidos" className="text-sm text-gray-600 hover:underline">
        ← Partidos
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {match.venue === "away"
              ? `${match.opponent.name} - ${team.name}`
              : `${team.name} - ${match.opponent.name}`}
          </h1>
          <p className="mt-1 text-gray-700">
            {competitionLabel(
              match.competition,
              current.currentSeason.division,
            )}{" "}
            · {formatMatchDate(match.date)} · {matchTimeLabel(match)}
          </p>
          <p className="text-gray-600">
            <span role="img" aria-label={VENUE_LABELS[match.venue]}>
              {VENUE_ICONS[match.venue]}
            </span>{" "}
            {VENUE_LABELS[match.venue]}
            {place && ` · ${place}`}
            {` · ${match.durationMinutes} min`}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${MATCH_STATUS_COLORS[match.status]}`}
          >
            {MATCH_STATUS_LABELS[match.status]}
          </span>
        </div>

        {canManage && !editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
            >
              Eliminar
            </button>
          </div>
        )}
      </header>

      {/* Confirmación antes de eliminar: la acción no se puede deshacer */}
      {confirmingDelete && !editing && (
        <div
          role="alertdialog"
          className="mt-4 rounded border border-red-200 bg-red-50 p-4"
        >
          <p className="font-medium">¿Eliminar este partido?</p>
          <p className="mt-1 text-sm text-gray-700">
            Se borrarán también su resultado y su convocatoria. No se puede
            deshacer.
          </p>
          {deleteMutation.isError && (
            <p className="mt-2 text-sm text-red-600">
              {deleteMutation.error.message}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="rounded bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="mt-6">
          <MatchForm
            teamId={team._id}
            division={current.currentSeason.division}
            defaultFieldName={team.fieldName}
            match={match}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6">
            <div className="space-y-6">
              <div className="mx-auto w-full max-w-4xl">
                <Scoreboard
                  match={match}
                  teamName={team.name}
                  editable={canRecord && match.status === "playing"}
                  busy={scoreMutation.isPending}
                  onChange={changeScore}
                />
                {scoreMutation.isError && (
                  <p className="mt-2 text-sm text-red-600">
                    {scoreMutation.error.message}
                  </p>
                )}
              </div>

              <div className="border-b border-gray-200">
                <nav
                  className="flex flex-wrap gap-1"
                  aria-label="Secciones del partido"
                >
                  {(
                    [
                      ["summary", "Resumen"],
                      ["events", "Eventos"],
                      ["callup", "Convocatoria"],
                      ["lineup", "Alineación"],
                    ] as const
                  ).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab ? "border-green-700 text-green-700" : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"}`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>

              {activeTab === "summary" && (
                <>
                  <MatchSummary
                    match={match}
                    teamName={team.name}
                    players={players}
                  />

                  {/* Cambio de estado: pendiente -> jugando -> finalizado */}
                  {canRecord && (
                    <div className="mt-4 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {match.status === "playing" && (
                          <>
                            <button
                              type="button"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate("finished")}
                              className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                            >
                              Finalizar partido
                            </button>
                            <button
                              type="button"
                              disabled={statusMutation.isPending || hasGoals}
                              title={
                                hasGoals
                                  ? "Ya hay goles: finaliza el partido"
                                  : undefined
                              }
                              onClick={() => statusMutation.mutate("pending")}
                              className="rounded border border-gray-300 px-4 py-2 disabled:opacity-50"
                            >
                              Volver a pendiente
                            </button>
                          </>
                        )}
                        {match.status === "finished" && (
                          <button
                            type="button"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate("playing")}
                            className="rounded border border-gray-300 px-4 py-2 disabled:opacity-50"
                          >
                            Reabrir partido
                          </button>
                        )}
                      </div>
                      {match.status === "finished" && (
                        <p className="text-xs text-gray-500">
                          Para corregir el resultado, reabre el partido,
                          cámbialo y vuelve a finalizarlo.
                        </p>
                      )}
                      {statusMutation.isError && match.status !== "pending" && (
                        <div className="text-sm text-red-600">
                          <p>{statusMutation.error.message}</p>
                          {/* Al intentar empezar sin alineación completa, se enseña lo que falta */}
                          <ul className="mt-1 list-inside list-disc">
                            {getFieldErrors(statusMutation.error).lineup?.map(
                              (problem) => (
                                <li key={problem}>{problem}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === "summary" && match.observations && (
                <section className="mt-6 rounded border border-gray-200 p-4">
                  <h2 className="mb-1 text-lg font-semibold">Observaciones</h2>
                  <p className="whitespace-pre-wrap text-sm">
                    {match.observations}
                  </p>
                </section>
              )}

              {activeTab === "events" &&
                (match.events ||
                  match.status === "playing" ||
                  match.status === "finished") && (
                  <MatchEventsPanel
                    teamId={team._id}
                    match={match}
                    canEdit={canRecord}
                  />
                )}
            </div>

            <div className="space-y-6">
              {/* La convocatoria solo llega a los roles que pueden verla */}
              {activeTab === "callup" && match.callup && (
                <div className="mt-6">
                  <CallupPanel
                    teamId={team._id}
                    match={match}
                    canEdit={canEditCallup(role)}
                  />
                </div>
              )}

              {/* La alineación se hace con los convocados. La key reinicia el panel cuando cambia la convocatoria */}
              {activeTab === "lineup" && match.lineup && match.callup && (
                <div className="mt-6">
                  <LineupPanel
                    key={match.callup.join(",")}
                    teamId={team._id}
                    match={match}
                    canEdit={canEditCallup(role)}
                  />
                </div>
              )}

              {activeTab === "summary" &&
                match.status === "pending" &&
                canRecord && (
                  <div className="mt-6 space-y-2">
                    <button
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate("playing")}
                      className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                    >
                      Empezar partido
                    </button>
                    {statusMutation.isError && (
                      <div className="text-sm text-red-600">
                        <p>{statusMutation.error.message}</p>
                        <ul className="mt-1 list-inside list-disc">
                          {getFieldErrors(statusMutation.error).lineup?.map(
                            (problem) => (
                              <li key={problem}>{problem}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default MatchDetailPage;
