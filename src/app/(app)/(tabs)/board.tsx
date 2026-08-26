import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function BoardScreen() {
  return (
    <Screen>
      <AppText variant="h1" style={styles.title}>Tu tablero</AppText>
      <View style={styles.columns}>
        <Card><AppText variant="h3">Pendiente</AppText><AppText color={colors.textMuted}>Sin tareas aun</AppText></Card>
        <Card><AppText variant="h3">En progreso</AppText><AppText color={colors.textMuted}>Elige una tarea</AppText></Card>
        <Card><AppText variant="h3">Completado</AppText><AppText color={colors.textMuted}>Celebra tus avances</AppText></Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xxl },
  columns: { gap: spacing.md, marginTop: spacing.xl },
});
