import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  const secret = process.env.JWT_SECRET;

  if (!token || !secret) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string" || !payload.sub) {
      return res.status(401).json({ error: "Sesión no válida" });
    }
    res.locals.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Sesión no válida o caducada" });
  }
}