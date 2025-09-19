import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  displayName?: string;
  name?: string;
}

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ['/api/auth/user'],
    queryFn: getQueryFn<User | null>({ on401: 'returnNull' }),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}