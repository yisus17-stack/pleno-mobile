import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="h1">Hola, vamos paso a paso.</AppText>
        <AppText color={colors.textSecondary} style={styles.subtitle}>
          Hoy tienes 3 tareas por organizar.
        </AppText>
        <Card style={styles.card}>
          <AppText variant="h3">Siguiente recomendacion</AppText>
          <AppText style={styles.task}>Definir tareas de la semana</AppText>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl },
  subtitle: { marginTop: spacing.sm },
  card: { marginTop: spacing.xxl },
  task: { marginTop: spacing.sm },
});
