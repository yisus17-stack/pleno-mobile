import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useMutation, useQuery } from "convex/react";
import Svg, { Path } from "react-native-svg";

import { api } from "@convex/_generated/api";
import GoogleClassroomIcon from "@/assets/icons/google-classroom.svg";
import GoogleIcon from "@/assets/icons/google.png";
import ProfileImage from "@/assets/images/perfil_image.png";
import { Screen } from "@/components/layout";
import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFeedback } from "@/components/feedback";
import { classroomScopes, configureGoogleSignIn } from "@/features/auth/google";
import { syncClassroomTasks } from "@/features/classroom/api";
import { getClassroomErrorMessage } from "@/features/classroom/errors";

configureGoogleSignIn();

type ClassroomConnection = {
  classroomConnectedAt?: number;
  classroomEnabled?: boolean;
  lastSyncedAt?: number;
  name?: string;
  picture?: string;
};

// Las funciones ya están desplegadas en Convex; el código generado local aún no las tipa.
const usersApi = (api as unknown as {
  users: {
    getUserByGoogleId: any;
    setClassroomEnabled: any;
  };
}).users;

function LinkIcon() {
  return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M10.2 13.8a4.5 4.5 0 0 0 6.36.04l2.1-2.1a4.5 4.5 0 0 0-6.36-6.36l-1.2 1.2" stroke={colors.white} strokeWidth={2.2} strokeLinecap="round" /><Path d="M13.8 10.2a4.5 4.5 0 0 0-6.36-.04l-2.1 2.1a4.5 4.5 0 0 0 6.36 6.36l1.2-1.2" stroke={colors.white} strokeWidth={2.2} strokeLinecap="round" /></Svg>;
}

function CheckIcon() {
  return <Svg width={21} height={21} viewBox="0 0 24 24" fill="none"><Path d="m5 12.5 4.25 4.25L19.5 6.5" stroke={colors.success} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function SignOutIcon() {
  return <Svg width={29} height={29} viewBox="0 0 24 24" fill="none"><Path d="M10 5H6.75A1.75 1.75 0 0 0 5 6.75v10.5C5 18.22 5.78 19 6.75 19H10" stroke={colors.danger} strokeWidth={1.9} strokeLinecap="round" /><Path d="M13 8l4 4-4 4M17 12H9" stroke={colors.danger} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function ArrowIcon() {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="m9 6 6 6-6 6" stroke={colors.danger} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function formatLastSyncedAt(timestamp?: number) {
  if (!timestamp) return "Aún no has actualizado tus tareas.";

  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return isToday
    ? `Última actualización: hoy a las ${time}`
    : `Última actualización: ${date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${time}`;
}

function formatProfileName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("es-MX")}${part.slice(1).toLocaleLowerCase("es-MX")}`)
    .join(" ");
}

export default function ProfileScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLinkingClassroom, setIsLinkingClassroom] = useState(false);
  const { clearAuthenticatedUser, user: authenticatedUser } = useAuth();
  const { showDialog, showToast } = useFeedback();
  const classroomUser = useQuery(
    usersApi.getUserByGoogleId,
    authenticatedUser ? { googleId: authenticatedUser.id } : "skip"
  ) as ClassroomConnection | null | undefined;
  const setClassroomEnabled = useMutation(usersApi.setClassroomEnabled);
  const nativeGoogleUser = GoogleSignin.getCurrentUser()?.user;
  const googleUser = authenticatedUser || nativeGoogleUser;
  const name = formatProfileName(googleUser?.name || classroomUser?.name || googleUser?.email.split("@")[0] || "Usuario");
  const initial = name.charAt(0).toUpperCase();
  const profilePicture = authenticatedUser?.photo || nativeGoogleUser?.photo || classroomUser?.picture;
  const isClassroomLinked = classroomUser?.classroomEnabled === true;
  const isClassroomStatusLoading = Boolean(authenticatedUser) && classroomUser === undefined;

  const linkClassroom = async () => {
    if (!authenticatedUser) {
      showToast({ type: "error", title: "Sesión no disponible", message: "Inicia sesión de nuevo para vincular Classroom." });
      return;
    }
    setIsLinkingClassroom(true);
    try {
      const authorization = await GoogleSignin.addScopes({ scopes: classroomScopes });
      if (!authorization || authorization.type === "cancelled") return;
      const { accessToken } = await GoogleSignin.getTokens();
      const result = await syncClassroomTasks(accessToken);
      await setClassroomEnabled({ userId: authenticatedUser.id, enabled: true });
      showToast({ type: "success", title: "Classroom vinculado", message: result.totalSynced === 1 ? "Importamos 1 tarea." : typeof result.totalSynced === "number" ? `Importamos ${result.totalSynced} tareas.` : "Tus tareas se sincronizaron correctamente." });
    } catch (error) {
      showToast({ type: "error", title: "No se pudo vincular Classroom", message: getClassroomErrorMessage(error, "link") });
    } finally {
      setIsLinkingClassroom(false);
    }
  };

  const disconnectClassroom = () => showDialog({
    type: "warning",
    title: "¿Desconectar Classroom?",
    message: "Dejarás de sincronizar tareas de Google Classroom automáticamente.",
    actions: [
      { label: "Cancelar" },
      {
        label: "Desconectar",
        variant: "destructive",
        onPress: () => {
          void (async () => {
            if (!authenticatedUser) return;
            setIsLinkingClassroom(true);
            try {
              await setClassroomEnabled({ userId: authenticatedUser.id, enabled: false });
              showToast({ type: "success", title: "Classroom desconectado", message: "Ya no sincronizaremos tareas automáticamente." });
            } catch (error) {
              showToast({ type: "error", title: "No se pudo desconectar Classroom", message: getClassroomErrorMessage(error, "disconnect") });
            } finally {
              setIsLinkingClassroom(false);
            }
          })();
        },
      },
    ],
  });

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await GoogleSignin.signOut();
      clearAuthenticatedUser();
      router.replace("/login");
    } catch (error) {
      showToast({ type: "error", title: "No se pudo cerrar sesión", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
      setIsSigningOut(false);
    }
  };

  const confirmSignOut = () => showDialog({
    type: "warning",
    title: "¿Cerrar sesión?",
    message: "Tendrás que iniciar sesión de nuevo para entrar a PLENO.",
    actions: [{ label: "Cancelar" }, { label: "Cerrar sesión", variant: "destructive", onPress: signOut }],
  });

  return (
    <Screen padded={false} safeAreaColor={colors.accent}>
      <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <AppText color={colors.text} style={styles.heroTitle}>Mi perfil</AppText>
            <AppText color={colors.text} style={styles.heroSubtitle}>Administra tu cuenta{"\n"}y conexiones</AppText>
          </View>
          <Image source={ProfileImage} resizeMode="contain" style={styles.heroImage} />
          <Svg height={126} preserveAspectRatio="none" style={styles.heroWave} viewBox="0 0 390 126" width="100%"><Path d="M0 92C77 93 128 20 210 20c80 0 116 71 180 72v34H0V92Z" fill={colors.background} /></Svg>
        </View>

        <View style={styles.profileBody}>
          <View style={styles.avatarArea}>
            {profilePicture ? <Image source={{ uri: profilePicture }} style={styles.avatar} /> : <View style={styles.avatarFallback}><AppText color={colors.white} style={styles.initial}>{initial}</AppText></View>}
          </View>
          <AppText numberOfLines={1} style={styles.profileName}>{name}</AppText>
          <AppText color={colors.text} numberOfLines={1} style={styles.email}>{googleUser?.email || "Cuenta de Google"}</AppText>
          <View style={styles.googleStatus}>
            <Image source={GoogleIcon} resizeMode="contain" style={styles.googleIcon} />
            <AppText color={colors.text} style={styles.statusLabel}>Conectado con Google</AppText>

          </View>

          <AppText color={colors.textMuted} style={styles.sectionTitle}>INTEGRACIONES</AppText>
          <View style={styles.classroomCard}>
            <View style={styles.classroomTopRow}>
              <View style={styles.classroomIcon}><GoogleClassroomIcon height={36} width={41} /></View>
              <View style={styles.connectionStatus}><View style={[styles.connectionDot, isClassroomLinked && styles.connectionDotLinked]} /><AppText color={isClassroomStatusLoading ? colors.textMuted : isClassroomLinked ? colors.success : colors.primary} style={styles.connectionText}>{isClassroomStatusLoading ? "Verificando..." : isClassroomLinked ? "Vinculado" : "Sin vincular"}</AppText></View>
            </View>
            <View style={styles.settingDetails}>
              <AppText style={styles.classroomTitle}>Google Classroom</AppText>
              <AppText color={colors.textSecondary} style={styles.settingDescription}>Vincula tu cuenta para sincronizar tus cursos, tareas y próximos pendientes automáticamente.</AppText>
              {isClassroomLinked && <AppText color={colors.textSecondary} variant="caption" style={styles.lastSyncText}>{formatLastSyncedAt(classroomUser?.lastSyncedAt)}</AppText>}
            </View>
            <Pressable accessibilityLabel={isClassroomLinked ? "Desconectar Google Classroom" : "Conectar Google Classroom"} accessibilityRole="button" disabled={isLinkingClassroom} onPress={() => isClassroomLinked ? disconnectClassroom() : void linkClassroom()} style={({ pressed }) => [styles.connectClassroomButton, isClassroomLinked && styles.disconnectClassroomButton, pressed && styles.pressed, isLinkingClassroom && styles.disabled]}>
              {isLinkingClassroom ? <ActivityIndicator color={colors.white} size="small" /> : <><LinkIcon /><AppText color={colors.white} style={styles.connectClassroomButtonText}>{isClassroomLinked ? "Desconectar Classroom" : "Conectar Classroom"}</AppText></>}
            </Pressable>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/preferences?mode=edit")} style={({ pressed }) => [styles.plannerProfileRow, pressed && styles.pressed]}>
            <View style={styles.plannerProfileCopy}>
              <AppText style={styles.plannerProfileTitle}>Tu planificación</AppText>
              <AppText color={colors.textSecondary} variant="bodySmall" style={styles.plannerProfileDescription}>Disponibilidad, energía y ritmo de trabajo</AppText>
              <AppText color={colors.primary} style={styles.plannerProfileAction}>Editar</AppText>
            </View>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={isSigningOut} onPress={confirmSignOut} style={({ pressed }) => [styles.signOutRow, pressed && styles.pressed, isSigningOut && styles.disabled]}>
            <SignOutIcon /><AppText color={colors.danger} style={styles.signOutLabel}>{isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}</AppText><View style={styles.signOutArrow}><ArrowIcon /></View>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, flexGrow: 1, paddingBottom: spacing.xxl },
  hero: { backgroundColor: colors.accent, height: 320, overflow: "hidden", position: "relative" },
  heroCopy: { left: spacing.xl, position: "absolute", top: 64, zIndex: 2 },
  heroTitle: { fontSize:32, fontWeight: "700", letterSpacing: -1.2, lineHeight: 46, marginTop:-24 },
  heroSubtitle: { fontSize: 18, lineHeight: 28,  color: colors.text },
  heroImage: { height: 230, position: "absolute", right: -60, top: 40, width: 230 },
  heroWave: { bottom: -1, left: 0, position: "absolute", right: 0 },
  profileBody: { alignItems: "center", marginTop: -170, paddingHorizontal: spacing.xl, zIndex: 3 },
  avatarArea: { height: 108, width: 108 },
  avatar: { backgroundColor: colors.white, borderRadius: 54, height: 108, width: 108 },
  avatarFallback: { alignItems: "center", backgroundColor: "#2F661B", borderColor: colors.primary, borderRadius: 54, borderWidth: 4, height: 108, justifyContent: "center", width: 108 },
  initial: { fontSize: 38, fontWeight: "600" },
  profileName: { fontSize: 31, fontWeight: "700", letterSpacing: -0.65, lineHeight: 38, marginTop: spacing.lg, textAlign: "center" },
  email: { fontSize: 17, lineHeight: 24, marginTop: 3, textAlign: "center" },
  googleStatus: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, maxWidth: "100%", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  googleIcon: { height: 18, width: 18 },
  statusLabel: { fontSize: 15, fontWeight: "500" },
  sectionTitle: { alignSelf: "flex-start", fontSize: 13, fontWeight: "800", letterSpacing: 1.2, marginTop: spacing.xl },
  classroomCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, marginTop: spacing.md, padding: spacing.xl, width: "100%" },
  classroomTopRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  classroomIcon: { height: 36, width: 41 },
  settingDetails: { minWidth: 0, width: "100%" },
  classroomTitle: { fontSize: 21, fontWeight: "700", lineHeight: 27, marginTop: spacing.lg },
  settingDescription: { fontSize: 16, lineHeight: 24, marginTop: 5, textAlign: "justify" },
  lastSyncText: { lineHeight: 18, marginTop: spacing.sm },
  connectionStatus: { alignItems: "center", flexDirection: "row", flexShrink: 1 },
  connectionDot: { backgroundColor: colors.primary, borderRadius: radius.full, height: 10, marginRight: spacing.sm, width: 10 },
  connectionDotLinked: { backgroundColor: colors.success },
  connectionText: { fontSize: 16, fontWeight: "700" },
  connectClassroomButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: "row", gap: spacing.sm, height: 56, justifyContent: "center", marginTop: spacing.xl, paddingHorizontal: spacing.md },
  disconnectClassroomButton: { backgroundColor: colors.danger },
  connectClassroomButtonText: { fontSize: 18, fontWeight: "700" },
  plannerProfileRow: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, marginTop: spacing.xl, minHeight: 76, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, width: "100%" },
  plannerProfileCopy: { minWidth: 0 },
  plannerProfileTitle: { fontSize: 17, fontWeight: "700" },
  plannerProfileDescription: { marginTop: 3 },
  plannerProfileAction: { fontSize: 15, fontWeight: "700", marginTop: spacing.sm },
  signOutRow: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", marginTop: spacing.xl, minHeight: 78, paddingHorizontal: spacing.lg, width: "100%" },
  signOutLabel: { fontSize: 18, fontWeight: "700", marginLeft: spacing.md },
  signOutArrow: { marginLeft: "auto" },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.55 },
});
