import { router } from "expo-router";

import { Screen } from "@/components/layout";
import { AppText, Button } from "@/components/ui";

export default function ClassroomScreen() {
  return (
    <Screen>
      <AppText variant="h1">
        Google Classroom
      </AppText>

      <Button
        title="Ahora no"
        onPress={() => router.replace("/(app)/(tabs)")}
      />
    </Screen>
  );
}