import { useState } from "react";
import { Link } from "react-router-dom";
import type { Training } from "../api/trainings";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useTrainings } from "../hooks/useTrainings";
import {
  TRAINING_STATUS_COLORS,
  TRAINING_STATUS_LABELS,
  canManageTrainings,
  formatTrainingDate,
  formatTrainingTime,
  todayIso,
} from "../lib/trainings";
import TrainingForm from "../components/TrainingForm";

/** Tarjeta de un entreno en la lista: fecha, hora, lugar, objetivos y asistencia. */
function TrainingCard({ training }: { training: Training }) {
  const time = formatTrainingTime(training);
  const a = training.attendance;
  const total = a ? a.present + a.justifiedAbsence + a.unjustifiedAbsence : 0;

  return (
    <li>
      <Link
        to={`/entrenos/${training.id}`}
        className="block rounded border border-gray-200 p-3 hover:bg-gray-50"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium">{formatTrainingDate(training.date)}</p>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs ${TRAINING_STATUS_COLORS[training.status]}`}
          >
            {TRAINING_STATUS_LABELS[training.status]}
          </span>
        </div>
        {(time || training.location) && (
          <p className="text-sm text-gray-600">
            {[time, training.location].filter(Boolean).join(" · ")}
          </p>
        )}
        {training.objectives && (
          <p className="mt-1 truncate text-sm text-gray-700">{training.objectives}</p>
        )}
        {a && total > 0 && (
          <p className="mt-1 text-xs text-gray-600">
            {a.present} asisten · {a.justifiedAbsence} justificadas · {a.unjustifiedAbsence} sin
            justificar
          </p>
        )}
      </Link>
    </li>
  );
}

/**
 * Entrenos de la temporada actual, separados en próximos (el más cercano
 * primero) y anteriores (el más reciente primero). Desde aquí se crean.
 */
function TrainingsPage() {
  const { current } = useCurrentTeam();
  const { data: trainings, isPending, isError } = useTrainings(current?.team?._id);
  const [showForm, setShowForm] = useState(false);

  // RequireTeam garantiza que hay equipo; esto cubre el instante de carga
  if (!current || !current.team) return <p className="p-6">Cargando...</p>;

  const canManage = canManageTrainings(current.role);

  // El servidor los envía ordenados de más antiguo a más reciente
  const today = todayIso();
  const upcoming = trainings?.filter((t) => t.date.slice(0, 10) >= today) ?? [];
  const past = trainings?.filter((t) => t.date.slice(0, 10) < today).reverse() ?? [];

  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Entrenos</h1>
          {trainings && (
            <p className="text-sm text-gray-600">
              {trainings.length} {trainings.length === 1 ? "entreno" : "entrenos"} esta temporada
            </p>
          )}
        </div>
        {canManage && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-green-700 px-4 py-2 text-white"
          >
            Nuevo entreno
          </button>
        )}
      </div>

      {/* El formulario se queda estrecho aunque la página sea ancha */}
      {showForm && (
        <div className="mb-6 max-w-2xl">
          <TrainingForm
            teamId={current.team._id}
            defaultLocation={current.team.fieldName}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {isPending && <p>Cargando entrenos...</p>}
      {isError && <p className="text-red-600">No se han podido cargar los entrenos.</p>}

      {trainings && trainings.length === 0 && !showForm && (
        <p className="rounded border border-dashed border-gray-300 p-6 text-center text-gray-600">
          Aún no hay entrenos esta temporada.
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Próximos</h2>
          <ul className="space-y-2">
            {upcoming.map((t) => (
              <TrainingCard key={t.id} training={t} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Anteriores</h2>
          <ul className="space-y-2">
            {past.map((t) => (
              <TrainingCard key={t.id} training={t} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default TrainingsPage;
