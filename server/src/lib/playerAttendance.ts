import mongoose, { type Types } from "mongoose";
import { Attendance } from "../models/Attendance";
import { Training } from "../models/Training";

/**
 * Asistencia de un jugador a los entrenos de una temporada, en números
 * absolutos. Los porcentajes se calculan al mostrarlos, para poder enseñar
 * también "23 de 25 entrenos".
 */
export interface PlayerAttendance {
  total: number; // entrenos con registro de este jugador
  present: number;
  justifiedAbsence: number;
  unjustifiedAbsence: number;
}

/** Jugador sin ningún entreno registrado. */
export const emptyAttendance = (): PlayerAttendance => ({
  total: 0,
  present: 0,
  justifiedAbsence: 0,
  unjustifiedAbsence: 0,
});

/**
 * Asistencia de varios jugadores a los entrenos de una temporada, en una
 * sola consulta. Devuelve un Map: identificador del jugador -> su asistencia.
 *
 * Solo cuentan los entrenos en los que el jugador tiene registro, así que
 * quien llega a mitad de temporada no cuenta los anteriores a su
 * incorporación. Los entrenos suspendidos no cuentan para nadie.
 */
export async function getSeasonAttendance(
  seasonId: Types.ObjectId,
  playerIds: string[]
): Promise<Map<string, PlayerAttendance>> {
  const result = new Map<string, PlayerAttendance>();
  if (playerIds.length === 0) return result;

  const rows = await Attendance.aggregate<{
    _id: { player: Types.ObjectId; status: string };
    n: number;
  }>([
    { $match: { player: { $in: playerIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    {
      $lookup: {
        from: Training.collection.name,
        localField: "training",
        foreignField: "_id",
        as: "trainingDoc",
      },
    },
    { $unwind: "$trainingDoc" },
    { $match: { "trainingDoc.season": seasonId, "trainingDoc.status": { $ne: "cancelled" } } },
    { $group: { _id: { player: "$player", status: "$status" }, n: { $sum: 1 } } },
  ]);

  for (const row of rows) {
    const key = row._id.player.toString();
    const entry = result.get(key) ?? emptyAttendance();
    if (row._id.status === "present") entry.present = row.n;
    else if (row._id.status === "justified_absence") entry.justifiedAbsence = row.n;
    else entry.unjustifiedAbsence = row.n;
    entry.total += row.n;
    result.set(key, entry);
  }
  return result;
}
