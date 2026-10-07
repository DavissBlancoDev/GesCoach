/**
 * Edad en años cumplidos a fecha de hoy.
 * Usa UTC para que el resultado no dependa de la zona horaria del servidor.
 */
export function calculateAge(birthDate: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = today.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
}

/**
 * Años que faltan hasta una fecha, con un decimal (por ejemplo 1.5).
 * Si la fecha ya ha pasado devuelve 0.
 */
export function yearsUntil(date: Date, today = new Date()): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const years = (date.getTime() - today.getTime()) / msPerYear;
  return years > 0 ? Math.round(years * 10) / 10 : 0;
}