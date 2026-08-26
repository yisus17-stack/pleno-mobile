import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { AppText, Button } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function WelcomeScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <AppText variant="display">Bienvenido a PLENO</AppText>
        <AppText color={colors.textSecondary} style={styles.description}>
          Organizaremos tus pendientes para que sepas que hacer primero.
        </AppText>
      </View>
      <Button title="Configurar mi espacio" onPress={() => router.push("/classroom")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center" },
  description: { marginTop: spacing.md, lineHeight: 24 },
});
