import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlayer, type CreatePlayerData, type PlayerStatus } from "../api/players";
import type { Category, Role } from "../api/teams";
import { getFieldErrors } from "../api/client";
import { CATEGORY_LABELS } from "../lib/teams";
import {
  GROUP_LABELS,
  POSITIONS,
  POSITION_GROUP,
  POSITION_GROUPS,
  POSITION_LABELS,
  type Position,
} from "../lib/positions";
import { PLAYER_STATUS_LABELS, canEditContract } from "../lib/players";
import FormField from "./FormField";
import FormSelect from "./FormSelect";
import { COUNTRY_OPTIONS } from "../lib/countries";

interface PlayerFormProps {
  teamId: string;
  role: Role;
  // Categoría de la temporada: es la ficha que se propone por defecto
  defaultCategory: Category;
  onDone: () => void;
}

// Datos principales del formulario. Los números se guardan como texto
// mientras se escriben y se convierten al enviar.
interface FormState {
  name: string;
  surname: string;
  nickname: string;
  birthDate: string;
  nationality: string;
  licenseCategory: Category;
  jerseyNumber: string;
  mainPosition: Position | "";
  status: PlayerStatus;
}

// Convierte un objeto de etiquetas en las opciones de un desplegable
const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Formulario para añadir un jugador a la plantilla de la temporada actual. */
function PlayerForm({ teamId, role, defaultCategory, onDone }: PlayerFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    surname: "",
    nickname: "",
    birthDate: "",
    nationality: "",
    licenseCategory: defaultCategory,
    jerseyNumber: "",
    mainPosition: "",
    status: "available",
  });
  const [secondary, setSecondary] = useState<Position[]>([]);

  // Bloques opcionales: solo se envían si se activan
  const [withGuardian, setWithGuardian] = useState(false);
  const [guardian, setGuardian] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
  });
  const [withContract, setWithContract] = useState(false);
  const [contract, setContract] = useState({
    startDate: "",
    endDate: "",
    salary: "",
    salaryPeriod: "monthly",
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreatePlayerData) => createPlayer(teamId, data),
    onSuccess: async () => {
      // Recargamos la plantilla para que aparezca el jugador nuevo
      await queryClient.invalidateQueries({ queryKey: ["players", teamId] });
      onDone();
    },
  });

  // Errores por campo que devuelve el servidor al validar
  const fieldErrors = getFieldErrors(mutation.error);
  const firstError = (field: string) => fieldErrors[field]?.[0];

  /** Actualiza un campo del formulario principal. */
  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /** Al cambiar la posición principal, la quitamos de las secundarias. */
  function handleMainPosition(value: Position) {
    update("mainPosition", value);
    setSecondary((prev) => prev.filter((p) => p !== value));
  }

  /** Activa o desactiva una posición secundaria (máximo 4). */
  function toggleSecondary(position: Position) {
    setSecondary((prev) => {
      if (prev.includes(position)) return prev.filter((p) => p !== position);
      return prev.length < 4 ? [...prev, position] : prev;
    });
  }

  /** Construye los datos que espera el servidor y los envía. */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.mainPosition) return;

    const hasSalary = contract.salary !== "";

    const data: CreatePlayerData = {
      name: form.name,
      surname: form.surname,
      // Los campos opcionales vacíos no se envían
      nickname: form.nickname.trim() || undefined,
      birthDate: form.birthDate,
      nationality: form.nationality.trim() || undefined,
      licenseCategory: form.licenseCategory,
      jerseyNumber: form.jerseyNumber === "" ? undefined : Number(form.jerseyNumber),
      mainPosition: form.mainPosition,
      secondaryPositions: secondary,
      status: form.status,
      guardians: withGuardian
        ? [
            {
              name: guardian.name,
              relationship: guardian.relationship,
              phone: guardian.phone.trim() || undefined,
              email: guardian.email.trim() || undefined,
            },
          ]
        : [],
      contract:
        withContract && canEditContract(role)
          ? {
              startDate: contract.startDate || undefined,
              endDate: contract.endDate,
              salary: hasSalary ? Number(contract.salary) : undefined,
              // El periodo solo tiene sentido si hay sueldo
              salaryPeriod: hasSalary
                ? (contract.salaryPeriod as "monthly" | "yearly")
                : undefined,
            }
          : undefined,
    };

    mutation.mutate(data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded border border-gray-200 p-4"
    >
      <h2 className="text-lg font-semibold">Añadir jugador</h2>

      {/* Datos de la persona */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="name"
          label="Nombre"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={firstError("name")}
          maxLength={60}
          required
        />
        <FormField
          id="surname"
          label="Apellidos"
          value={form.surname}
          onChange={(e) => update("surname", e.target.value)}
          error={firstError("surname")}
          maxLength={100}
          required
        />
      </div>
      <FormField
        id="nickname"
        label="Nombre futbolístico (opcional)"
        value={form.nickname}
        onChange={(e) => update("nickname", e.target.value)}
        error={firstError("nickname")}
        maxLength={40}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="birthDate"
          label="Fecha de nacimiento"
          type="date"
          value={form.birthDate}
          onChange={(e) => update("birthDate", e.target.value)}
          error={firstError("birthDate")}
          required
        />
        <FormSelect
          id="nationality"
          label="Nacionalidad (opcional)"
          value={form.nationality}
          onChange={(e) => update("nationality", e.target.value)}
          options={COUNTRY_OPTIONS}
        />
      </div>

      {/* Datos de la temporada */}
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          id="licenseCategory"
          label="Ficha"
          value={form.licenseCategory}
          onChange={(e) => update("licenseCategory", e.target.value as Category)}
          options={toOptions(CATEGORY_LABELS)}
          required
        />
        <FormField
          id="jerseyNumber"
          label="Dorsal (opcional)"
          type="number"
          min={0}
          max={99}
          value={form.jerseyNumber}
          onChange={(e) => update("jerseyNumber", e.target.value)}
          error={firstError("jerseyNumber")}
        />
      </div>

      {/* La posición principal se agrupa por tipo (defensas, etc.) */}
      <div>
        <label htmlFor="mainPosition" className="block text-sm font-medium text-gray-700">
          Posición principal
        </label>
        <select
          id="mainPosition"
          className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2"
          value={form.mainPosition}
          onChange={(e) => handleMainPosition(e.target.value as Position)}
          required
        >
          <option value="" disabled>
            Selecciona...
          </option>
          {POSITION_GROUPS.map((group) => (
            <optgroup key={group} label={GROUP_LABELS[group]}>
              {POSITIONS.filter((p) => POSITION_GROUP[p] === group).map((p) => (
                <option key={p} value={p}>
                  {POSITION_LABELS[p]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {firstError("mainPosition") && (
          <p className="mt-1 text-sm text-red-600">{firstError("mainPosition")}</p>
        )}
      </div>

      {/* Posiciones secundarias: botones que se activan y desactivan */}
      <div>
        <p className="text-sm font-medium text-gray-700">
          Posiciones secundarias (hasta 4)
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {POSITIONS.filter((p) => p !== form.mainPosition).map((p) => {
            const active = secondary.includes(p);
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSecondary(p)}
                className={`rounded border px-2 py-1 text-xs ${
                  active
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                {POSITION_LABELS[p]}
              </button>
            );
          })}
        </div>
        {firstError("secondaryPositions") && (
          <p className="mt-1 text-sm text-red-600">{firstError("secondaryPositions")}</p>
        )}
      </div>

      <FormSelect
        id="status"
        label="Estado"
        value={form.status}
        onChange={(e) => update("status", e.target.value as PlayerStatus)}
        options={toOptions(PLAYER_STATUS_LABELS)}
        required
      />

      {/* Bloque opcional: contacto de un tutor */}
      <div className="space-y-3 rounded bg-gray-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={withGuardian}
            onChange={(e) => setWithGuardian(e.target.checked)}
          />
          Añadir contacto de un tutor
        </label>
        {withGuardian && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="guardianName"
                label="Nombre del tutor"
                value={guardian.name}
                onChange={(e) => setGuardian({ ...guardian, name: e.target.value })}
                maxLength={100}
                required
              />
              <FormField
                id="guardianRelationship"
                label="Relación"
                placeholder="madre, padre, tutor..."
                value={guardian.relationship}
                onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })}
                maxLength={40}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="guardianPhone"
                label="Teléfono (opcional)"
                type="tel"
                value={guardian.phone}
                onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })}
                maxLength={20}
              />
              <FormField
                id="guardianEmail"
                label="Email (opcional)"
                type="email"
                value={guardian.email}
                onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
              />
            </div>
            {firstError("guardians") && (
              <p className="text-sm text-red-600">{firstError("guardians")}</p>
            )}
          </>
        )}
      </div>

      {/* Bloque opcional: contrato. Solo lo gestiona el entrenador principal */}
      {canEditContract(role) && (
        <div className="space-y-3 rounded bg-gray-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={withContract}
              onChange={(e) => setWithContract(e.target.checked)}
            />
            Añadir contrato
          </label>
          {withContract && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="contractStart"
                  label="Inicio (opcional)"
                  type="date"
                  value={contract.startDate}
                  onChange={(e) => setContract({ ...contract, startDate: e.target.value })}
                />
                <FormField
                  id="contractEnd"
                  label="Fin del contrato"
                  type="date"
                  value={contract.endDate}
                  onChange={(e) => setContract({ ...contract, endDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="salary"
                  label="Sueldo en € (opcional)"
                  type="number"
                  min={0}
                  value={contract.salary}
                  onChange={(e) => setContract({ ...contract, salary: e.target.value })}
                />
                <FormSelect
                  id="salaryPeriod"
                  label="Periodo"
                  value={contract.salaryPeriod}
                  onChange={(e) => setContract({ ...contract, salaryPeriod: e.target.value })}
                  options={[
                    { value: "monthly", label: "Mensual" },
                    { value: "yearly", label: "Anual" },
                  ]}
                />
              </div>
              {firstError("contract") && (
                <p className="text-sm text-red-600">{firstError("contract")}</p>
              )}
            </>
          )}
        </div>
      )}

      {mutation.isError && <p className="text-sm text-red-600">{mutation.error.message}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-gray-300 px-4 py-2"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando..." : "Guardar jugador"}
        </button>
      </div>
    </form>
  );
}

export default PlayerForm;