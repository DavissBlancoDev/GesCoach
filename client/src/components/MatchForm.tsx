import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMatch,
  updateMatch,
  type Match,
  type MatchCompetition,
  type MatchData,
  type MatchVenue,
} from "../api/matches";
import { getFieldErrors } from "../api/client";
import { useOpponents } from "../hooks/useMatches";
import { COMPETITION_LABELS, VENUE_LABELS, competitionLabel } from "../lib/matches";
import DateSelect from "./DateSelect";
import FormField from "./FormField";
import FormSelect from "./FormSelect";

interface MatchFormProps {
  teamId: string;
  // División de la temporada: acompaña a "Liga" en el desplegable
  division: string;
  // Campo local del equipo: se propone cuando el partido es en casa
  defaultFieldName: string;
  // Si se indica, el formulario edita ese partido; si no, programa uno nuevo
  match?: Match;
  onDone: () => void;
}

const currentYear = new Date().getFullYear();

/**
 * Formulario para programar un partido (o editar uno existente): tipo de
 * partido, rival (con sugerencias de los ya usados), sede, fecha, hora
 * opcional, localidad, campo y observaciones.
 */
function MatchForm({ teamId, division, defaultFieldName, match, onDone }: MatchFormProps) {
  const isEditing = Boolean(match);
  const { data: opponents } = useOpponents(teamId);

  const [competition, setCompetition] = useState<MatchCompetition>(match?.competition ?? "league");
  const [venue, setVenue] = useState<MatchVenue>(match?.venue ?? "home");
  const [opponentName, setOpponentName] = useState(match?.opponent.name ?? "");
  const [date, setDate] = useState(match ? match.date.slice(0, 10) : "");
  const [time, setTime] = useState(match?.time ?? "");
  const [city, setCity] = useState(match?.city ?? "");
  const [fieldName, setFieldName] = useState(match ? (match.fieldName ?? "") : defaultFieldName);
  const [observations, setObservations] = useState(match?.observations ?? "");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: MatchData) =>
      match ? updateMatch(teamId, match.id, data) : createMatch(teamId, data),
    onSuccess: async () => {
      // Recargamos los partidos y los rivales (puede haber uno nuevo)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["matches", teamId] }),
        queryClient.invalidateQueries({ queryKey: ["opponents", teamId] }),
      ]);
      onDone();
    },
  });

  // Errores por campo que devuelve el servidor al validar
  const fieldErrors = getFieldErrors(mutation.error);
  const firstError = (field: string) => fieldErrors[field]?.[0];

  /**
   * Al cambiar la sede, proponemos o quitamos nuestro campo: si el partido
   * pasa a ser en casa y no hay campo, se rellena con el del equipo, y si
   * deja de serlo y el campo era el nuestro, se vacía.
   */
  function handleVenueChange(next: MatchVenue) {
    setVenue(next);
    if (next === "home" && fieldName === "") setFieldName(defaultFieldName);
    if (next !== "home" && fieldName === defaultFieldName) setFieldName("");
  }

  /** Construye los datos que espera el servidor y los envía. */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({
      competition,
      venue,
      opponentName: opponentName.trim(),
      date,
      // Los campos opcionales vacíos no se envían. Al editar, el servidor
      // borra los que no llegan, así que así se pueden vaciar.
      time: time || undefined,
      city: city.trim() || undefined,
      fieldName: fieldName.trim() || undefined,
      observations: observations.trim() || undefined,
    });
  }

  const competitionOptions = (Object.keys(COMPETITION_LABELS) as MatchCompetition[]).map(
    (value) => ({ value, label: competitionLabel(value, division) })
  );
  const venueOptions = (Object.keys(VENUE_LABELS) as MatchVenue[]).map((value) => ({
    value,
    label: VENUE_LABELS[value],
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border border-gray-200 p-4">
      <h2 className="text-lg font-semibold">{isEditing ? "Editar partido" : "Programar partido"}</h2>

      <FormSelect
        id="competition"
        label="Tipo de partido"
        value={competition}
        onChange={(e) => setCompetition(e.target.value as MatchCompetition)}
        options={competitionOptions}
        required
      />

      {/* Rival: se escribe, y se sugieren los que ya se han usado */}
      <FormField
        id="opponentName"
        label="Rival"
        list="opponents-list"
        autoComplete="off"
        value={opponentName}
        onChange={(e) => setOpponentName(e.target.value)}
        error={firstError("opponentName")}
        maxLength={80}
        required
      />
      <datalist id="opponents-list">
        {opponents?.map((o) => (
          <option key={o.id} value={o.name} />
        ))}
      </datalist>

      <FormSelect
        id="venue"
        label="Sede"
        value={venue}
        onChange={(e) => handleVenueChange(e.target.value as MatchVenue)}
        options={venueOptions}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <DateSelect
          id="matchDate"
          label="Fecha"
          value={date}
          onChange={setDate}
          minYear={currentYear - 1}
          maxYear={currentYear + 1}
          order="asc"
          error={firstError("date")}
          required
        />
        <FormField
          id="matchTime"
          label="Hora (opcional, si no se sabe aún)"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          error={firstError("time")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="city"
          label="Localidad (opcional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          error={firstError("city")}
          maxLength={80}
        />
        <FormField
          id="fieldName"
          label="Nombre del campo (opcional)"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          error={firstError("fieldName")}
          maxLength={120}
        />
      </div>

      <div>
        <label htmlFor="observations" className="block text-sm font-medium text-gray-700">
          Observaciones (opcional)
        </label>
        <textarea
          id="observations"
          rows={3}
          maxLength={1000}
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        {firstError("observations") && (
          <p className="mt-1 text-sm text-red-600">{firstError("observations")}</p>
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
          {mutation.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Programar partido"}
        </button>
      </div>
    </form>
  );
}

export default MatchForm;
