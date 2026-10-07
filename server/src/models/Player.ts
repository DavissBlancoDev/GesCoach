import { Schema, model, Model, Types } from "mongoose";
import { calculateAge } from "../utils/dates";

export const SALARY_PERIODS = ["monthly", "yearly"] as const;

// Contacto de un tutor del jugador
interface IGuardian {
  name: string;
  relationship: string; // texto libre: madre, padre, tutor...
  phone?: string;
  email?: string;
}

// Contrato del jugador. Todo el bloque es opcional.
interface IContract {
  startDate?: Date;
  endDate: Date;
  salary?: number; // importe en euros
  salaryPeriod?: (typeof SALARY_PERIODS)[number];
}

interface IPlayer {
  team: Types.ObjectId;
  name: string;
  surname: string;
  nickname?: string; // nombre futbolístico, el que sale en convocatorias
  birthDate: Date;
  nationality?: string; // código de país de 2 letras, por ejemplo "ES"
  guardians: IGuardian[];
  contract?: IContract;
}

// Campos calculados que no se guardan en la base de datos
interface IPlayerVirtuals {
  age: number;
}

type PlayerModel = Model<IPlayer, {}, {}, IPlayerVirtuals>;

// _id: false porque estos subdocumentos no necesitan identificador propio
const guardianSchema = new Schema<IGuardian>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    relationship: { type: String, required: true, trim: true, maxlength: 40 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  },
  { _id: false }
);

const contractSchema = new Schema<IContract>(
  {
    startDate: { type: Date },
    endDate: { type: Date, required: true },
    salary: { type: Number, min: 0 },
    salaryPeriod: { type: String, enum: SALARY_PERIODS },
  },
  { _id: false }
);

/**
 * Jugador como PERSONA: datos estables que no cambian al cambiar de
 * temporada. Lo que depende de la temporada (ficha, dorsal, posiciones,
 * estado) vive en PlayerSeason.
 */
const playerSchema = new Schema<IPlayer, PlayerModel, {}, {}, IPlayerVirtuals>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    surname: { type: String, required: true, trim: true, maxlength: 100 },
    nickname: { type: String, trim: true, maxlength: 40 },
    birthDate: { type: Date, required: true },
    nationality: { type: String, uppercase: true, trim: true, minlength: 2, maxlength: 2 },
    guardians: { type: [guardianSchema], default: [] },
    contract: { type: contractSchema },
  },
  { timestamps: true }
);

// La edad se calcula a partir de la fecha de nacimiento, no se guarda
playerSchema.virtual("age").get(function () {
  return calculateAge(this.birthDate);
});

export const Player = model<IPlayer, PlayerModel>("Player", playerSchema);