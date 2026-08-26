import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { AppText, Button } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function ClassroomScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">Conectamos Google Classroom?</AppText>
        <AppText color={colors.textSecondary} style={styles.description}>
          Es opcional. Tambien podras crear tareas manualmente.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button title="Conectar mas tarde" variant="secondary" onPress={() => router.replace("/(app)/(tabs)")} />
        <Button title="Continuar sin Classroom" onPress={() => router.replace("/(app)/(tabs)")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center" },
  description: { marginTop: spacing.md, lineHeight: 24 },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
});
