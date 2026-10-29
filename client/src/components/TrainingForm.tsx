import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTraining, updateTraining, type Training, type TrainingData } from "../api/trainings";
import { getFieldErrors } from "../api/client";
import { todayIso } from "../lib/trainings";
import DateSelect from "./DateSelect";
import FormField from "./FormField";

interface TrainingFormProps {
  teamId: string;
  // Lugar que se propone al crear un entreno: el campo local del equipo
  defaultLocation: string;
  // Si se indica, el formulario edita ese entreno; si no, crea uno nuevo
  training?: Training;
  onDone: () => void;
}

const currentYear = new Date().getFullYear();

/**
 * Formulario de entreno. Sin la propiedad "training" crea uno nuevo (con la
 * fecha de hoy y el campo local ya propuestos); con ella, edita ese entreno.
 */
function TrainingForm({ teamId, defaultLocation, training, onDone }: TrainingFormProps) {
  const isEditing = Boolean(training);

  // Los números se guardan como texto mientras se escriben y se convierten al enviar
  const [date, setDate] = useState(training ? training.date.slice(0, 10) : todayIso());
  const [startTime, setStartTime] = useState(training?.startTime ?? "");
  const [duration, setDuration] = useState(String(training?.durationMinutes ?? ""));
  const [location, setLocation] = useState(training ? (training.location ?? "") : defaultLocation);
  const [objectives, setObjectives] = useState(training?.objectives ?? "");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: TrainingData) =>
      training ? updateTraining(teamId, training.id, data) : createTraining(teamId, data),
    onSuccess: async () => {
      // Recargamos la lista y, si se editó, también el detalle de ese entreno
      await queryClient.invalidateQueries({ queryKey: ["trainings", teamId] });
      if (training) {
        await queryClient.invalidateQueries({ queryKey: ["training", teamId, training.id] });
      }
      onDone();
    },
  });

  // Errores por campo que devuelve el servidor al validar
  const fieldErrors = getFieldErrors(mutation.error);
  const firstError = (field: string) => fieldErrors[field]?.[0];

  /** Construye los datos que espera el servidor y los envía. */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({
      date,
      // Los campos opcionales vacíos no se envían. Al editar, el servidor
      // borra los que no llegan, así que así se pueden vaciar.
      startTime: startTime || undefined,
      durationMinutes: duration === "" ? undefined : Number(duration),
      location: location.trim() || undefined,
      objectives: objectives.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-gray-200 p-4">
      <h2 className="text-lg font-semibold">{isEditing ? "Editar entreno" : "Nuevo entreno"}</h2>

      <DateSelect
        id="trainingDate"
        label="Fecha"
        value={date}
        onChange={setDate}
        minYear={currentYear - 1}
        maxYear={currentYear + 1}
        order="asc"
        error={firstError("date")}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="startTime"
          label="Hora de inicio (opcional)"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          error={firstError("startTime")}
        />
        <FormField
          id="duration"
          label="Duración en minutos (opcional)"
          type="number"
          min={10}
          max={240}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          error={firstError("durationMinutes")}
        />
      </div>

      <FormField
        id="location"
        label="Lugar (opcional)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        error={firstError("location")}
        maxLength={120}
      />

      <div>
        <label htmlFor="objectives" className="block text-sm font-medium text-gray-700">
          Objetivos del entreno (opcional)
        </label>
        <textarea
          id="objectives"
          rows={3}
          maxLength={1000}
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        {firstError("objectives") && (
          <p className="mt-1 text-sm text-red-600">{firstError("objectives")}</p>
        )}
      </div>

      {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onDone} className="rounded border border-gray-300 px-4 py-2">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear entreno"}
        </button>
      </div>
    </form>
  );
}

export default TrainingForm;
