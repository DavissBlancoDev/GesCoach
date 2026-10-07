import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { useSession } from "../hooks/useSession";
import { useMyTeams } from "../hooks/useMyTeams";
import {
  CATEGORY_LABELS,
  MODALITY_LABELS,
  ROLE_LABELS,
  seasonLabel,
} from "../lib/teams";

function DashboardPage() {
  const { data: user } = useSession();
  const { data: teams } = useMyTeams();
  const queryClient = useQueryClient();

  // De momento trabajamos con el primer equipo del usuario
  const current = teams?.[0];

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["session"], null);
      // Quitamos los equipos de la caché para que no los vea otra persona
      // que inicie sesión después en el mismo navegador
      queryClient.removeQueries({ queryKey: ["teams"] });
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Hola, {user?.name}</h1>

      {current?.team && current.currentSeason && (
        <section className="mt-4 rounded border border-gray-200 p-4">
          <h2 className="text-lg font-semibold">{current.team.name}</h2>
          <p className="text-sm text-gray-600">
            {CATEGORY_LABELS[current.currentSeason.category]} ·{" "}
            {MODALITY_LABELS[current.currentSeason.modality]} · Temporada{" "}
            {seasonLabel(current.currentSeason.startYear)}
          </p>
          <p className="text-sm text-gray-600">{current.currentSeason.division}</p>
          <p className="mt-2 text-sm">Tu rol: {ROLE_LABELS[current.role]}</p>
        </section>
      )}

      <button
        className="mt-4 rounded bg-gray-800 px-4 py-2 text-white"
        onClick={() => logoutMutation.mutate()}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export default DashboardPage;