import { Schema, model, Types } from "mongoose";

// Los tres botones al pasar lista: verde, naranja y rojo
export const ATTENDANCE_STATUSES = ["present", "justified_absence", "unjustified_absence"] as const;

interface IAttendance {
  training: Types.ObjectId;
  player: Types.ObjectId;
  status: (typeof ATTENDANCE_STATUSES)[number];
}

/**
 * Asistencia de un jugador a un entreno. Hay un registro por jugador y
 * entreno. Los porcentajes de la ficha se calculan sobre los entrenos en
 * los que el jugador tiene registro, así que quien llega a mitad de
 * temporada no cuenta los entrenos anteriores a su incorporación.
 */
const attendanceSchema = new Schema<IAttendance>(
  {
    training: { type: Schema.Types.ObjectId, ref: "Training", required: true },
    player: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  },
  { timestamps: true }
);

// Un jugador solo tiene un registro por entreno
attendanceSchema.index({ training: 1, player: 1 }, { unique: true });
// Para calcular los porcentajes de un jugador
attendanceSchema.index({ player: 1 });

export const Attendance = model<IAttendance>("Attendance", attendanceSchema);
