import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteMatch,
  updateMatchScore,
  updateMatchStatus,
  type Match,
  type MatchStatus,
} from "../api/matches";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import {
  COMPETITION_LABELS,
  MATCH_STATUS_COLORS,
  MATCH_STATUS_LABELS,
  RESULT_STYLES,
  VENUE_ICONS,
  VENUE_LABELS,
  canEditCallup,
  canManageMatches,
  canRecordMatch,
  formatMatchDate,
  matchTimeLabel,
} from "../lib/matches";
import CallupPanel from "../components/CallupPanel";
import DefaultBadge from "../components/DefaultBadge";
import MatchForm from "../components/MatchForm";

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
function Scoreboard({ match, teamName, editable, busy, onChange }: ScoreboardProps) {
  const us = { key: "us" as const, name: teamName, goals: match.goalsFor };
  const them = { key: "them" as const, name: match.opponent.name, goals: match.goalsAgainst };
  const [left, right] = match.venue === "away" ? [them, us] : [us, them];

  const started = match.status !== "pending";
  const style = match.result ? RESULT_STYLES[match.result] : undefined;

  const renderSide = (side: typeof us | typeof them) => (
    <div key={side.key} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <DefaultBadge className="h-12 w-12" />
      <span className="max-w-full truncate font-medium">{side.name}</span>
      {started && <span className="text-4xl font-bold tabular-nums">{side.goals ?? 0}</span>}
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
    <section className={`mt-6 rounded border p-4 ${style?.box ?? "border-gray-200"}`}>
      <div className="flex items-start justify-center gap-2 sm:gap-6">
        {renderSide(left)}
        {started && <span className="pt-20 text-2xl text-gray-400">-</span>}
        {renderSide(right)}
      </div>
      {!started && (
        <p className="mt-3 text-center text-sm text-gray-600">El partido aún no ha empezado.</p>
      )}
      {style && <p className="mt-3 text-center text-sm font-semibold">{style.label}</p>}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /** Sustituye un partido en la lista que está en caché, sin esperar a recargarla. */
  const patchMatchInCache = (changes: Partial<Match>) =>
    queryClient.setQueryData<Match[]>(["matches", teamId], (old) =>
      old?.map((m) => (m.id === matchId ? { ...m, ...changes } : m))
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
      updateMatchScore(teamId as string, matchId as string, score.goalsFor, score.goalsAgainst),
    onSuccess: (data) =>
      patchMatchInCache({ goalsFor: data.goalsFor, goalsAgainst: data.goalsAgainst }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMatch(teamId as string, matchId as string),
    onSuccess: () => {
      // Quitamos el partido de la caché antes de volver a la lista
      queryClient.setQueryData<Match[]>(["matches", teamId], (old) =>
        old?.filter((m) => m.id !== matchId)
      );
      navigate("/partidos", { replace: true });
      void queryClient.invalidateQueries({ queryKey: ["matches", teamId] });
    },
  });

  if (!current || isPending) return <p className="p-6">Cargando...</p>;
  if (isError) return <p className="p-6 text-red-600">No se ha podido cargar el partido.</p>;

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
    const goalsAgainst = (match?.goalsAgainst ?? 0) + (side === "them" ? delta : 0);
    if (goalsFor < 0 || goalsAgainst < 0 || goalsFor > 99 || goalsAgainst > 99) return;
    scoreMutation.mutate({ goalsFor, goalsAgainst });
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
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
            {COMPETITION_LABELS[match.competition]} · {formatMatchDate(match.date)} ·{" "}
            {matchTimeLabel(match)}
          </p>
          <p className="text-gray-600">
            <span role="img" aria-label={VENUE_LABELS[match.venue]}>
              {VENUE_ICONS[match.venue]}
            </span>{" "}
            {VENUE_LABELS[match.venue]}
            {place && ` · ${place}`}
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
        <div role="alertdialog" className="mt-4 rounded border border-red-200 bg-red-50 p-4">
          <p className="font-medium">¿Eliminar este partido?</p>
          <p className="mt-1 text-sm text-gray-700">
            Se borrarán también su resultado y su convocatoria. No se puede deshacer.
          </p>
          {deleteMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{deleteMutation.error.message}</p>
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
          <Scoreboard
            match={match}
            teamName={team.name}
            editable={canRecord && match.status === "playing"}
            busy={scoreMutation.isPending}
            onChange={changeScore}
          />
          {scoreMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{scoreMutation.error.message}</p>
          )}

          {/* Cambio de estado: pendiente -> jugando -> finalizado */}
          {canRecord && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {match.status === "pending" && (
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("playing")}
                    className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                  >
                    Empezar partido
                  </button>
                )}
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
                      title={hasGoals ? "Ya hay goles: finaliza el partido" : undefined}
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
                  Para corregir el resultado, reabre el partido, cámbialo y vuelve a finalizarlo.
                </p>
              )}
              {statusMutation.isError && (
                <p className="text-sm text-red-600">{statusMutation.error.message}</p>
              )}
            </div>
          )}

          {match.observations && (
            <section className="mt-6 rounded border border-gray-200 p-4">
              <h2 className="mb-1 text-lg font-semibold">Observaciones</h2>
              <p className="whitespace-pre-wrap text-sm">{match.observations}</p>
            </section>
          )}

          {/* La convocatoria solo llega a los roles que pueden verla */}
          {match.callup && (
            <div className="mt-6">
              <CallupPanel teamId={team._id} match={match} canEdit={canEditCallup(role)} />
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default MatchDetailPage;
