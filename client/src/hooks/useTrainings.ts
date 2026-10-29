import { useQuery } from "@tanstack/react-query";
import {
  getTraining,
  getTrainings,
  type Training,
  type TrainingDetail,
} from "../api/trainings";

/** Entrenos de la temporada actual. No consulta nada hasta que haya equipo. */
export function useTrainings(teamId: string | undefined) {
  return useQuery<Training[]>({
    queryKey: ["trainings", teamId],
    queryFn: () => getTrainings(teamId as string),
    enabled: Boolean(teamId),
  });
}

/** Un entreno con su lista de asistencia. */
export function useTraining(teamId: string | undefined, trainingId: string | undefined) {
  return useQuery<TrainingDetail>({
    queryKey: ["training", teamId, trainingId],
    queryFn: () => getTraining(teamId as string, trainingId as string),
    enabled: Boolean(teamId) && Boolean(trainingId),
  });
}
