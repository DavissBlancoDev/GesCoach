import { useQuery } from "@tanstack/react-query";
import { getMe, type User } from "../api/auth";
import { ApiError } from "../api/client";

export function useSession() {
  return useQuery<User | null>({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await getMe();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}