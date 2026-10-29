import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteTraining,
  saveAttendance,
  updateTrainingStatus,
  type AttendanceStatus,
  type TrainingDetail,
} from "../api/trainings";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useTraining } from "../hooks/useTrainings";
import {
  ATTENDANCE_OPTIONS,
  TRAINING_STATUS_COLORS,
  TRAINING_STATUS_LABELS,
  canManageTrainings,
  formatTrainingDate,
  formatTrainingTime,
} from "../lib/trainings";
import StatusIcon from "../components/StatusIcon";
import TrainingForm from "../components/TrainingForm";

interface AttendanceListProps {
  teamId: string;
  training: TrainingDetail;
  canManage: boolean;
}

/**
 * Lista de asistencia de un entreno: una fila por jugador con tres botones
 * (asiste, justificada, sin justificar).
 *
 * Al pasar lista por primera vez hay que marcar a todos antes de guardar,
 * para que nadie se quede sin registro y su porcentaje salga falseado. En un
 * entreno ya celebrado se puede guardar con jugadores sin marcar, porque
 * pueden ser jugadores que llegaron después.
 */
function AttendanceList({ teamId, training, canManage }: AttendanceListProps) {
  const players = training.players ?? [];
  const queryClient = useQueryClient();
  const wasHeld = training.status === "held";

  // Marca de cada jugador, por su identificador. null = sin marcar.
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.attendance]))
  );
  const [saved, setSaved] = useState(false);

  const markedCount = players.filter((p) => marks[p.id]).length;
  const allMarked = markedCount === players.length;
  // Hay cambios sin guardar si alguna marca difiere de la que tiene el servidor
  const dirty = players.some((p) => (marks[p.id] ?? null) !== p.attendance);
  const canSave = canManage && dirty && markedCount > 0 && (wasHeld || allMarked);

  // Recuento en directo, a medida que se marca
  const count = (status: AttendanceStatus) =>
    players.filter((p) => marks[p.id] === status).length;

  const mutation = useMutation({
    mutationFn: () =>
      saveAttendance(
        teamId,
        training.id,
        players
          .filter((p) => marks[p.id])
          .map((p) => ({ player: p.id, status: marks[p.id] as AttendanceStatus }))
      ),
    onSuccess: async () => {
      setSaved(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trainings", teamId] }),
        queryClient.invalidateQueries({ queryKey: ["training", teamId, training.id] }),
      ]);
    },
  });

  function setMark(playerId: string, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [playerId]: status }));
    setSaved(false);
  }

  /** Marca como "Asiste" solo a los que aún no tienen marca, sin pisar las demás. */
  function markPendingAsPresent() {
    setMarks((prev) =>
      Object.fromEntries(
        players.map((p) => [p.id, prev[p.id] ?? ("present" as AttendanceStatus)])
      )
    );
    setSaved(false);
  }

  if (players.length === 0) {
    return (
      <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
        No hay jugadores en la plantilla.
      </p>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Asistencia</h2>
      <p className="mb-3 text-sm text-gray-600">
        {count("present")} asisten · {count("justified_absence")} justificadas ·{" "}
        {count("unjustified_absence")} sin justificar · {players.length - markedCount} sin marcar
      </p>

      {canManage && markedCount < players.length && (
        <button
          type="button"
          onClick={markPendingAsPresent}
          className="mb-3 rounded border border-green-700 px-3 py-2 text-sm text-green-800"
        >
          Marcar pendientes como Asiste
        </button>
      )}

      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id} className="rounded border border-gray-200 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold">
                {p.jerseyNumber ?? "–"}
              </span>
              <span className="min-w-0 truncate font-medium">
                {p.nickname || `${p.name} ${p.surname}`}
              </span>
              <StatusIcon status={p.playerStatus} />
            </div>

            {/* Sugerencia, nunca se aplica sola: decide siempre el entrenador */}
            {p.playerStatus === "injured" && !marks[p.id] && (
              <p className="mt-1 text-xs text-orange-700">Lesionado: ¿ausencia justificada?</p>
            )}

            <div className="mt-2 grid grid-cols-3 gap-2">
              {ATTENDANCE_OPTIONS.map((option) => {
                const selected = marks[p.id] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!canManage}
                    aria-pressed={selected}
                    onClick={() => setMark(p.id, option.value)}
                    className={`rounded border px-2 py-2 text-xs disabled:opacity-60 sm:text-sm ${
                      selected ? option.activeClass : option.idleClass
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="mt-4 space-y-2">
          {!wasHeld && !allMarked && (
            <p className="text-sm text-gray-600">
              Marca a todos los jugadores para poder guardar la lista ({markedCount} de{" "}
              {players.length}).
            </p>
          )}
          {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}
          {saved && <p className="text-sm text-green-700">Lista guardada.</p>}
          <button
            type="button"
            disabled={!canSave || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full rounded bg-green-700 px-4 py-3 text-white disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Guardar lista"}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Pantalla de un entreno: datos, objetivos, y la lista de asistencia donde
 * se pasa lista. Desde aquí también se edita, se suspende o se borra.
 */
function TrainingDetailPage() {
  const { trainingId } = useParams();
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const { data: training, isPending, isError } = useTraining(teamId, trainingId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (status: "scheduled" | "cancelled") =>
      updateTrainingStatus(teamId as string, trainingId as string, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trainings", teamId] }),
        queryClient.invalidateQueries({ queryKey: ["training", teamId, trainingId] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTraining(teamId as string, trainingId as string),
    onSuccess: () => {
      // Quitamos el detalle de la caché y volvemos a la lista
      queryClient.removeQueries({ queryKey: ["training", teamId, trainingId] });
      navigate("/entrenos", { replace: true });
      void queryClient.invalidateQueries({ queryKey: ["trainings", teamId] });
    },
  });

  if (!current || isPending) return <p className="p-6">Cargando...</p>;
  if (isError || !training) {
    return (
      <main className="mx-auto max-w-5xl p-4">
        <p>Entreno no encontrado.</p>
        <Link to="/entrenos" className="text-green-700 underline">
          Volver a los entrenos
        </Link>
      </main>
    );
  }

  const canManage = canManageTrainings(current.role);
  const time = formatTrainingTime(training);
  const cancelled = training.status === "cancelled";

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Link to="/entrenos" className="text-sm text-gray-600 hover:underline">
        ← Entrenos
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{formatTrainingDate(training.date)}</h1>
          {(time || training.location) && (
            <p className="mt-1 text-gray-600">
              {[time, training.location].filter(Boolean).join(" · ")}
            </p>
          )}
          <span
            className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${TRAINING_STATUS_COLORS[training.status]}`}
          >
            {TRAINING_STATUS_LABELS[training.status]}
          </span>
        </div>

        {canManage && !editing && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              Editar
            </button>
            <button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(cancelled ? "scheduled" : "cancelled")}
              className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              {cancelled ? "Volver a programar" : "Suspender"}
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
      {statusMutation.isError && (
        <p className="mt-2 text-sm text-red-600">{statusMutation.error.message}</p>
      )}

      {/* Confirmación antes de eliminar: la acción no se puede deshacer */}
      {confirmingDelete && !editing && (
        <div role="alertdialog" className="mt-4 rounded border border-red-200 bg-red-50 p-4">
          <p className="font-medium">¿Eliminar este entreno?</p>
          <p className="mt-1 text-sm text-gray-700">
            Se borrará también la asistencia registrada. No se puede deshacer. Si solo se ha
            suspendido, usa "Suspender", que conserva el entreno.
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
          <TrainingForm
            teamId={current.team!._id}
            defaultLocation={current.team!.fieldName}
            training={training}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {training.objectives && (
            <section className="mt-6 rounded border border-gray-200 p-4">
              <h2 className="mb-1 text-lg font-semibold">Objetivos</h2>
              <p className="whitespace-pre-wrap text-sm">{training.objectives}</p>
            </section>
          )}

          <div className="mt-6">
            {cancelled ? (
              <p className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                Entreno suspendido: no se pasa lista y no cuenta para la asistencia de nadie.
              </p>
            ) : training.players ? (
              <AttendanceList teamId={current.team!._id} training={training} canManage={canManage} />
            ) : (
              <p className="text-sm text-gray-600">Tu rol no puede ver la asistencia.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}

export default TrainingDetailPage;
