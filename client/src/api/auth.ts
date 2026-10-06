import { api } from "./client";

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  birthDate?: string;
  age?: number;
  locale: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData extends LoginData {
  name: string;
  surname: string;
  birthDate: string; // AAAA-MM-DD
  locale?: string;
}

export const getMe = () => api<User>("/auth/me");

export const login = (data: LoginData) =>
  api<User>("/auth/login", { method: "POST", body: JSON.stringify(data) });

export const register = (data: RegisterData) =>
  api<User>("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const logout = () => api<void>("/auth/logout", { method: "POST" });