import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import BoardImage from "@/assets/images/tablero_image.png";
import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { AiRefreshResult, refreshTasksWithAi } from "@/features/planner/api";
import { colors, radius, spacing } from "@/theme";

type TaskStatus = "todo" | "in_progress" | "completed";
type BoardView = "flow" | "critical" | "plan";

const boardColumns: Array<{
  status: TaskStatus;
  title: string;
  color: string;
  textColor: string;
  emptyMessage: string;
  actionLabel: string;
  nextStatus: TaskStatus;
}> = [
  {
    status: "todo",
    title: "Pendientes",
    color: colors.accent,
    textColor: colors.text,
    emptyMessage: "No tienes tareas pendientes.",
    actionLabel: "Empezar tarea",
    nextStatus: "in_progress",
  },
  {
    status: "in_progress",
    title: "En progreso",
    color: colors.primary,
    textColor: colors.white,
    emptyMessage: "Elige una tarea para comenzar.",
    actionLabel: "Marcar completada",
    nextStatus: "completed",
  },
  {
    status: "completed",
    title: "Completadas",
    color: "#2476B9",
    textColor: colors.white,
    emptyMessage: "Tus avances aparecerán aquí.",
    actionLabel: "Reabrir tarea",
    nextStatus: "todo",
  },
];

function getDueLabel(dueDate?: number) {
  if (!dueDate) return "Sin fecha";

  const due = new Date(dueDate);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;

  if (dueDate >= startOfToday && dueDate < startOfTomorrow) return "Hoy";
  return due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function isOverdueTask(dueDate?: number) {
  if (!dueDate) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return dueDate < startOfToday;
}

function keepActionableAiResult(result: AiRefreshResult, actionableTaskIds: Set<string>): AiRefreshResult {
  const criticalTaskIds = result.criticalTaskIds.filter((taskId) => actionableTaskIds.has(taskId));
  const criticalTasks = result.criticalTasks.filter((task) => actionableTaskIds.has(task.taskId));
  const blocks = result.blocks.filter((block) => actionableTaskIds.has(block.taskId));
  const insights = result.insights.filter((insight) => actionableTaskIds.has(insight.taskId));
  const unscheduledTaskIds = result.unscheduledTaskIds.filter((taskId) => actionableTaskIds.has(taskId));
  const analyzedTaskIds = new Set([...criticalTaskIds, ...blocks.map((block) => block.taskId), ...insights.map((insight) => insight.taskId)]);

  return {
    ...result,
    analyzedTasks: analyzedTaskIds.size,
    blocks,
    criticalTaskIds,
    criticalTasks,
    insights,
    totalPlannedMinutes: blocks.reduce((total, block) => total + block.plannedMinutes, 0),
    unscheduledTaskIds,
  };
}

function formatPlanDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
}

function getDeadlineRiskLabel(risk?: string) {
  if (risk === "at_risk") return "En riesgo";
  if (risk === "overdue") return "Vencida";
  if (risk === "safe") return "A tiempo";
  return "Por revisar";
}

export default function BoardScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const tasks = useQuery(api.tasks.getTasksByUser, user ? { userId: user.id } : "skip");
  const updateTask = useMutation(api.tasks.updateTask);
  const columnWidth = Math.max(288, width - spacing.xl * 2);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiRefreshResult | null>(null);
  const [activeView, setActiveView] = useState<BoardView>("flow");
  const [selectedPlanDate, setSelectedPlanDate] = useState<string | null>(null);
  const actionableTaskIds = useMemo(() => new Set(
    (tasks ?? [])
      .filter((task) => task.status !== "completed" && !isOverdueTask(task.dueDate))
      .map((task) => task._id)
  ), [tasks]);
  const planDates = aiResult ? [...new Set(aiResult.blocks.map((block) => block.date))] : [];
  const visiblePlanBlocks = aiResult
    ? aiResult.blocks.filter((block) => !selectedPlanDate || block.date === selectedPlanDate)
    : [];

  const refreshWithAi = async () => {
    if (tasks && actionableTaskIds.size === 0) {
      Alert.alert("No hay tareas para analizar", "Solo se analizan tareas pendientes que no estén vencidas.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await refreshTasksWithAi();
      const actionableResult = keepActionableAiResult(result, actionableTaskIds);
      setAiResult(actionableResult);
      setSelectedPlanDate(actionableResult.blocks[0]?.date ?? null);
      setActiveView("critical");
    } catch (error) {
      Alert.alert(
        "No se pudo actualizar con IA",
        error instanceof Error ? error.message : "Intentalo de nuevo."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const moveTask = async (taskId: string, status: TaskStatus) => {
    if (!user) return;

    try {
      await updateTask({ taskId: taskId as never, userId: user.id, status });
    } catch (error) {
      Alert.alert(
        "No se pudo mover la tarea",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Image source={BoardImage} resizeMode="contain" style={styles.headerImage} />
        <View style={styles.headerCopy}>
        <AppText color={colors.white} variant="h1">
          Plan
        </AppText>
        <AppText color={colors.white} style={styles.headerDescription}>
          Tu ruta para una semana más organizada.
        </AppText>
        <AppText color={colors.white} style={styles.headerHint}>
          Analiza, prioriza y avanza a tu ritmo.
        </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isAnalyzing}
          onPress={() => void refreshWithAi()}
          style={({ pressed }) => [styles.aiButton, pressed && !isAnalyzing && styles.aiButtonPressed]}
        >
          <View style={styles.aiBadge}>
            <AppText color={colors.text} style={styles.aiBadgeMain}>✦</AppText>
            <AppText color={colors.text} style={styles.aiBadgeSmall}>✦</AppText>
          </View>
          <View style={styles.aiButtonCopy}>
            <AppText color={colors.text} style={styles.aiButtonTitle}>
              {isAnalyzing ? "Organizando tu semana..." : "Crear mi plan con IA"}
            </AppText>
            <AppText color={colors.textSecondary} variant="caption" style={styles.aiButtonCaption}>
              {aiResult ? "Tu plan está actualizado" : "Prioridades, ruta crítica y bloques"}
            </AppText>
          </View>
          {isAnalyzing ? (
            <ActivityIndicator color={colors.primary} size="small" style={styles.aiLoading} />
          ) : null}
        </Pressable>
        {aiResult && (
          <View style={styles.aiSummary}>
            <AppText color={colors.white} style={styles.aiSummaryTitle}>
              {aiResult.analyzedTasks} {aiResult.analyzedTasks === 1 ? "tarea analizada" : "tareas analizadas"}
            </AppText>
            {aiResult.summary && <AppText color={colors.white} variant="caption" style={styles.aiSummaryText}>{aiResult.summary}</AppText>}
            <AppText color={colors.white} variant="caption" style={styles.aiSummaryText}>
              {aiResult.criticalTaskIds.length} criticas · {aiResult.totalPlannedMinutes ?? 0} min planificados
            </AppText>
          </View>
        )}
        <View style={styles.viewTabs}>
          {([
            ["flow", "Flujo"],
            ["critical", "Ruta crítica"],
            ["plan", "Plan semanal"],
          ] as const).map(([view, label]) => (
            <Pressable
              key={view}
              accessibilityRole="button"
              onPress={() => setActiveView(view)}
              style={[styles.viewTab, activeView === view && styles.viewTabActive]}
            >
              <AppText color={activeView === view ? colors.primary : colors.textSecondary} style={styles.viewTabText}>
                {label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {!tasks ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : activeView === "flow" ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.columnsContent}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          snapToInterval={columnWidth + spacing.md}
          snapToAlignment="start"
        >
          {boardColumns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status && (column.status === "completed" || !isOverdueTask(task.dueDate)));

            return (
              <View key={column.status} style={[styles.column, { width: columnWidth }]}>
                <View style={[styles.columnHeader, { backgroundColor: column.color }]}>
                  <AppText color={column.textColor} variant="h3">
                    {column.title}
                  </AppText>
                  <View style={styles.columnCount}>
                    <AppText color={column.textColor} style={styles.columnCountText}>
                      {columnTasks.length}
                    </AppText>
                  </View>
                </View>

                <ScrollView contentContainerStyle={styles.columnList} showsVerticalScrollIndicator={false}>
                  {columnTasks.length === 0 ? (
                    <View style={styles.emptyColumn}>
                      <AppText color={colors.textSecondary} style={styles.emptyColumnText}>
                        {column.emptyMessage}
                      </AppText>
                    </View>
                  ) : (
                    columnTasks.map((task) => {
                      const insight = aiResult?.insights.find((item) => item.taskId === task._id);
                      const isCritical = aiResult?.criticalTaskIds.includes(task._id);

                      return (
                      <Card key={task._id} style={styles.taskCard}>
                        <AppText color={colors.textSecondary} variant="bodySmall" style={styles.courseName}>
                          {task.courseName || "General"}
                        </AppText>
                        <AppText style={styles.taskTitle} numberOfLines={2}>
                          {task.title}
                        </AppText>
                        {task.description.trim().length > 0 && (
                          <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={2} style={styles.description}>
                            {task.description}
                          </AppText>
                        )}
                        {(isCritical || insight) && (
                          <View style={styles.aiTaskMeta}>
                            {isCritical && <AppText color={colors.danger} variant="caption" style={styles.aiTaskMetaText}>Critica</AppText>}
                            {insight?.priority && <AppText color={colors.primary} variant="caption" style={styles.aiTaskMetaText}>IA: prioridad {insight.priority}</AppText>}
                            {insight?.estimatedMinutes && <AppText color={colors.textSecondary} variant="caption" style={styles.aiTaskMetaText}>{insight.estimatedMinutes} min estimados</AppText>}
                          </View>
                        )}
                        <View style={styles.taskMeta}>
                          <AppText color={colors.textSecondary} variant="caption">
                            {getDueLabel(task.dueDate)}
                          </AppText>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void moveTask(task._id, column.nextStatus)}
                            style={({ pressed }) => [styles.moveButton, pressed && styles.moveButtonPressed]}
                          >
                            <AppText color={colors.primary} variant="caption" style={styles.moveButtonText}>
                              {column.actionLabel}
                            </AppText>
                          </Pressable>
                        </View>
                      </Card>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.aiContent} showsVerticalScrollIndicator={false}>
          {!aiResult ? (
            <View style={styles.aiEmptyState}>
              <AppText style={styles.aiEmptyTitle}>Aún no hay un análisis</AppText>
              <AppText color={colors.textSecondary} style={styles.aiEmptyText}>
                Toca “Actualizar con IA” para calcular tu ruta crítica y organizar tu semana.
              </AppText>
            </View>
          ) : activeView === "critical" ? (
            <>
              <View style={styles.aiSectionIntro}>
                <AppText variant="h2">Ruta crítica</AppText>
                <AppText color={colors.textSecondary} style={styles.aiSectionDescription}>
                  Estas tareas requieren atención primero para evitar atrasos.
                </AppText>
              </View>
              {aiResult.criticalTasks.length > 0 && (
                <Card style={styles.criticalTable}>
                  <View style={styles.criticalTableHeader}>
                    <AppText color={colors.textSecondary} variant="caption" style={styles.criticalOrderColumn}>#</AppText>
                    <AppText color={colors.textSecondary} variant="caption" style={styles.criticalNameColumn}>Tarea</AppText>
                    <AppText color={colors.textSecondary} variant="caption" style={styles.criticalRiskColumn}>Riesgo</AppText>
                    <AppText color={colors.textSecondary} variant="caption" style={styles.criticalMinutesColumn}>Min.</AppText>
                  </View>
                  {aiResult.criticalTasks.map((criticalTask, index) => (
                    <View key={criticalTask.taskId} style={styles.criticalTableRow}>
                      <View style={styles.criticalTaskOrder}>
                        <AppText color={colors.primary} style={styles.criticalTaskOrderText}>{index + 1}</AppText>
                      </View>
                      <AppText numberOfLines={2} style={styles.criticalNameColumn}>{criticalTask.title || "Tarea sin titulo"}</AppText>
                      <View style={styles.criticalRiskColumn}>
                        <View style={styles.riskPill}>
                          <AppText color={colors.danger} variant="caption" style={styles.riskPillText}>
                            {getDeadlineRiskLabel(criticalTask.deadlineRisk)}
                          </AppText>
                        </View>
                      </View>
                      <AppText style={styles.criticalMinutesColumn}>{criticalTask.estimatedMinutes ?? "—"}</AppText>
                    </View>
                  ))}
                </Card>
              )}
              {aiResult.criticalTasks.length === 0 && (
                <View style={styles.aiEmptyState}>
                  <AppText style={styles.aiEmptyTitle}>No hay tareas críticas</AppText>
                  <AppText color={colors.textSecondary} style={styles.aiEmptyText}>Tu carga actual no tiene bloqueos urgentes.</AppText>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.aiSectionIntro}>
                <AppText variant="h2">Plan semanal</AppText>
                <AppText color={colors.textSecondary} style={styles.aiSectionDescription}>
                  {aiResult.weekStart && aiResult.weekEnd ? `${formatPlanDate(aiResult.weekStart)} — ${formatPlanDate(aiResult.weekEnd)}` : "Tu distribución de estudio recomendada."}
                </AppText>
              </View>
              <View style={styles.planStats}>
                <View style={styles.planStat}>
                  <AppText color={colors.primary} style={styles.planStatValue}>{aiResult.totalPlannedMinutes ?? 0}</AppText>
                  <AppText color={colors.textSecondary} variant="caption">min planeados</AppText>
                </View>
                <View style={styles.planStatDivider} />
                <View style={styles.planStat}>
                  <AppText color={aiResult.unscheduledTaskIds.length > 0 ? colors.danger : colors.success} style={styles.planStatValue}>{aiResult.unscheduledTaskIds.length}</AppText>
                  <AppText color={colors.textSecondary} variant="caption">por acomodar</AppText>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planDateTabs}>
                {planDates.map((date) => {
                  const dateParts = formatPlanDate(date).split(" ");
                  const isSelected = selectedPlanDate === date;
                  return (
                    <Pressable key={date} onPress={() => setSelectedPlanDate(date)} style={[styles.planDateTab, isSelected && styles.planDateTabActive]}>
                      <AppText color={isSelected ? colors.white : colors.textSecondary} variant="caption" style={styles.planDateWeekday}>{dateParts[0]}</AppText>
                      <AppText color={isSelected ? colors.white : colors.text} style={styles.planDateNumber}>{dateParts[1] ?? ""}</AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {visiblePlanBlocks.map((block) => {
                const localTask = tasks.find((task) => task._id === block.taskId);
                return (
                  <Card key={`${block.taskId}-${block.date}-${block.startTime}`} style={styles.planBlockCard}>
                    <AppText color={colors.primary} variant="caption" style={styles.planBlockDate}>{formatPlanDate(block.date)}</AppText>
                    <View style={styles.planBlockRow}>
                      <View style={styles.planBlockTime}>
                        <AppText color={colors.primary} style={styles.planBlockTimeText}>{block.startTime}</AppText>
                        <AppText color={colors.textSecondary} variant="caption">{block.endTime}</AppText>
                      </View>
                      <View style={styles.planBlockCopy}>
                        <AppText style={styles.planBlockTitle}>{localTask?.title || "Tarea programada"}</AppText>
                        <AppText color={colors.textSecondary} variant="caption" style={styles.planBlockReason}>
                          {block.plannedMinutes} min{block.reason ? ` · ${block.reason}` : ""}
                        </AppText>
                      </View>
                    </View>
                  </Card>
                );
              })}
              {visiblePlanBlocks.length === 0 && (
                <View style={styles.aiEmptyState}>
                  <AppText style={styles.aiEmptyTitle}>Aún no hay bloques para esta semana</AppText>
                  <AppText color={colors.textSecondary} style={styles.aiEmptyText}>La IA no pudo distribuir tareas con la información disponible.</AppText>
                </View>
              )}
              {aiResult.warnings.map((warning) => (
                <View key={warning} style={styles.planWarning}>
                  <AppText color={colors.warning} variant="caption">{warning}</AppText>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    minHeight: 258,
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  headerImage: { height: 200, position: "absolute", right: -68, top: -10, width: 260, zIndex: 1 },
  headerCopy: { marginTop: -spacing.sm, maxWidth: "58%", zIndex: 2 },
  headerDescription: { fontSize: 15, lineHeight: 20, marginTop: 3 },
  headerHint: { fontSize: 12, fontWeight: "600", lineHeight: 17, marginTop: spacing.sm, opacity: 0.82 },
  aiButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    flexDirection: "row",
    marginTop: spacing.md,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    zIndex: 2,
  },
  aiBadge: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    marginRight: spacing.md,
    marginLeft: spacing.md,
    position: "relative",
    width: 39,

  },
  aiBadgeMain: { fontSize: 24, fontWeight: "700", lineHeight: 27 },
  aiBadgeSmall: { fontSize: 12, fontWeight: "700", left: 0, position: "absolute", top: 1 },
  aiButtonCopy: { flex: 1 },
  aiButtonTitle: { fontSize: 15, fontWeight: "700" },
  aiButtonCaption: { marginTop: 2 },
  aiButtonPressed: { opacity: 0.82 },
  aiLoading: { marginLeft: spacing.md },
  aiSummary: { backgroundColor: "rgba(255, 255, 255, 0.16)", borderRadius: radius.md, marginTop: spacing.md, padding: spacing.md, zIndex: 2 },
  aiSummaryTitle: { fontSize: 14, fontWeight: "700" },
  aiSummaryText: { lineHeight: 18, marginTop: 3, opacity: 0.94 },
  viewTabs: { backgroundColor: colors.white, flexDirection: "row", marginHorizontal: -spacing.xl, marginTop: spacing.md, overflow: "hidden", zIndex: 2 },
  viewTab: { alignItems: "center", borderBottomColor: "transparent", borderBottomWidth: 3, flex: 1, minHeight: 43, justifyContent: "center", paddingHorizontal: spacing.xs },
  viewTabActive: { borderBottomColor: colors.primary },
  viewTabText: { fontSize: 14, fontWeight: "700" },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  aiContent: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  aiEmptyState: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  aiEmptyTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  aiEmptyText: { lineHeight: 21, marginTop: spacing.sm, textAlign: "center" },
  aiSectionIntro: { marginBottom: spacing.sm },
  aiSectionDescription: { lineHeight: 21, marginTop: spacing.xs },
  criticalTable: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, overflow: "hidden", padding: 0 },
  criticalTableHeader: { alignItems: "center", backgroundColor: colors.surfaceSecondary, flexDirection: "row", minHeight: 42, paddingHorizontal: spacing.sm },
  criticalTableRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 61, paddingHorizontal: spacing.sm },
  criticalOrderColumn: { width: 30 },
  criticalNameColumn: { flex: 1, fontSize: 13, fontWeight: "600", paddingHorizontal: spacing.xs },
  criticalRiskColumn: { alignItems: "center", width: 72 },
  criticalMinutesColumn: { fontSize: 13, textAlign: "right", width: 42 },
  criticalTaskOrder: { alignItems: "center", backgroundColor: "#EAF3FF", borderRadius: radius.full, height: 26, justifyContent: "center", width: 26 },
  criticalTaskOrderText: { fontSize: 12, fontWeight: "700" },
  riskPill: { alignItems: "center", backgroundColor: "#FFF0F0", borderRadius: radius.full, minWidth: 58, paddingHorizontal: spacing.xs, paddingVertical: 4 },
  riskPillText: { fontWeight: "700" },
  planStats: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-around", paddingVertical: spacing.md },
  planStat: { alignItems: "center", flex: 1 },
  planStatValue: { fontSize: 22, fontWeight: "700" },
  planStatDivider: { backgroundColor: colors.border, height: 33, width: StyleSheet.hairlineWidth },
  planDateTabs: { gap: spacing.sm, paddingVertical: spacing.xs },
  planDateTab: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, minWidth: 58, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  planDateTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  planDateWeekday: { fontWeight: "700", textTransform: "capitalize" },
  planDateNumber: { fontSize: 17, fontWeight: "700", marginTop: 1 },
  planBlockCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  planBlockDate: { fontWeight: "700", textTransform: "capitalize" },
  planBlockRow: { flexDirection: "row", marginTop: spacing.sm },
  planBlockTime: { borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth, minWidth: 62, paddingRight: spacing.sm },
  planBlockTimeText: { fontSize: 16, fontWeight: "700" },
  planBlockCopy: { flex: 1, paddingLeft: spacing.md },
  planBlockTitle: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  planBlockReason: { lineHeight: 18, marginTop: 3 },
  planWarning: { backgroundColor: "#FFF8E7", borderRadius: radius.sm, padding: spacing.md },
  columnsContent: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  column: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: "100%",
    overflow: "hidden",
  },
  columnHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  columnCount: { backgroundColor: "rgba(255, 255, 255, 0.25)", borderRadius: radius.full, minWidth: 25, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  columnCountText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  columnList: { gap: spacing.sm, padding: spacing.sm },
  emptyColumn: { alignItems: "center", minHeight: 130, justifyContent: "center", paddingHorizontal: spacing.xl },
  emptyColumnText: { lineHeight: 21, textAlign: "center" },
  taskCard: { backgroundColor: colors.white, borderRadius: radius.sm, padding: spacing.lg },
  courseName: { marginBottom: spacing.xs },
  taskTitle: { fontSize: 17, fontWeight: "600", lineHeight: 22 },
  description: { lineHeight: 19, marginTop: spacing.sm },
  aiTaskMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  aiTaskMetaText: { fontWeight: "700" },
  taskMeta: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, paddingTop: spacing.md },
  moveButton: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  moveButtonText: { fontWeight: "700" },
  moveButtonPressed: { opacity: 0.72 },
});
