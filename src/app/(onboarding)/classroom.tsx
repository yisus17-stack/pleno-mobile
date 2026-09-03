import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { Screen } from "@/components/layout";
import { useFeedback } from "@/components/feedback";
import { AppText, Button } from "@/components/ui";
import PlenoLogoBlanco from "@/assets/brand/logo_pleno_blanco.svg";
import { colors, radius, spacing } from "@/theme";
import { useAuth } from "@/features/auth/AuthProvider";
import { classroomScopes } from "@/features/auth/google";
import { syncClassroomTasks } from "@/features/classroom/api";
import { getClassroomErrorMessage } from "@/features/classroom/errors";

export default function ClassroomScreen() {
  const { height, width } = useWindowDimensions();
  const [isLinking, setIsLinking] = useState(false);
  const { user } = useAuth();
  const { showToast } = useFeedback();
  const isCompactScreen = height < 720;
  const illustrationHeight = Math.min(312, Math.max(205, Math.round(height * 0.39)));
  const illustrationWidth = Math.min(Math.round(width * 0.9), 360);

  const continueToApp = async () => {
    router.replace("/(app)/(tabs)");
  };

  const linkClassroom = async () => {
    if (!user) {
      showToast({ type: "error", title: "Sesión no disponible", message: "Inicia sesión de nuevo para vincular Classroom." });
      return;
    }

    setIsLinking(true);

    try {
      const authorization = await GoogleSignin.addScopes({ scopes: classroomScopes });
      if (!authorization || authorization.type === "cancelled") return;

      const { accessToken } = await GoogleSignin.getTokens();
      const result = await syncClassroomTasks(accessToken);

      showToast({
        type: "success",
        title: "Classroom vinculado",
        message: result.totalSynced === 1
          ? "Importamos 1 tarea."
          : typeof result.totalSynced === "number"
            ? `Importamos ${result.totalSynced} tareas.`
            : "Tus tareas se sincronizaron correctamente.",
      });
      await continueToApp();
    } catch (error) {
      showToast({ type: "error", title: "No se pudo vincular Classroom", message: getClassroomErrorMessage(error, "link") });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Screen padded={false} safeAreaColor={colors.accent}>
      <View style={styles.screen}>
        <View style={[styles.hero, isCompactScreen && styles.heroCompact]}>
          <PlenoLogoBlanco height={isCompactScreen ? 46 : 54} width={isCompactScreen ? 162 : 190} />
          <Image resizeMode="contain" source={require("@/assets/images/classroom_image.png")} style={[styles.illustration, { height: illustrationHeight, width: illustrationWidth }]} />
        </View>
        <View style={[styles.body, isCompactScreen && styles.bodyCompact]}>
          <View>
            <AppText variant="h1" style={styles.title}>¿Conectamos Google Classroom?</AppText>
            <AppText color={colors.textSecondary} style={styles.description}>
              Es opcional. Al vincularlo podremos importar tus cursos y tareas automáticamente.
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button title="Vincular Classroom" loading={isLinking} onPress={linkClassroom} />
            <Button title="Ahora no" variant="ghost" disabled={isLinking} onPress={() => void continueToApp()} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.accent, flex: 1 },
  hero: { alignItems: "center", flex: 0.57, gap: spacing.sm, overflow: "hidden", paddingTop: spacing.lg },
  heroCompact: { flex: 0.54, paddingTop: spacing.md },
  illustration: { alignSelf: "flex-end", top: 25, transform: [{ translateX: spacing.lg }] },
  body: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, flex: 0.43, justifyContent: "space-between", marginTop: -spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  bodyCompact: { flex: 0.46, paddingTop: spacing.xl },
  title: { textAlign: "center" },
  description: { lineHeight: 24, marginTop: spacing.md, textAlign: "center" },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
});
