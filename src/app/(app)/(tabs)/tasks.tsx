import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { AppText, Button, Card } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function TasksScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">Tus tareas</AppText>
        <Card style={styles.card}>
          <AppText variant="h3">Aun no hay tareas</AppText>
          <AppText color={colors.textSecondary} style={styles.description}>
            Anade la primera y PLENO te ayudara a priorizarla.
          </AppText>
        </Card>
      </View>
      <Button title="Crear tarea" onPress={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingTop: spacing.xxl },
  card: { marginTop: spacing.xl },
  description: { marginTop: spacing.sm, lineHeight: 22 },
});
