import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth";
import { useSession } from "../hooks/useSession";
import FormField from "../components/FormField";
import AuthLayout from "../components/AuthLayout";

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
      navigate("/inicio", { replace: true });
    },
  });
  if (user) return <Navigate to="/" replace />;
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, password });
  }
  return (
    <AuthLayout
      eyebrow="Bienvenido de nuevo"
      title="Inicia sesión"
      description="Accede a tu espacio de trabajo y sigue llevando el control de tu equipo."
      footer={
        <p className="text-sm text-slate-500">
          ¿No tienes cuenta?{" "}
          <Link
            to="/registro"
            className="font-semibold text-green-700 transition hover:text-green-800"
          >
            Regístrate
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {mutation.error.message}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white shadow-lg shadow-green-700/20 transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </AuthLayout>
  );
}
export default LoginPage;
