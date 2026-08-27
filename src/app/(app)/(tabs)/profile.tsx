import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import GoogleClassroomIcon from "@/assets/icons/google-classroom.svg";
import GoogleIcon from "@/assets/icons/google.png";
import { Screen } from "@/components/layout";
import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";
import { useAuth } from "@/features/auth/AuthProvider";
import { configureGoogleSignIn } from "@/features/auth/google";

configureGoogleSignIn();

export default function ProfileScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { clearAuthenticatedUser, user: authenticatedUser } = useAuth();
  const googleUser = authenticatedUser || GoogleSignin.getCurrentUser()?.user;
  const name = googleUser?.name || googleUser?.email.split("@")[0] || "Usuario";
  const initial = name.charAt(0).toUpperCase();

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await GoogleSignin.signOut();
      clearAuthenticatedUser();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "No se pudo cerrar sesión",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
      setIsSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Cerrar sesión", "Tendrás que iniciar sesión de nuevo para entrar a PLENO.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar sesión", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="h1">Configuración</AppText>

        <View style={styles.accountRow}>
          <View style={styles.avatarArea}>
            {googleUser?.photo ? (
              <Image source={{ uri: googleUser.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <AppText variant="h2" color={colors.white} style={styles.initial}>
                  {initial}
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.accountDetails}>
            <AppText variant="h2" numberOfLines={1}>{name}</AppText>
            <AppText color={colors.textSecondary} style={styles.email} numberOfLines={1}>
              {googleUser?.email || "Cuenta de Google"}
            </AppText>
            <View style={styles.googleStatus}>
              <Image source={GoogleIcon} style={styles.googleIcon} resizeMode="contain" />
              <AppText variant="caption" color={colors.text} style={styles.statusLabel}>
                Conectado con Google
              </AppText>
            </View>
          </View>
        </View>

        <AppText variant="caption" color={colors.textMuted} style={styles.sectionTitle}>
          INTEGRACIONES
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Vincular Google Classroom"
          onPress={() => router.push("/classroom")}
          style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
        >
          <View style={styles.classroomIcon}>
            <GoogleClassroomIcon width={24} height={21} />
          </View>
          <View style={styles.settingDetails}>
            <AppText variant="h4">Google Classroom</AppText>
            <AppText color={colors.textSecondary} style={styles.settingDescription}>
              Importa cursos y tareas cuando quieras.
            </AppText>
          </View>
          <View style={styles.optionalBadge}>
            <AppText variant="caption" style={styles.optionalText}>Opcional</AppText>
          </View>
          <AppText color={colors.textMuted} style={styles.chevron}>›</AppText>
        </Pressable>

        <View style={styles.signOutContainer}>
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={confirmSignOut}
            style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed, isSigningOut && styles.disabled]}
          >
            <AppText color={colors.danger} style={styles.signOutIcon}>↪</AppText>
            <AppText color={colors.danger} style={styles.signOutLabel}>
              {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </AppText>
            <AppText color={colors.danger} style={styles.chevron}>›</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  accountRow: { marginTop: spacing.xl, alignItems: "center", flexDirection: "row" },
  avatarArea: { width: 84, height: 84, alignItems: "center", justifyContent: "center" },
  avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: colors.border },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.primary,
  },
  initial: { fontWeight: "700" },
  accountDetails: { flex: 1, marginLeft: spacing.md, gap: spacing.xs },
  email: { opacity: 0.86 },
  googleStatus: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  googleIcon: { width: 18, height: 18 },
  statusLabel: { fontWeight: "700" },
  sectionTitle: { marginTop: spacing.xxl, marginBottom: spacing.sm, fontWeight: "700", letterSpacing: 0.8 },
  settingRow: {
    minHeight: 88,
    padding: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  classroomIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  settingDetails: { flex: 1, marginLeft: spacing.md },
  settingDescription: { marginTop: 2, fontSize: 13 },
  optionalBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.lg,
    backgroundColor: "#FFF4C2",
  },
  optionalText: { color: "#8A6500", fontWeight: "700" },
  chevron: { marginLeft: spacing.sm, fontSize: 26, lineHeight: 28 },
  signOutContainer: { flex: 1, justifyContent: "flex-end", paddingTop: spacing.xxxl },
  signOutRow: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.lg,
    backgroundColor: "#FFF7F7",
  },
  signOutIcon: { marginRight: spacing.sm, fontSize: 22, fontWeight: "700" },
  signOutLabel: { flex: 1, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
