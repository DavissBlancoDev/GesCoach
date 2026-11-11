import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, type RegisterData } from "../api/auth";
import { getFieldErrors } from "../api/client";
import { useSession } from "../hooks/useSession";
import FormField from "../components/FormField";
import DateSelect from "../components/DateSelect";
import AuthLayout from "../components/AuthLayout";

const currentYear = new Date().getFullYear();
function RegisterPage() {
  const [form, setForm] = useState<RegisterData>({
    email: "",
    password: "",
    name: "",
    surname: "",
    birthDate: "",
    locale: "es",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const mutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      await register(data);
      return login({ email: data.email, password: data.password });
    },
    onSuccess: (loggedUser) => {
      queryClient.setQueryData(["session"], loggedUser);
      navigate("/inicio", { replace: true });
    },
  });
  if (user) return <Navigate to="/" replace />;
  const fieldErrors = getFieldErrors(mutation.error);
  const firstError = (field: string) => fieldErrors[field]?.[0];
  function update(field: keyof RegisterData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }
  return (
    <AuthLayout
      eyebrow="Empieza hoy"
      title="Crea tu cuenta"
      description="Configura tu perfil y prepara GesCoach para trabajar con tu equipo desde el primer día."
      footer={
        <p className="text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="font-semibold text-green-700 transition hover:text-green-800"
          >
            Inicia sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="name"
          label="Nombre"
          autoComplete="given-name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={firstError("name")}
          required
        />
        <FormField
          id="surname"
          label="Apellidos"
          autoComplete="family-name"
          value={form.surname}
          onChange={(e) => update("surname", e.target.value)}
          error={firstError("surname")}
          required
        />
        <DateSelect
          id="birthDate"
          label="Fecha de nacimiento"
          value={form.birthDate}
          onChange={(value) => update("birthDate", value)}
          minYear={currentYear - 90}
          maxYear={currentYear - 16}
          error={firstError("birthDate")}
          required
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={firstError("email")}
          required
        />
        <FormField
          id="password"
          label="Contraseña (mínimo 8 caracteres)"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          error={firstError("password")}
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
          {mutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
}
export default RegisterPage;
