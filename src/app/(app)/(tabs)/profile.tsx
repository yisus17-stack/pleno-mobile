import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { Screen } from "@/components/layout";
import { AppText, Button, Card } from "@/components/ui";
import { colors, spacing } from "@/theme";
import { configureGoogleSignIn } from "@/features/auth/google";

configureGoogleSignIn();

export default function ProfileScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const googleUser = GoogleSignin.getCurrentUser()?.user;
  const name = googleUser?.name || googleUser?.email.split("@")[0] || "Usuario";
  const initial = name.charAt(0).toUpperCase();

  const signOut = async () => {
    setIsSigningOut(true);

    try {
      await GoogleSignin.signOut();
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
        <AppText variant="h1">Tu perfil</AppText>
        <AppText color={colors.textSecondary} style={styles.subtitle}>
          Tu cuenta y el acceso a PLENO.
        </AppText>

        <Card style={styles.profileCard}>
          {googleUser?.photo ? (
            <Image source={{ uri: googleUser.photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <AppText variant="h2" color={colors.white} style={styles.initial}>
                {initial}
              </AppText>
            </View>
          )}
          <View style={styles.profileDetails}>
            <AppText variant="h3" numberOfLines={1}>{name}</AppText>
            <AppText color={colors.textSecondary} numberOfLines={1}>
              {googleUser?.email || "Cuenta de Google"}
            </AppText>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.statusDot} />
          <View style={styles.infoText}>
            <AppText variant="h3">Google conectado</AppText>
            <AppText color={colors.textSecondary} style={styles.description}>
              Tu cuenta está lista para organizar tus tareas y vincular Classroom cuando quieras.
            </AppText>
          </View>
        </Card>

        <View style={styles.signOutContainer}>
          <Button
            title="Cerrar sesión"
            variant="ghost"
            loading={isSigningOut}
            onPress={confirmSignOut}
            style={styles.signOutButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  subtitle: { marginTop: spacing.sm },
  profileCard: {
    marginTop: spacing.xl,
    alignItems: "center",
    flexDirection: "row",
  },
  avatar: { width: 68, height: 68, borderRadius: 34 },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  initial: { fontWeight: "700" },
  profileDetails: { flex: 1, marginLeft: spacing.md, gap: spacing.xs },
  infoCard: { marginTop: spacing.lg, flexDirection: "row" },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: spacing.md,
    backgroundColor: colors.success,
  },
  infoText: { flex: 1 },
  description: { marginTop: spacing.xs, lineHeight: 21 },
  signOutContainer: { flex: 1, justifyContent: "flex-end", paddingTop: spacing.xxxl },
  signOutButton: { borderWidth: 1, borderColor: colors.border },
});
