import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPlayer,
  updatePlayer,
  type CreatePlayerData,
  type PlayerStatus,
  type SquadPlayer,
} from "../api/players";
import type { Category, Role } from "../api/teams";
import { getFieldErrors } from "../api/client";
import { CATEGORY_LABELS } from "../lib/teams";
import { COUNTRY_OPTIONS } from "../lib/countries";
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

interface PlayerFormProps {
  teamId: string;
  role: Role;
  // Categoría de la temporada: es la ficha que se propone por defecto
  defaultCategory: Category;
  // Si se indica, el formulario edita a ese jugador; si no, crea uno nuevo
  player?: SquadPlayer;
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

// Un tutor tal como se edita en el formulario (todo como texto)
interface GuardianForm {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

const MAX_GUARDIANS = 4;

type SalaryPeriod = "monthly" | "yearly";

// El contrato tal como se edita en el formulario (todo como texto)
interface ContractForm {
  startDate: string;
  endDate: string;
  salary: string;
  salaryPeriod: SalaryPeriod;
}

const emptyGuardian = (): GuardianForm => ({
  name: "",
  relationship: "",
  phone: "",
  email: "",
});

// El servidor envía las fechas como "2012-03-20T00:00:00.000Z" y el campo de
// fecha del navegador espera solo "2012-03-20"
const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

// Convierte un objeto de etiquetas en las opciones de un desplegable
const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * Formulario de jugador. Sin la propiedad "player" crea un jugador nuevo en
 * la plantilla de la temporada actual; con ella, edita los datos de ese
 * jugador, que aparecen ya rellenos.
 */
function PlayerForm({ teamId, role, defaultCategory, player, onDone }: PlayerFormProps) {
  const isEditing = Boolean(player);

  const [form, setForm] = useState<FormState>({
    name: player?.name ?? "",
    surname: player?.surname ?? "",
    nickname: player?.nickname ?? "",
    birthDate: toDateInput(player?.birthDate),
    nationality: player?.nationality ?? "",
    licenseCategory: player?.licenseCategory ?? defaultCategory,
    jerseyNumber: String(player?.jerseyNumber ?? ""),
    mainPosition: player?.mainPosition ?? "",
    status: player?.status ?? "available",
  });
  const [secondary, setSecondary] = useState<Position[]>(player?.secondaryPositions ?? []);

  // Tutores: una lista, de 0 a 4. Al editar, se cargan los que ya tiene.
  const [guardians, setGuardians] = useState<GuardianForm[]>(
    (player?.guardians ?? []).map((g) => ({
      name: g.name,
      relationship: g.relationship,
      phone: g.phone ?? "",
      email: g.email ?? "",
    }))
  );

  // Contrato: bloque opcional, solo para quien puede gestionarlo
  const [withContract, setWithContract] = useState(Boolean(player?.contract));
  const [contract, setContract] = useState<ContractForm>({
    startDate: toDateInput(player?.contract?.startDate),
    endDate: toDateInput(player?.contract?.endDate),
    salary: String(player?.contract?.salary ?? ""),
    salaryPeriod: player?.contract?.salaryPeriod ?? "monthly",
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreatePlayerData) =>
      player ? updatePlayer(teamId, player.id, data) : createPlayer(teamId, data),
    onSuccess: async () => {
      // Recargamos la plantilla para que se vean los cambios
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

  // Gestión de la lista de tutores
  const addGuardian = () => setGuardians((prev) => [...prev, emptyGuardian()]);
  const removeGuardian = (index: number) =>
    setGuardians((prev) => prev.filter((_, i) => i !== index));
  function updateGuardian(index: number, field: keyof GuardianForm, value: string) {
    setGuardians((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  }

  /** Construye los datos que espera el servidor y los envía. */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.mainPosition) return;

    const hasSalary = contract.salary !== "";

    const data: CreatePlayerData = {
      name: form.name,
      surname: form.surname,
      // Los campos opcionales vacíos no se envían. Al editar, el servidor
      // borra los que no llegan, así que así se pueden vaciar.
      nickname: form.nickname.trim() || undefined,
      birthDate: form.birthDate,
      nationality: form.nationality || undefined,
      licenseCategory: form.licenseCategory,
      jerseyNumber: form.jerseyNumber === "" ? undefined : Number(form.jerseyNumber),
      mainPosition: form.mainPosition,
      secondaryPositions: secondary,
      status: form.status,
      guardians: guardians.map((g) => ({
        name: g.name,
        relationship: g.relationship,
        phone: g.phone.trim() || undefined,
        email: g.email.trim() || undefined,
      })),
      // Quien no puede gestionar contratos no envía nada: el servidor
      // conserva el que ya hubiera
      contract:
        withContract && canEditContract(role)
          ? {
              startDate: contract.startDate || undefined,
              endDate: contract.endDate,
              salary: hasSalary ? Number(contract.salary) : undefined,
              // El periodo solo tiene sentido si hay sueldo
              salaryPeriod: hasSalary ? contract.salaryPeriod : undefined,
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
      <h2 className="text-lg font-semibold">{isEditing ? "Editar jugador" : "Añadir jugador"}</h2>

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
          emptyLabel="Sin nacionalidad"
          error={firstError("nationality")}
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
        <p className="text-sm font-medium text-gray-700">Posiciones secundarias (hasta 4)</p>
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

      {/* Tutores: de 0 a 4 */}
      <div className="space-y-3 rounded bg-gray-50 p-3">
        <p className="text-sm font-medium">Tutores</p>
        {guardians.map((g, i) => (
          <div key={i} className="space-y-3 rounded border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id={`guardianName${i}`}
                label="Nombre del tutor"
                value={g.name}
                onChange={(e) => updateGuardian(i, "name", e.target.value)}
                maxLength={100}
                required
              />
              <FormField
                id={`guardianRelationship${i}`}
                label="Relación"
                placeholder="madre, padre, tutor..."
                value={g.relationship}
                onChange={(e) => updateGuardian(i, "relationship", e.target.value)}
                maxLength={40}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                id={`guardianPhone${i}`}
                label="Teléfono (opcional)"
                type="tel"
                value={g.phone}
                onChange={(e) => updateGuardian(i, "phone", e.target.value)}
                maxLength={20}
              />
              <FormField
                id={`guardianEmail${i}`}
                label="Email (opcional)"
                type="email"
                value={g.email}
                onChange={(e) => updateGuardian(i, "email", e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeGuardian(i)}
                className="text-sm text-red-700 underline"
              >
                Quitar tutor
              </button>
            </div>
          </div>
        ))}
        {guardians.length < MAX_GUARDIANS && (
          <button type="button" onClick={addGuardian} className="text-sm text-green-700 underline">
            + Añadir tutor
          </button>
        )}
        {firstError("guardians") && (
          <p className="text-sm text-red-600">{firstError("guardians")}</p>
        )}
      </div>

      {/* Bloque opcional: contrato. Solo lo gestiona el entrenador principal */}
      {canEditContract(role) && (
        <div className="space-y-3 rounded bg-gray-50 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={withContract}
              onChange={(e) => setWithContract(e.target.checked)}
            />
            Contrato
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
                  onChange={(e) =>
                    setContract({ ...contract, salaryPeriod: e.target.value as SalaryPeriod })
                  }
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
          {mutation.isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar jugador"}
        </button>
      </div>
    </form>
  );
}

export default PlayerForm;
