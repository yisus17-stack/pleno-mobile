import { ActivityIndicator, Image, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import BoardImage from "@/assets/images/tablero_image.png";
import { AppText } from "@/components/ui";
import { AiRefreshResult } from "@/features/planner/api";
import { styles } from "@/features/planner/styles";
import { colors } from "@/theme";

export type BoardView = "flow" | "critical" | "plan";

type BoardHeaderProps = {
  aiResult: AiRefreshResult | null;
  isAnalyzing: boolean;
  onRefresh: () => void;
};

function formatPlannedTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

export function BoardHeader({ aiResult, isAnalyzing, onRefresh }: BoardHeaderProps) {
  return <View style={styles.header}>
    <Image source={BoardImage} resizeMode="contain" style={styles.headerImage} />
    <View style={styles.headerCopy}>
      <AppText color={colors.white} variant="h1">Plan</AppText>
      <AppText color={colors.white} style={styles.headerDescription}>Tu ruta para una semana más organizada.</AppText>
      <AppText color={colors.white} style={styles.headerHint}>Analiza, prioriza y avanza a tu ritmo.</AppText>
    </View>
    {aiResult && !isAnalyzing ? (
      <Pressable accessibilityRole="button" onPress={onRefresh} style={({ pressed }) => [styles.aiButton, pressed && styles.aiButtonPressed]}>
        <View style={styles.aiBadge}>
          <AppText color={colors.text} style={styles.aiBadgeMain}>✦</AppText>
          <AppText color={colors.text} style={styles.aiBadgeSmall}>✦</AppText>
        </View>
        <View style={styles.aiButtonCopy}>
          <AppText color={colors.text} style={styles.aiPlanReadyTitle}>Tu plan está listo</AppText>
          <AppText color={colors.textSecondary} numberOfLines={1} style={styles.aiPlanReadyMeta}>
            {`${aiResult.criticalTaskIds.length} ${aiResult.criticalTaskIds.length === 1 ? "tarea crítica" : "tareas críticas"} · ${formatPlannedTime(aiResult.totalPlannedMinutes ?? 0)} planificadas`}
          </AppText>
        </View>
        <View style={styles.aiRefreshAction}>
          <Svg height={23} viewBox="0 0 24 24" width={23} fill="none">
            <Path d="M20 11a8.1 8.1 0 0 0-15-3M4 5v3h3M4 13a8.1 8.1 0 0 0 15 3m1 3v-3h-3" stroke={colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <AppText color={colors.primary} variant="caption" style={styles.aiRefreshActionText}>Actualizar</AppText>
        </View>
      </Pressable>
    ) : (
      <Pressable
        accessibilityRole="button"
        disabled={isAnalyzing}
        onPress={onRefresh}
        style={({ pressed }) => [styles.aiButton, pressed && !isAnalyzing && styles.aiButtonPressed]}
      >
        <View style={styles.aiBadge}>
          <AppText color={colors.text} style={styles.aiBadgeMain}>✦</AppText>
          <AppText color={colors.text} style={styles.aiBadgeSmall}>✦</AppText>
        </View>
        <View style={styles.aiButtonCopy}>
          <AppText color={colors.text} style={styles.aiButtonTitle}>{isAnalyzing ? "Organizando tu semana..." : "Crear mi plan con IA"}</AppText>
          <AppText color={colors.textSecondary} variant="caption" style={styles.aiButtonCaption}>
            {isAnalyzing ? "Calculamos tu ruta y distribuimos tus bloques." : "Prioridades, ruta crítica y bloques"}
          </AppText>
        </View>
        {isAnalyzing ? <ActivityIndicator color={colors.primary} size="small" style={styles.aiLoading} /> : null}
      </Pressable>
    )}
  </View>;
}
