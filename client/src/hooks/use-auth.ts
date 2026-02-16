import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  firstNameEn: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  displayName: string | null;
  canApprove: boolean;
  canAddShortages: boolean;
  canApproveTrips: boolean;
  isSuspended: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  return response.json();
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["/api/auth/user"], null);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
