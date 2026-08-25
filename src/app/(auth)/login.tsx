import { router } from "expo-router";

import { Screen } from "@/components/layout";
import { AppText, Button } from "@/components/ui";

export default function LoginScreen() {
  return (
    <Screen>
      <AppText variant="h1">PLENO</AppText>

      <AppText>
        Login temporal
      </AppText>

      <Button
        title="Continuar"
        onPress={() => router.push("/welcome")}
      />
    </Screen>
  );
}