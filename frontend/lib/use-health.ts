"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useApiHealth(): boolean {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 20_000,
    retry: 0,
  });
  return data?.status === "ok";
}
