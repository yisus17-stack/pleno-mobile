import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { colors } from "@/theme";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const {
    consumePendingRedirect,
    isAuthenticated,
    isLoading,
    pendingRedirect,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && pendingRedirect) {
      router.replace(pendingRedirect);
      consumePendingRedirect();
    }
  }, [consumePendingRedirect, isAuthenticated, isLoading, pendingRedirect, router]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" animated />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
});
