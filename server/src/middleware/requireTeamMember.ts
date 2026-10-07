import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Membership } from "../models/Membership";

/**
 * Para rutas del tipo /api/teams/:teamId/...  Debe ir DESPUÉS de
 * requireAuth. Si el usuario no pertenece al equipo responde 404 (y no
 * 403) para no revelar si ese equipo existe.
 */
export async function requireTeamMember(req: Request, res: Response, next: NextFunction) {
  const { teamId } = req.params;

  if (!mongoose.isValidObjectId(teamId)) {
    return res.status(404).json({ error: "Equipo no encontrado" });
  }

  const membership = await Membership.findOne({ user: res.locals.userId, team: teamId });
  if (!membership) {
    return res.status(404).json({ error: "Equipo no encontrado" });
  }

  res.locals.role = membership.role;
  return next();
}