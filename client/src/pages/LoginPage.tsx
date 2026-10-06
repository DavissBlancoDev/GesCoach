import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth";
import { useSession } from "../hooks/useSession";
import FormField from "../components/FormField";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useSession();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (loggedUser) => {
      queryClient.setQueryData(["session"], loggedUser);
      navigate("/", { replace: true });
    },
  });

  if (user) return <Navigate to="/" replace />;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, password });
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FormField
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mutation.isError && (
          <p className="text-sm text-red-600">{mutation.error.message}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="text-green-700 underline">
          Regístrate
        </Link>
      </p>
    </main>
  );
}

export default LoginPage;