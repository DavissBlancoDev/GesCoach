import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, type RegisterData } from "../api/auth";
import { getFieldErrors } from "../api/client";
import { useSession } from "../hooks/useSession";
import FormField from "../components/FormField";

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
      navigate("/", { replace: true });
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
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>
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
        <FormField
          id="birthDate"
          label="Fecha de nacimiento"
          type="date"
          autoComplete="bday"
          value={form.birthDate}
          onChange={(e) => update("birthDate", e.target.value)}
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
          <p className="text-sm text-red-600">{mutation.error.message}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-green-700 underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}

export default RegisterPage;