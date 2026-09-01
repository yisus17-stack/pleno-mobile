import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GoogleSignin, User } from "@react-native-google-signin/google-signin";
import { useQuery } from "convex/react";

import { configureGoogleSignIn } from "@/features/auth/google";
import { profilesApi, UserProfile } from "@/features/profiles/api";

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
  const [hasResolvedInitialRoute, setHasResolvedInitialRoute] = useState(false);
  const shouldResolveRedirectRef = useRef(true);
  const profile = useQuery(
    profilesApi.getProfile,
    user ? { userId: user.id } : "skip"
  ) as UserProfile | null | undefined;
  const isProfileLoading = user !== null && profile === undefined;

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      configureGoogleSignIn();

      try {
        if (!GoogleSignin.hasPreviousSignIn()) return;

        const response = await GoogleSignin.signInSilently();
        if (isMounted && response.type === "success") {
          shouldResolveRedirectRef.current = true;
          setUser(response.data.user);
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

  useEffect(() => {
    if (!user || profile === undefined || !shouldResolveRedirectRef.current) return;

    setPendingRedirect(profile ? "/(app)/(tabs)" : "/welcome");
    setHasResolvedInitialRoute(true);
    shouldResolveRedirectRef.current = false;
  }, [profile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: isLoading || isProfileLoading || (user !== null && !hasResolvedInitialRoute),
      isAuthenticated: user !== null,
      pendingRedirect,
      setAuthenticatedUser: (authenticatedUser) => {
        shouldResolveRedirectRef.current = true;
        setUser(authenticatedUser);
        setPendingRedirect(null);
        setHasResolvedInitialRoute(false);
      },
      clearAuthenticatedUser: () => {
        shouldResolveRedirectRef.current = true;
        setUser(null);
        setPendingRedirect(null);
        setHasResolvedInitialRoute(false);
      },
      consumePendingRedirect: () => setPendingRedirect(null),
    }),
    [hasResolvedInitialRoute, isLoading, isProfileLoading, pendingRedirect, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
