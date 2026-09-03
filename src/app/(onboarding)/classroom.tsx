import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { Screen } from "@/components/layout";
import { useFeedback } from "@/components/feedback";
import { AppText, Button } from "@/components/ui";
import { colors, spacing } from "@/theme";
import { useAuth } from "@/features/auth/AuthProvider";
import { classroomScopes } from "@/features/auth/google";
import { syncClassroomTasks } from "@/features/classroom/api";

export default function ClassroomScreen() {
  const [isLinking, setIsLinking] = useState(false);
  const { user } = useAuth();
  const { showToast } = useFeedback();

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
      showToast({ type: "error", title: "No se pudo vincular Classroom", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">¿Conectamos Google Classroom?</AppText>
        <AppText color={colors.textSecondary} style={styles.description}>
          Es opcional. Al vincularlo podremos importar tus cursos y tareas automáticamente.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button title="Vincular Classroom" loading={isLinking} onPress={linkClassroom} />
        <Button title="Ahora no" variant="ghost" disabled={isLinking} onPress={() => void continueToApp()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center" },
  description: { marginTop: spacing.md, lineHeight: 24 },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
});
