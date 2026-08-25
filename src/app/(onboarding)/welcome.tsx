import { router } from "expo-router";

import { Screen } from "@/components/layout";
import { AppText, Button } from "@/components/ui";

export default function WelcomeScreen() {
  return (
    <Screen>
      <AppText variant="h1">
        Bienvenido a PLENO
      </AppText>

      <Button
        title="Continuar"
        onPress={() => router.push("/classroom")}
      />
    </Screen>
  );
}