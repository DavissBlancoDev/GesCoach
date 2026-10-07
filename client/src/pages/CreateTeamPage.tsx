import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTeam, type Category, type Modality } from "../api/teams";
import { useMyTeams } from "../hooks/useMyTeams";
import {
  CATEGORY_LABELS,
  MODALITY_LABELS,
  currentSeasonStartYear,
  seasonLabel,
  suggestedModality,
} from "../lib/teams";
import FormField from "../components/FormField";
import FormSelect from "../components/FormSelect";

// Convierte un objeto de etiquetas en las opciones de un desplegable
const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * Asistente de creación de equipo en dos pasos:
 *  1. Datos del equipo (nombre, colores, campo local).
 *  2. Datos de la temporada (categoría, modalidad, división, duración).
 * Los datos de ambos pasos se envían juntos al final.
 */
function CreateTeamPage() {
  const [step, setStep] = useState<1 | 2>(1);

  // Paso 1: equipo
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1d4ed8");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [fieldName, setFieldName] = useState("");
  const [fieldLocation, setFieldLocation] = useState("");

  // Paso 2: temporada. Los números se guardan como texto mientras se
  // escriben y se convierten al enviar.
  const [startYear, setStartYear] = useState(String(currentSeasonStartYear()));
  const [category, setCategory] = useState<Category | "">("");
  const [modality, setModality] = useState<Modality>("f11");
  const [division, setDivision] = useState("");
  const [matchDuration, setMatchDuration] = useState("");

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: teams } = useMyTeams();

  const mutation = useMutation({
    mutationFn: createTeam,
    onSuccess: async () => {
      // Esperamos a que la lista de equipos se actualice antes de navegar;
      // si no, la ruta protegida vería la lista vacía y nos devolvería aquí.
      await queryClient.invalidateQueries({ queryKey: ["teams", "mine"] });
      navigate("/", { replace: true });
    },
  });

  // Quien ya tiene equipo no necesita el asistente
  if (teams && teams.length > 0) return <Navigate to="/" replace />;

  /** Paso 1 → paso 2. La validación de campos obligatorios la hace el navegador. */
  function handleStep1(e: FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  /** Al cambiar la categoría, sugerimos la modalidad habitual (editable). */
  function handleCategoryChange(value: string) {
    const nueva = value as Category;
    setCategory(nueva);
    setModality(suggestedModality(nueva));
  }

  /** Paso 2: envía todo al servidor. */
  function handleStep2(e: FormEvent) {
    e.preventDefault();
    if (!category) return;

    mutation.mutate({
      name,
      primaryColor,
      secondaryColor,
      fieldName,
      // Si el campo opcional está vacío, no se envía
      fieldLocation: fieldLocation.trim() || undefined,
      season: {
        startYear: Number(startYear),
        category,
        modality,
        division,
        matchDuration: Number(matchDuration),
      },
    });
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-bold">Crea tu equipo</h1>
      <p className="mb-6 text-sm text-gray-600">Paso {step} de 2</p>

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <FormField
            id="name"
            label="Nombre del equipo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="primaryColor"
              label="Color primario"
              type="color"
              className="mt-1 h-10 w-full rounded border border-gray-300"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <FormField
              id="secondaryColor"
              label="Color secundario"
              type="color"
              className="mt-1 h-10 w-full rounded border border-gray-300"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
            />
          </div>
          <FormField
            id="fieldName"
            label="Nombre del campo local"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            maxLength={120}
            required
          />
          <FormField
            id="fieldLocation"
            label="Ubicación del campo (opcional)"
            value={fieldLocation}
            onChange={(e) => setFieldLocation(e.target.value)}
            maxLength={200}
          />
          <button
            type="submit"
            className="w-full rounded bg-green-700 px-4 py-2 text-white"
          >
            Siguiente
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <FormField
            id="startYear"
            label={`Temporada (${seasonLabel(Number(startYear) || 0)})`}
            type="number"
            min={2000}
            max={2100}
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            required
          />
          <FormSelect
            id="category"
            label="Categoría"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            options={toOptions(CATEGORY_LABELS)}
            required
          />
          <FormSelect
            id="modality"
            label="Modalidad"
            value={modality}
            onChange={(e) => setModality(e.target.value as Modality)}
            options={toOptions(MODALITY_LABELS)}
            required
          />
          <FormField
            id="division"
            label="División"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            maxLength={120}
            required
          />
          <FormField
            id="matchDuration"
            label="Duración del partido (minutos)"
            type="number"
            min={10}
            max={120}
            value={matchDuration}
            onChange={(e) => setMatchDuration(e.target.value)}
            required
          />
          {mutation.isError && (
            <p className="text-sm text-red-600">{mutation.error.message}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded border border-gray-300 px-4 py-2"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Creando..." : "Crear equipo"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

export default CreateTeamPage;