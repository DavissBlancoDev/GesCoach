import { Schema, model, Model } from "mongoose";

export const LOCALES = ["es", "gl"] as const;

interface IUser {
  email: string;
  name: string;
  surname: string;
  birthDate: Date;
  locale: (typeof LOCALES)[number];
  passwordHash: string;
}

interface IUserVirtuals {
  age: number;
}

type UserModel = Model<IUser, {}, {}, IUserVirtuals>;

const userSchema = new Schema<IUser, UserModel, {}, {}, IUserVirtuals>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    surname: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    locale: { type: String, enum: LOCALES, default: "es" },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// La edad se calcula, no se guarda
userSchema.virtual("age").get(function () {
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - this.birthDate.getUTCFullYear();
  const mes = hoy.getUTCMonth() - this.birthDate.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < this.birthDate.getUTCDate())) {
    edad--;
  }
  return edad;
});

export const User = model<IUser, UserModel>("User", userSchema);