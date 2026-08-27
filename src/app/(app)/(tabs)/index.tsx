import { router } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";

import PlenoLogoBlanco from "@/assets/brand/logo_pleno_blanco.svg";
import BannerImage from "@/assets/images/banner_image.png";
import InicioImage from "@/assets/images/inicio_image.png";
import { Screen } from "@/components/layout";
import { AppText, Button, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { colors, radius, spacing } from "@/theme";

const taskSummary = [
  { label: "Pendientes", value: "0", color: colors.primary },
  { label: "En progreso", value: "0", color: colors.warning },
  { label: "Completadas", value: "0", color: colors.success },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const firstName = user?.givenName || user?.name?.split(" ")[0] || "";

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={InicioImage} resizeMode="contain" style={styles.heroImage} />

          <View style={styles.heroContent}>
            <PlenoLogoBlanco width={134} height={42} />

            <View style={styles.heroGreeting}>
              <AppText color={colors.white} style={styles.heroTitle}>
                {firstName ? `¡Hola, ${firstName}!` : "¡Hola!"}
              </AppText>
              <AppText color={colors.white} style={styles.heroSubtitle}>
                Organiza tu día,{"\n"}alcanza tus metas.
              </AppText>
            </View>
          </View>

        </View>

        <View style={styles.body}>

          <Card style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <View>
                <AppText variant="h3">Resumen</AppText>
                <AppText color={colors.textSecondary} variant="bodySmall" style={styles.summarySubtitle}>
                  Tu semana de un vistazo
                </AppText>
              </View>
              <View style={styles.weekPill}>
                <AppText color={colors.primary} style={styles.weekPillText}>
                  ESTA SEMANA
                </AppText>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryGrid}>
              {taskSummary.map((item, index) => (
                <View key={item.label} style={styles.summaryItem}>
                  <View style={[styles.summaryDot, { backgroundColor: item.color }]} />
                  <AppText color={item.color} style={styles.summaryValue}>
                    {item.value}
                  </AppText>
                  <AppText color={colors.textSecondary} variant="caption" style={styles.summaryLabel}>
                    {item.label}
                  </AppText>
                  {index < taskSummary.length - 1 && <View style={styles.summarySeparator} />}
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.focusCard}>
            <View style={styles.focusBadge}>
              <AppText color={colors.primary} style={styles.focusBadgeText}>
                PRIMER PASO
              </AppText>
            </View>
            <AppText variant="h2" style={styles.focusTitle}>
              Empieza con una tarea
            </AppText>
            <AppText color={colors.textSecondary} style={styles.focusDescription}>
              Agrega lo que tienes pendiente y PLENO te ayudará a decidir qué hacer primero.
            </AppText>
            <Button title="Ver mis tareas" onPress={() => router.push("/tasks")} style={styles.focusButton} />
          </Card>

          <View style={styles.tip}>
            <View style={styles.tipDot} />
            <AppText color={colors.textSecondary} style={styles.tipText}>
              Cuando tengas tareas, aquí verás tu recomendación principal del día.
            </AppText>
          </View>

          <Card style={styles.motivationCard}>
            <Image source={BannerImage} resizeMode="contain" style={styles.motivationImage} />
            <View style={styles.motivationContent}>
              <AppText variant="h3" style={styles.motivationTitle}>
                ¡Sigue así!
              </AppText>
              <AppText color={colors.text} style={styles.motivationDescription}>
                Llevas un excelente progreso esta semana.
              </AppText>
            </View>
          </Card>

          <View style={styles.upcomingSection}>
            <AppText variant="h3">Próximas</AppText>
            <Card style={styles.upcomingCard}>
              <View style={styles.emptyCalendar}>
                <AppText color={colors.primary} style={styles.emptyCalendarNumber}>
                  0
                </AppText>
              </View>
              <View style={styles.upcomingCopy}>
                <AppText style={styles.upcomingTitle}>Sin próximas entregas</AppText>
                <AppText color={colors.textSecondary} variant="bodySmall" style={styles.upcomingDescription}>
                  Aquí aparecerán tus tareas con fecha límite.
                </AppText>
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: spacing.xxxl },
  hero: {
    backgroundColor: colors.primary,
    height: 245,
    overflow: "visible",
    position: "relative",
    zIndex: 1,
  },
  heroImage: {
    bottom: -43,
    height: 230,
    position: "absolute",
    right: -107,
    width: 550,
    zIndex: 2,
    elevation: 2,
  },
  heroContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    zIndex: 3,
  },
  heroGreeting: { marginTop: spacing.xl },
  heroTitle: { fontSize: 31, fontWeight: "700" },
  heroSubtitle: { fontSize: 17, lineHeight: 24, marginTop: spacing.sm },
  body: { paddingHorizontal: spacing.xl },
  summaryPanel: {
    backgroundColor: colors.white,
    borderWidth: 0,
    marginHorizontal: -spacing.sm,
    marginTop: spacing.xxl,
    padding: spacing.lg,
  },
  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summarySubtitle: { marginTop: 2 },
  weekPill: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  weekPillText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.55 },
  summaryDivider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.lg },
  summaryGrid: { flexDirection: "row" },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  summaryDot: { borderRadius: radius.full, height: 7, marginBottom: spacing.sm, width: 7 },
  summaryValue: { fontSize: 28, fontWeight: "700" },
  summaryLabel: { marginTop: 2, textAlign: "center" },
  summarySeparator: {
    backgroundColor: colors.border,
    height: 32,
    position: "absolute",
    right: 0,
    top: 14,
    width: 1,
  },
  focusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    padding: spacing.xl,
  },
  focusBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  focusBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  focusTitle: { marginTop: spacing.lg },
  focusDescription: { lineHeight: 22, marginTop: spacing.sm },
  focusButton: { alignSelf: "flex-start", marginTop: spacing.xl },
  tip: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  tipDot: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  tipText: { flex: 1, lineHeight: 21 },
  motivationCard: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    borderWidth: 0,
    marginTop: spacing.xl,
    minHeight: 106,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
  },
  motivationImage: { bottom: -2, height: 140, position: "absolute", right: -18, width: 180 },
  motivationContent: { maxWidth: "58%", zIndex: 1, marginLeft: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm },
  motivationTitle: { fontWeight: "700" },
  motivationDescription: { lineHeight: 21, marginTop: spacing.sm },
  upcomingSection: { marginTop: spacing.xxxl },
  upcomingCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    flexDirection: "row",
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  emptyCalendar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  emptyCalendarNumber: { fontSize: 20, fontWeight: "700" },
  upcomingCopy: { flex: 1, marginLeft: spacing.md },
  upcomingTitle: { fontWeight: "600" },
  upcomingDescription: { lineHeight: 19, marginTop: 2 },
});
