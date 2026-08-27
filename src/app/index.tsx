import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/AuthProvider";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return <Redirect href={isAuthenticated ? "/(app)/(tabs)" : "/login"} />;
}
