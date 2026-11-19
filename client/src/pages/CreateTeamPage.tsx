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
    <main className="min-h-screen bg-[#f3f7f4] px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between sm:mb-8">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="GesCoach" className="h-10 w-10 rounded-xl bg-black p-1.5 object-contain shadow-sm" />
            <span className="text-lg font-bold tracking-tight">GesCoach</span>
          </div>
          <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 sm:block">
            Configuración inicial
          </span>
        </header>

        <section className="overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(10,45,27,0.12)] ring-1 ring-slate-100">
          <div className="bg-[#173b2b] px-6 py-7 text-white sm:px-10 sm:py-9">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7f264]">Primer paso</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Crea tu equipo</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                  Configura los datos básicos y deja lista tu primera temporada.
                </p>
              </div>
              <span className="text-sm font-semibold text-white/70">Paso {step} de 2</span>
            </div>
            <div className="mt-7 flex gap-2" aria-label={`Paso ${step} de 2`}>
              <span className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-[#d7f264]" : "bg-white/20"}`} />
              <span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-[#d7f264]" : "bg-white/20"}`} />
            </div>
          </div>

          <div className="p-6 sm:p-10">
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-7">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Identidad del equipo</h2>
                  <p className="mt-1 text-sm text-slate-500">Así aparecerá en tu panel y en la ficha de tus partidos.</p>
                </div>
                <div className="space-y-5">
          <FormField
            id="name"
            label="Nombre del equipo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:p-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">Colores del equipo</p>
            <div className="grid grid-cols-2 gap-4">
            <FormField
              id="primaryColor"
              label="Color primario"
              type="color"
              className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <FormField
              id="secondaryColor"
              label="Color secundario"
              type="color"
              className="mt-2 h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
            />
            </div>
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
            className="w-full rounded-xl bg-green-700 px-4 py-3.5 font-semibold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-600/15"
          >
            Continuar con la temporada <span aria-hidden="true">→</span>
          </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-7">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">Tu primera temporada</h2>
                  <p className="mt-1 text-sm text-slate-500">Puedes cambiar estos datos más adelante desde los ajustes del club.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
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
                </div>
          {mutation.isError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{mutation.error.message}</p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? "Creando..." : "Crear equipo"}
            </button>
          </div>
              </form>
            )}
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-slate-500">Solo te llevará un minuto. Podrás actualizarlo cuando quieras.</p>
      </div>
    </main>
  );
}

export default CreateTeamPage;
