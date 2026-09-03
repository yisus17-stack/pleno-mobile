import { router } from "expo-router";
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Screen } from "@/components/layout";
import { AppText } from "@/components/ui";
import PlenoLogoBlanco from "@/assets/brand/logo_pleno_blanco.svg";
import { colors, radius, spacing } from "@/theme";

export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const isCompactScreen = height < 700;
  const heroFlex = (isCompactScreen ? 0.53 : 0.57) + 5 / height;
  const bodyFlex = 1 - heroFlex;

  return (
    <Screen padded={false} safeAreaColor={colors.primary}>
      <View style={styles.content}>
        <View style={[styles.visualArea, isCompactScreen && styles.visualAreaCompact, { flex: heroFlex }]}>
          {/* Aquí irá la ilustración de las manos organizando tarjetas. */}
          <PlenoLogoBlanco width={152} height={50} style={styles.welcomeLogo} />
          <Image resizeMode="contain" source={require("@/assets/images/welcome_image.png")} style={styles.welcomeImage} />
        </View>

        <View style={[styles.body, isCompactScreen && styles.bodyCompact, { flex: bodyFlex }]}>
          <AppText style={styles.welcomeText}>Bienvenido a</AppText>
          <AppText color={colors.primary} style={styles.brandText}>PLENO</AppText>
          <AppText color={colors.textSecondary} style={styles.description}>
            Organiza tus tareas, define tu tiempo y deja que Pleno te ayude a decidir qué hacer primero.
          </AppText>

          <Pressable accessibilityRole="button" onPress={() => router.push("/preferences")} style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}>
            <AppText color={colors.white} style={styles.continueButtonText}>Configurar mi plan</AppText>
            <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
              <Path d="m8 4 8 8-8 8" stroke={colors.white} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} />
            </Svg>
          </Pressable>
          <AppText color={colors.textMuted} style={styles.note}>Solo te tomará un minuto</AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.primary, flex: 1 },
  visualArea: { alignItems: "center", flex: 0.57, justifyContent: "center", overflow: "hidden", position: "relative" },
  visualAreaCompact: { flex: 0.53 },
  welcomeLogo: { position: "absolute", top: spacing.lg, zIndex: 2 },
  welcomeImage: { height: "120%", width: "100%", marginTop: 70},
  body: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, flex: 0.43, justifyContent: "center", marginTop: -spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  bodyCompact: { flex: 0.47, paddingTop: spacing.md },
  welcomeText: { fontSize: 28, fontWeight: "500", letterSpacing: -0.6, lineHeight: 34 },
  brandText: { fontSize: 38, fontWeight: "800", letterSpacing: -1.1, lineHeight: 43 },
  description: { fontSize: 16, lineHeight: 24, marginTop: spacing.lg, maxWidth: 330 },
  continueButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, minHeight: 58, paddingHorizontal: spacing.xl },
  continueButtonPressed: { opacity: 0.82 },
  continueButtonText: { fontSize: 16, fontWeight: "700" },
  note: { fontSize: 13, marginTop: spacing.md, paddingBottom: spacing.lg, textAlign: "center" },
});
