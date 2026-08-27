import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { GoogleSignin, User } from "@react-native-google-signin/google-signin";

import { configureGoogleSignIn } from "@/features/auth/google";
import { hasCompletedOnboarding } from "@/features/auth/onboarding";

type GoogleUser = User["user"];
type AuthRedirect = "/welcome" | "/(app)/(tabs)";

interface AuthContextValue {
  user: GoogleUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingRedirect: AuthRedirect | null;
  setAuthenticatedUser: (user: GoogleUser) => void;
  clearAuthenticatedUser: () => void;
  consumePendingRedirect: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState<AuthRedirect | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      configureGoogleSignIn();

      try {
        if (!GoogleSignin.hasPreviousSignIn()) return;

        const response = await GoogleSignin.signInSilently();
        if (isMounted && response.type === "success") {
          setUser(response.data.user);
          const hasCompleted = await hasCompletedOnboarding(response.data.user.id);
          if (isMounted && !hasCompleted) setPendingRedirect("/welcome");
        }
      } catch {
        // If the native Google session is no longer valid, show the login screen.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      pendingRedirect,
      setAuthenticatedUser: (authenticatedUser) => {
        setUser(authenticatedUser);
        void hasCompletedOnboarding(authenticatedUser.id).then((hasCompleted) => {
          setPendingRedirect(hasCompleted ? "/(app)/(tabs)" : "/welcome");
        });
      },
      clearAuthenticatedUser: () => {
        setUser(null);
        setPendingRedirect(null);
      },
      consumePendingRedirect: () => setPendingRedirect(null),
    }),
    [isLoading, pendingRedirect, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
