import { api } from "./client";
import type { User } from "./auth";

/** Cambia el nombre, los apellidos y/o la fecha de nacimiento (AAAA-MM-DD). */
export const updateProfile = (data: { name?: string; surname?: string; birthDate?: string }) =>
  api<User>("/account/profile", { method: "PATCH", body: JSON.stringify(data) });

/** Cambia el correo electrónico. Pide la contraseña actual para confirmar. */
export const updateEmail = (data: { email: string; password: string }) =>
  api<User>("/account/email", { method: "PATCH", body: JSON.stringify(data) });

/** Cambia la contraseña, comprobando antes la actual. */
export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api<void>("/account/password", { method: "PUT", body: JSON.stringify(data) });
