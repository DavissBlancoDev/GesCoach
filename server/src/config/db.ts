import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Falta la variable MONGODB_URI");
  }
  await mongoose.connect(uri);
  console.log("Conectado a MongoDB");
}