import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../api/auth";
import { useSession } from "../hooks/useSession";

function DashboardPage() {
  const { data: user } = useSession();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(["session"], null),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Hola, {user?.name}</h1>
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