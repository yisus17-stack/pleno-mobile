import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Screen } from "@/components/layout";
import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

export default function WelcomeScreen() {
  return (
    <Screen padded={false} safeAreaColor={colors.primary}>
      <View style={styles.content}>
        <View style={styles.visualArea}>
          {/* Aquí irá la ilustración de las manos organizando tarjetas. */}
          <View style={[styles.floatingCard, styles.floatingCardBack]} />
          <View style={[styles.floatingCard, styles.floatingCardMiddle]}>
            <View style={[styles.cardMark, { backgroundColor: colors.accent }]} />
            <View style={styles.cardLine} />
            <View style={[styles.cardLine, styles.cardLineShort]} />
          </View>
          <View style={[styles.floatingCard, styles.floatingCardFront]}>
            <View style={[styles.cardMark, { backgroundColor: colors.success }]} />
            <View style={styles.cardLine} />
            <View style={[styles.cardLine, styles.cardLineShort]} />
          </View>
        </View>

        <View style={styles.body}>
          <AppText style={styles.welcomeText}>Bienvenido a</AppText>
          <AppText color={colors.primary} style={styles.brandText}>PLENO</AppText>
          <AppText color={colors.textSecondary} style={styles.description}>
            Organiza tus tareas, define tu tiempo y deja que Pleno te ayude a decidir qué hacer primero.
          </AppText>

          <View style={styles.progress}>
            <View style={styles.progressLine} />
            {[
              ["1", "Tu tiempo"],
              ["2", "Tu energía"],
              ["3", "Preferencias"],
            ].map(([number, label]) => (
              <View key={number} style={styles.progressStep}>
                <View style={styles.progressDot}>
                  <AppText color={colors.textMuted} style={styles.progressNumber}>{number}</AppText>
                </View>
                <AppText color={colors.textMuted} style={styles.progressLabel}>{label}</AppText>
              </View>
            ))}
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/preferences")} style={({ pressed }) => [styles.continueButton, pressed && styles.continueButtonPressed]}>
            <AppText color={colors.white} style={styles.continueButtonText}>Configurar mi plan</AppText>
            <AppText color={colors.white} style={styles.continueArrow}>→</AppText>
          </Pressable>
          <AppText color={colors.textMuted} style={styles.note}>Solo te tomará un minuto</AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.primary, flex: 1 },
  visualArea: { alignItems: "center", flex: 0.43, justifyContent: "center", overflow: "hidden", position: "relative" },
  floatingCard: { backgroundColor: colors.white, borderRadius: radius.lg, height: 128, position: "absolute", width: 190 },
  floatingCardBack: { backgroundColor: "rgba(255, 255, 255, 0.18)", right: -32, top: 50, transform: [{ rotate: "16deg" }] },
  floatingCardMiddle: { left: 50, top: 84, transform: [{ rotate: "-12deg" }] },
  floatingCardFront: { bottom: 22, right: 48, transform: [{ rotate: "9deg" }] },
  cardMark: { borderRadius: radius.full, height: 20, left: spacing.lg, position: "absolute", top: spacing.lg, width: 20 },
  cardLine: { backgroundColor: colors.border, borderRadius: radius.full, height: 10, left: spacing.lg, position: "absolute", right: spacing.xl, top: 58 },
  cardLineShort: { right: 72, top: 78 },
  body: { backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, flex: 0.57, marginTop: -spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  welcomeText: { fontSize: 28, fontWeight: "500", letterSpacing: -0.6, lineHeight: 34 },
  brandText: { fontSize: 38, fontWeight: "800", letterSpacing: -1.1, lineHeight: 43 },
  description: { fontSize: 16, lineHeight: 24, marginTop: spacing.lg, maxWidth: 330 },
  progress: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xl, position: "relative", width: 238 },
  progressLine: { backgroundColor: colors.border, height: 2, left: 18, position: "absolute", right: 18, top: 14 },
  progressStep: { alignItems: "center", gap: spacing.xs },
  progressDot: { alignItems: "center", backgroundColor: colors.border, borderRadius: radius.full, height: 28, justifyContent: "center", width: 28, zIndex: 1 },
  progressNumber: { fontSize: 12, fontWeight: "800" },
  progressLabel: { fontSize: 11, fontWeight: "700" },
  continueButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", justifyContent: "space-between", marginTop: "auto", minHeight: 58, paddingHorizontal: spacing.xl },
  continueButtonPressed: { opacity: 0.82 },
  continueButtonText: { fontSize: 16, fontWeight: "700" },
  continueArrow: { fontSize: 25, fontWeight: "400", lineHeight: 28 },
  note: { fontSize: 13, marginTop: spacing.md, paddingBottom: spacing.xl, textAlign: "center" },
});
