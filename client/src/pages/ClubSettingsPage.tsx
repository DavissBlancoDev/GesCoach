import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateSeason, updateTeam, type SeasonChanges, type TeamChanges } from "../api/club";
import type { Category, Modality } from "../api/teams";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useMatches } from "../hooks/useMatches";
import { useMembers } from "../hooks/useMembers";
import { usePlayers } from "../hooks/usePlayers";
import { COUNTRY_OPTIONS, countryName } from "../lib/countries";
import { CATEGORY_LABELS, MODALITY_LABELS, ROLE_LABELS, seasonLabel } from "../lib/teams";
import Avatar from "../components/Avatar";
import DefaultBadge from "../components/DefaultBadge";
import FieldsModal, { type FieldConfig } from "../components/FieldsModal";
import Flag from "../components/Flag";
import { SettingsGroup, SettingsRow } from "../components/SettingsList";

// Qué ventana está abierta, si hay alguna
type ModalName =
  | "name"
  | "category"
  | "modality"
  | "startYear"
  | "matchDuration"
  | "division"
  | "colors"
  | "country"
  | "fieldLocation"
  | "fieldName";

// Lo que necesita FieldsModal para abrirse
interface ModalConfig {
  title: string;
  description?: string;
  fields: FieldConfig[];
  initial: Record<string, string>;
  onSave: (values: Record<string, string>) => Promise<unknown>;
}

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * Ajustes del club: escudo, nombre, modalidad, categoría y temporada arriba, y
 * debajo los grupos Equipo, Colores, Ubicación y Miembros. Solo el entrenador
 * principal puede cambiar algo; el resto lo ve sin poder editarlo.
 */
function ClubSettingsPage() {
  const { current } = useCurrentTeam();
  const teamId = current?.team?._id;
  const players = usePlayers(teamId);
  const matches = useMatches(teamId);
  const members = useMembers(teamId);
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalName | null>(null);

  if (!current?.team || !current.currentSeason) return <p className="p-6">Cargando...</p>;

  const team = current.team;
  const season = current.currentSeason;
  const canEdit = current.role === "head_coach";

  // La categoría y la modalidad se bloquean si ya hay jugadores o partidos.
  // Mientras se comprueba, también: así no se intenta un cambio que el
  // servidor rechazaría (el servidor lo comprueba igualmente).
  const structureLocked =
    players.isPending ||
    matches.isPending ||
    (players.data?.length ?? 0) > 0 ||
    (matches.data?.length ?? 0) > 0;
  const lockHint = "No se puede cambiar: ya hay jugadores o partidos en esta temporada";

  /** Recarga los equipos (que traen los datos del equipo y de la temporada). */
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["teams", "mine"] });
  const saveTeam = async (data: TeamChanges) => {
    await updateTeam(team._id, data);
    await refresh();
  };
  const saveSeason = async (data: SeasonChanges) => {
    await updateSeason(team._id, data);
    await refresh();
  };

  /** Abre una ventana, solo si el rol puede editar. */
  const open = (name: ModalName) => (canEdit ? () => setModal(name) : undefined);

  // Descripción de cada ventana: sus campos, su valor actual y cómo se guarda
  const configs: Record<ModalName, ModalConfig> = {
    name: {
      title: "Nombre del equipo",
      fields: [{ kind: "text", name: "name", label: "Nombre", maxLength: 60, required: true }],
      initial: { name: team.name },
      onSave: (v) => saveTeam({ name: v.name }),
    },
    category: {
      title: "Categoría",
      fields: [
        { kind: "select", name: "category", label: "Categoría", options: toOptions(CATEGORY_LABELS), required: true },
      ],
      initial: { category: season.category },
      onSave: (v) => saveSeason({ category: v.category as Category }),
    },
    modality: {
      title: "Modalidad",
      fields: [
        { kind: "select", name: "modality", label: "Modalidad", options: toOptions(MODALITY_LABELS), required: true },
      ],
      initial: { modality: season.modality },
      onSave: (v) => saveSeason({ modality: v.modality as Modality }),
    },
    startYear: {
      title: "Temporada",
      description: "Año en que empieza la temporada: 2026 es la temporada 2026/2027.",
      fields: [
        { kind: "text", name: "startYear", label: "Año de inicio", type: "number", min: 2000, max: 2100, required: true },
      ],
      initial: { startYear: String(season.startYear) },
      onSave: (v) => saveSeason({ startYear: Number(v.startYear) }),
    },
    matchDuration: {
      title: "Duración del partido",
      fields: [
        { kind: "text", name: "matchDuration", label: "Minutos", type: "number", min: 10, max: 120, required: true },
      ],
      initial: { matchDuration: String(season.matchDuration) },
      onSave: (v) => saveSeason({ matchDuration: Number(v.matchDuration) }),
    },
    division: {
      title: "Competición",
      description: "El nombre de la liga en la que juega el equipo.",
      fields: [{ kind: "text", name: "division", label: "Liga", maxLength: 120, required: true }],
      initial: { division: season.division },
      onSave: (v) => saveSeason({ division: v.division }),
    },
    colors: {
      title: "Colores del equipo",
      fields: [
        { kind: "color", name: "primaryColor", label: "Color principal" },
        { kind: "color", name: "secondaryColor", label: "Color secundario" },
      ],
      initial: { primaryColor: team.primaryColor, secondaryColor: team.secondaryColor },
      onSave: (v) => saveTeam({ primaryColor: v.primaryColor, secondaryColor: v.secondaryColor }),
    },
    country: {
      title: "País",
      fields: [
        { kind: "select", name: "country", label: "País", options: COUNTRY_OPTIONS, emptyLabel: "Sin indicar" },
      ],
      initial: { country: team.country ?? "" },
      onSave: (v) => saveTeam({ country: v.country }),
    },
    fieldLocation: {
      title: "Localidad",
      fields: [{ kind: "text", name: "fieldLocation", label: "Localidad", maxLength: 200 }],
      initial: { fieldLocation: team.fieldLocation ?? "" },
      onSave: (v) => saveTeam({ fieldLocation: v.fieldLocation.trim() }),
    },
    fieldName: {
      title: "Campo",
      fields: [{ kind: "text", name: "fieldName", label: "Nombre del campo", maxLength: 120, required: true }],
      initial: { fieldName: team.fieldName },
      onSave: (v) => saveTeam({ fieldName: v.fieldName }),
    },
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      {/* Cabecera: escudo, nombre y datos de la temporada */}
      <div className="flex flex-col items-center text-center">
        {team.badgeUrl ? (
          <img
            src={team.badgeUrl}
            alt={`Escudo de ${team.name}`}
            className="h-24 w-24 rounded-full border-4 object-cover"
            style={{ borderColor: team.primaryColor }}
          />
        ) : (
          // Sin escudo subido, un escudo genérico dentro de un círculo con el color del equipo
          <span
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 bg-gray-50"
            style={{ borderColor: team.primaryColor }}
          >
            <DefaultBadge className="h-14 w-14" />
          </span>
        )}
        <h1 className="mt-3 text-xl font-bold">{team.name}</h1>
        <p className="text-sm text-gray-600">
          {MODALITY_LABELS[season.modality]} · {CATEGORY_LABELS[season.category]} ·{" "}
          {seasonLabel(season.startYear)}
        </p>
      </div>

      {!canEdit && (
        <p className="mt-4 rounded bg-gray-50 p-3 text-sm text-gray-600">
          Solo el entrenador principal puede cambiar los ajustes del club.
        </p>
      )}

      <SettingsGroup title="Equipo">
        <SettingsRow label="Nombre" value={team.name} onClick={open("name")} />
        <SettingsRow
          label="Categoría"
          value={CATEGORY_LABELS[season.category]}
          onClick={open("category")}
          locked={canEdit && structureLocked}
          hint={lockHint}
        />
        <SettingsRow
          label="Modalidad"
          value={MODALITY_LABELS[season.modality]}
          onClick={open("modality")}
          locked={canEdit && structureLocked}
          hint={lockHint}
        />
        <SettingsRow label="Temporada" value={seasonLabel(season.startYear)} onClick={open("startYear")} />
        <SettingsRow
          label="Duración del partido"
          value={`${season.matchDuration} min`}
          onClick={open("matchDuration")}
        />
        <SettingsRow label="Competición" value={season.division} onClick={open("division")} />
      </SettingsGroup>

      <SettingsGroup title="Colores">
        <SettingsRow
          label="Colores del equipo"
          value={
            <span className="flex items-center gap-2">
              <span
                aria-label={`Color principal ${team.primaryColor}`}
                className="h-5 w-5 rounded-full border border-gray-300"
                style={{ backgroundColor: team.primaryColor }}
              />
              <span
                aria-label={`Color secundario ${team.secondaryColor}`}
                className="h-5 w-5 rounded-full border border-gray-300"
                style={{ backgroundColor: team.secondaryColor }}
              />
            </span>
          }
          onClick={open("colors")}
        />
      </SettingsGroup>

      <SettingsGroup title="Ubicación">
        <SettingsRow
          label="País"
          value={
            team.country ? (
              <span className="flex items-center gap-2">
                <Flag code={team.country} /> {countryName(team.country)}
              </span>
            ) : (
              "Sin indicar"
            )
          }
          onClick={open("country")}
        />
        <SettingsRow
          label="Localidad"
          value={team.fieldLocation || "Sin indicar"}
          onClick={open("fieldLocation")}
        />
        <SettingsRow label="Campo" value={team.fieldName} onClick={open("fieldName")} />
      </SettingsGroup>

      <SettingsGroup title="Miembros">
        {members.isPending && <p className="px-4 py-3 text-sm text-gray-600">Cargando...</p>}
        {members.isError && (
          <p className="px-4 py-3 text-sm text-red-600">No se han podido cargar los miembros.</p>
        )}
        {members.data?.map((member) => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={member.name} surname={member.surname} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {member.name} {member.surname}
                {member.isYou && <span className="font-normal text-gray-500"> (tú)</span>}
              </p>
              {member.email && <p className="truncate text-xs text-gray-500">{member.email}</p>}
            </div>
            <span className="shrink-0 text-sm text-gray-600">{ROLE_LABELS[member.role]}</span>
          </div>
        ))}
        {/* Las invitaciones llegarán más adelante */}
        <div className="px-4 py-3">
          <button
            type="button"
            disabled
            title="Próximamente"
            className="w-full rounded border border-gray-300 py-2 text-sm disabled:opacity-50"
          >
            Invitar a un miembro (próximamente)
          </button>
        </div>
      </SettingsGroup>

      {modal && <FieldsModal key={modal} {...configs[modal]} onClose={() => setModal(null)} />}
    </main>
  );
}

export default ClubSettingsPage;
