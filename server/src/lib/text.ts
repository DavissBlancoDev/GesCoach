/**
 * Normaliza un nombre para compararlo: sin tildes, en minúsculas y con un
 * solo espacio entre palabras. Sirve para no duplicar un rival escrito de
 * formas ligeramente distintas ("C.D. Conxo" y "c.d.  conxo").
 */
export const normalizeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
