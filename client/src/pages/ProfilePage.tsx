import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { changePassword, updateEmail, updateProfile } from "../api/account";
import type { User } from "../api/auth";
import { useCurrentTeam } from "../hooks/useCurrentTeam";
import { useLogout } from "../hooks/useLogout";
import { useSession } from "../hooks/useSession";
import { ROLE_LABELS } from "../lib/teams";
import Avatar from "../components/Avatar";
import FieldsModal from "../components/FieldsModal";
import { SettingsGroup, SettingsRow } from "../components/SettingsList";

// Qué ventana está abierta, si hay alguna
type ModalName = "name" | "email" | "birthDate" | "password" | null;

const currentYear = new Date().getFullYear();

/** Fecha de nacimiento en texto largo. Se usa UTC porque se guarda a medianoche UTC. */
const formatBirthDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Mi perfil: la foto (iniciales), el nombre, el rol y el equipo, los datos de
 * la cuenta y la seguridad. Cada dato se cambia en una ventana emergente, y
 * abajo hay un botón grande para cerrar sesión.
 */
function ProfilePage() {
  const { data: user } = useSession();
  const { current } = useCurrentTeam();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalName>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user || !current?.team) return <p className="p-6">Cargando...</p>;

  const close = () => setModal(null);

  /** Guarda el usuario actualizado en la sesión, para que se vea en toda la aplicación. */
  const saveUser = (updated: User) => {
    queryClient.setQueryData(["session"], updated);
    setNotice(null);
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      {/* Cabecera: foto, nombre, rol y equipo */}
      <div className="flex flex-col items-center text-center">
        <Avatar name={user.name} surname={user.surname} size="lg" />
        <h1 className="mt-3 text-xl font-bold">
          {user.name} {user.surname}
        </h1>
        <p className="text-sm text-gray-600">
          {ROLE_LABELS[current.role]} · {current.team.name}
        </p>
      </div>

      {notice && <p className="mt-4 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      <SettingsGroup title="Cuenta">
        <SettingsRow
          label="Nombre"
          value={`${user.name} ${user.surname}`}
          onClick={() => setModal("name")}
        />
        <SettingsRow label="Correo electrónico" value={user.email} onClick={() => setModal("email")} />
        <SettingsRow
          label="Rol"
          value={ROLE_LABELS[current.role]}
          locked
          hint="El rol lo asigna el entrenador principal del equipo"
        />
        <SettingsRow
          label="Fecha de nacimiento"
          value={user.birthDate ? formatBirthDate(user.birthDate) : "Sin indicar"}
          onClick={() => setModal("birthDate")}
        />
      </SettingsGroup>

      <SettingsGroup title="Seguridad">
        {/* La contraseña nunca se muestra: solo asteriscos */}
        <SettingsRow label="Contraseña" value="••••••••" onClick={() => setModal("password")} />
      </SettingsGroup>

      <button
        type="button"
        onClick={() => logoutMutation.mutate()}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded border border-red-300 py-3 font-semibold text-red-600 hover:bg-red-50"
      >
        <span aria-hidden="true">🚪</span> Cerrar sesión
      </button>

      {modal === "name" && (
        <FieldsModal
          title="Cambiar nombre"
          fields={[
            { kind: "text", name: "name", label: "Nombre", autoComplete: "given-name", maxLength: 60, required: true },
            { kind: "text", name: "surname", label: "Apellidos", autoComplete: "family-name", maxLength: 100, required: true },
          ]}
          initial={{ name: user.name, surname: user.surname }}
          onSave={async (values) => saveUser(await updateProfile({ name: values.name, surname: values.surname }))}
          onClose={close}
        />
      )}

      {modal === "email" && (
        <FieldsModal
          title="Cambiar correo electrónico"
          description="Es el correo con el que inicias sesión. Para confirmar que eres tú, escribe también tu contraseña."
          fields={[
            { kind: "text", name: "email", label: "Correo nuevo", type: "email", autoComplete: "email", required: true },
            { kind: "text", name: "password", label: "Contraseña actual", type: "password", autoComplete: "current-password", required: true },
          ]}
          initial={{ email: user.email, password: "" }}
          onSave={async (values) => saveUser(await updateEmail({ email: values.email, password: values.password }))}
          onClose={close}
        />
      )}

      {modal === "birthDate" && (
        <FieldsModal
          title="Fecha de nacimiento"
          fields={[
            { kind: "date", name: "birthDate", label: "Fecha de nacimiento", minYear: currentYear - 90, maxYear: currentYear - 16, required: true },
          ]}
          initial={{ birthDate: user.birthDate ? user.birthDate.slice(0, 10) : "" }}
          onSave={async (values) => saveUser(await updateProfile({ birthDate: values.birthDate }))}
          onClose={close}
        />
      )}

      {modal === "password" && (
        <FieldsModal
          title="Cambiar contraseña"
          fields={[
            { kind: "text", name: "currentPassword", label: "Contraseña actual", type: "password", autoComplete: "current-password", required: true },
            { kind: "text", name: "newPassword", label: "Nueva contraseña (mínimo 8 caracteres)", type: "password", autoComplete: "new-password", required: true },
            { kind: "text", name: "repeatPassword", label: "Repite la nueva contraseña", type: "password", autoComplete: "new-password", required: true },
          ]}
          initial={{ currentPassword: "", newPassword: "", repeatPassword: "" }}
          submitLabel="Cambiar contraseña"
          validate={(values) => {
            if (values.newPassword.length < 8) return "La contraseña nueva debe tener al menos 8 caracteres";
            if (values.newPassword !== values.repeatPassword) return "Las contraseñas nuevas no coinciden";
            return null;
          }}
          onSave={async (values) => {
            await changePassword({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            });
            setNotice("Contraseña cambiada correctamente.");
          }}
          onClose={close}
        />
      )}
    </main>
  );
}

export default ProfilePage;
