import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFeedback } from "@/components/feedback";
import { AiRefreshResult, getAiRefreshErrorFeedback, refreshTasksWithAi } from "@/features/planner/api";
import { boardColumns, formatPlanDate, getDueLabel, getPlanWeekDates, isOverdueTask, isPastPlanDate, isTodayPlanDate, keepActionableAiResult, TaskStatus } from "@/features/planner/boardUtils";
import { BoardHeader, BoardView } from "@/features/planner/components/BoardHeader";
import { BoardTabs } from "@/features/planner/components/BoardTabs";
import { CriticalPathJourney } from "@/features/planner/components/CriticalPathJourney";
import { styles } from "@/features/planner/styles";
import { colors, spacing } from "@/theme";

type StoredPlan = {
  summary?: string;
  workloadRisk?: string;
  plan: {
    _id: string;
    marginMinutes: number;
    totalAvailableMinutes: number;
    totalPlannedMinutes: number;
    summary?: string;
    unscheduledMinutes?: number;
    unscheduledTaskIds?: string[];
    weekEnd: string;
    weekStart: string;
    workloadRisk?: string;
  };
  blocks: Array<{
    date: string;
    endTime: string;
    plannedMinutes: number;
    reason: string;
    startTime: string;
    taskId: string;
  }>;
};

type BoardTask = {
  _id: string;
  aiConfidence?: number;
  aiEstimatedMinutes?: number;
  aiReasoning?: string;
  aiRecommendedPriority?: "low" | "medium" | "high";
  aiSuggestedAction?: string;
  complexityScore?: number;
  description?: string;
  dueDate?: number;
  priority?: "low" | "medium" | "high";
  title: string;
};

const tasksApi = (api as unknown as {
  tasks: { getLatestStudyPlan: any };
}).tasks;

function isCriticalBlock(reason: string) {
  return reason
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .includes("ruta critica");
}

function getAiPriorityLabel(priority?: "low" | "medium" | "high") {
  if (priority === "high") return "alta";
  if (priority === "medium") return "media";
  if (priority === "low") return "baja";
  return "sin definir";
}

function getPlanInsight(result: AiRefreshResult) {
  if (result.summary?.trim()) return result.summary.trim();

  const plannedMinutes = result.totalPlannedMinutes ?? 0;
  const criticalTasks = result.criticalTaskIds.length;
  const unscheduledMinutes = result.unscheduledMinutes ?? 0;

  if (unscheduledMinutes > 0) {
    return `La IA organizó ${plannedMinutes} min y dejó ${unscheduledMinutes} min sin programar para esta semana.`;
  }

  return criticalTasks > 0
    ? `La IA organizó ${plannedMinutes} min para esta semana y detectó ${criticalTasks} ${criticalTasks === 1 ? "tarea crítica" : "tareas críticas"}.`
    : `La IA organizó ${plannedMinutes} min para que avances con calma esta semana.`;
}

function restoreAiResult(planData: StoredPlan, tasks: BoardTask[]): AiRefreshResult {
  const taskById = new Map(tasks.map((task) => [task._id, task]));
  const minutesByTask = new Map<string, number>();
  const criticalTaskIds: string[] = [];

  for (const block of planData.blocks) {
    minutesByTask.set(block.taskId, (minutesByTask.get(block.taskId) ?? 0) + block.plannedMinutes);
    if (isCriticalBlock(block.reason) && !criticalTaskIds.includes(block.taskId)) {
      criticalTaskIds.push(block.taskId);
    }
  }

  return {
    analyzedTasks: new Set(planData.blocks.map((block) => block.taskId)).size,
    blocks: planData.blocks,
    criticalTaskIds,
    criticalTasks: criticalTaskIds.map((taskId) => {
      const task = taskById.get(taskId);
      return {
        taskId,
        title: task?.title,
        estimatedMinutes: task?.aiEstimatedMinutes ?? minutesByTask.get(taskId),
      };
    }),
    insights: tasks.flatMap((task) => {
      const estimatedMinutes = task.aiEstimatedMinutes ?? minutesByTask.get(task._id);
      const priority = task.aiRecommendedPriority;
      const complexityScore = task.complexityScore;
      const confidence = task.aiConfidence;
      const reasoning = task.aiReasoning;
      const suggestedAction = task.aiSuggestedAction;

      if (
        estimatedMinutes === undefined
        && priority === undefined
        && complexityScore === undefined
        && confidence === undefined
        && reasoning === undefined
        && suggestedAction === undefined
      ) return [];

      return [{
        taskId: task._id,
        estimatedMinutes,
        priority,
        complexityScore,
        confidence,
        reasoning,
        suggestedAction,
      }];
    }),
    reusedTasks: 0,
    summary: planData.summary ?? planData.plan.summary,
    totalPlannedMinutes: planData.plan.totalPlannedMinutes,
    unscheduledMinutes: planData.plan.unscheduledMinutes,
    unscheduledTaskIds: planData.plan.unscheduledTaskIds ?? [],
    warnings: planData.plan.unscheduledMinutes ? ["Hay tiempo pendiente por acomodar."] : [],
    weekEnd: planData.plan.weekEnd,
    weekStart: planData.plan.weekStart,
    workloadRisk: planData.workloadRisk ?? planData.plan.workloadRisk,
  };
}

export default function BoardScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { hideLoading, showLoading, showToast } = useFeedback();
  const tasks = useQuery(api.tasks.getTasksByUser, user ? { userId: user.id } : "skip");
  const latestStudyPlan = useQuery(tasksApi.getLatestStudyPlan, user ? { userId: user.id } : "skip") as StoredPlan | null | undefined;
  const updateTask = useMutation(api.tasks.updateTask);
  const columnWidth = Math.min(420, Math.max(288, width - spacing.xl * 2));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AiRefreshResult | null>(null);
  const [activeView, setActiveView] = useState<BoardView>("flow");
  const [isPlanSummaryExpanded, setIsPlanSummaryExpanded] = useState(false);
  const [expandedAiTaskIds, setExpandedAiTaskIds] = useState<string[]>([]);
  const actionableTaskIds = useMemo(() => new Set(
    (tasks ?? [])
      .filter((task) => task.status !== "completed" && !isOverdueTask(task.dueDate))
      .map((task) => task._id)
  ), [tasks]);
  const planDates = useMemo(() => {
    if (!aiResult) return [];

    const allPlanDates = getPlanWeekDates(aiResult.weekStart, [...new Set(aiResult.blocks.map((block) => block.date))]);
    const currentAndUpcomingDates = allPlanDates.filter((date) => !isPastPlanDate(date));
    return currentAndUpcomingDates.length > 0 ? currentAndUpcomingDates : allPlanDates;
  }, [aiResult]);
  const planInsight = aiResult ? getPlanInsight(aiResult) : "";

  useEffect(() => {
    if (!latestStudyPlan || !tasks) return;

    const restoredResult = keepActionableAiResult(
      restoreAiResult(latestStudyPlan, tasks as BoardTask[]),
      actionableTaskIds
    );
    setAiResult(restoredResult);
    setIsPlanSummaryExpanded(false);
  }, [actionableTaskIds, latestStudyPlan, tasks]);

  const refreshWithAi = async () => {
    if (tasks && actionableTaskIds.size === 0) {
      showToast({ type: "warning", title: "No hay tareas para analizar", message: "Solo se analizan tareas pendientes que no estén vencidas." });
      return;
    }

    setIsAnalyzing(true);
    showLoading({ title: "Organizando tu semana con IA", message: "Analizamos tus tareas, prioridades y disponibilidad." });

    try {
      const result = await refreshTasksWithAi();
      const actionableResult = keepActionableAiResult(result, actionableTaskIds);
      setAiResult(actionableResult);
      setIsPlanSummaryExpanded(false);
      setActiveView("critical");
      showToast({ type: "success", title: "Tu plan está listo", message: "Revisa tu ruta crítica y el plan semanal." });
    } catch (error) {
      const feedback = getAiRefreshErrorFeedback(error);
      showToast({ type: "error", ...feedback });
    } finally {
      setIsAnalyzing(false);
      hideLoading();
    }
  };

  const moveTask = async (taskId: string, status: TaskStatus) => {
    if (!user) return;

    try {
      await updateTask({ taskId: taskId as never, userId: user.id, status });
    } catch (error) {
      showToast({ type: "error", title: "No se pudo mover la tarea", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    }
  };

  return (
    <Screen padded={false}>
      <BoardHeader
        aiResult={aiResult}
        isAnalyzing={isAnalyzing}
        onRefresh={() => void refreshWithAi()}
      />
      <BoardTabs activeView={activeView} onChangeView={setActiveView} />

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
          style={styles.flowBoard}
        >
          {boardColumns.map((column) => {
            const columnTasks = tasks.filter((task) => {
              if (column.status === "overdue") return task.status !== "completed" && isOverdueTask(task.dueDate);
              return task.status === column.status && (column.status === "completed" || !isOverdueTask(task.dueDate));
            });

            return (
              <View key={column.status} style={[styles.column, { width: columnWidth }]}>
                <View style={styles.columnHeader}>
                  <AppText color={column.status === "overdue" ? colors.danger : colors.text} variant="h3" style={styles.columnTitle}>
                    {column.title}
                  </AppText>
                  <View style={styles.columnCount}>
                    <AppText color={colors.textSecondary} style={styles.columnCountText}>
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
                      const isAiDetailExpanded = expandedAiTaskIds.includes(task._id);
                      const aiDetailsLength = (insight?.reasoning?.length ?? 0) + (insight?.suggestedAction?.length ?? 0);
                      const canExpandAiDetails = aiDetailsLength > 150;

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
                            {isCritical && <AppText color={colors.danger} variant="caption" style={styles.aiTaskMetaText}>Crítica</AppText>}
                            {insight?.priority && <AppText color={colors.primary} variant="caption" style={styles.aiTaskMetaText}>IA: prioridad {getAiPriorityLabel(insight.priority)}</AppText>}
                            {insight?.estimatedMinutes && <AppText color={colors.textSecondary} variant="caption" style={styles.aiTaskMetaText}>{insight.estimatedMinutes} min estimados</AppText>}
                            {insight?.complexityScore !== undefined && <AppText color={colors.textSecondary} variant="caption" style={styles.aiTaskMetaText}>Complejidad {insight.complexityScore}/5</AppText>}
                            {insight?.confidence !== undefined && <AppText color={colors.textSecondary} variant="caption" style={styles.aiTaskMetaText}>Confianza {Math.round(insight.confidence * 100)}%</AppText>}
                          </View>
                        )}
                        {!!insight?.reasoning && <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={isAiDetailExpanded ? undefined : 2} style={styles.aiTaskReasoning}>Por qué: {insight.reasoning}</AppText>}
                        {!!insight?.suggestedAction && <AppText color={colors.primary} variant="bodySmall" numberOfLines={isAiDetailExpanded ? undefined : 2} style={styles.aiTaskAction}>Siguiente paso: {insight.suggestedAction}</AppText>}
                        {canExpandAiDetails && <Pressable
                          accessibilityRole="button"
                          onPress={() => setExpandedAiTaskIds((current) => isAiDetailExpanded ? current.filter((id) => id !== task._id) : [...current, task._id])}
                          style={styles.aiTaskToggle}
                        >
                          <AppText color={colors.text} variant="caption" style={styles.aiTaskToggleText}>{isAiDetailExpanded ? "Ver menos" : "Ver más"}</AppText>
                        </Pressable>}
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
        <ScrollView contentContainerStyle={styles.aiContent} showsVerticalScrollIndicator={false} style={styles.aiScroll}>
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
                <CriticalPathJourney
                  taskDetails={tasks as BoardTask[]}
                  tasks={aiResult.criticalTasks}
                />
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
              <View style={[styles.aiSectionIntro, styles.planSectionIntro]}>
                <AppText variant="h2">Plan semanal</AppText>
                <AppText color={colors.textSecondary} style={styles.aiSectionDescription}>
                  {aiResult.weekStart && aiResult.weekEnd ? `${formatPlanDate(aiResult.weekStart)} — ${formatPlanDate(aiResult.weekEnd)}` : "Tu distribución de estudio recomendada."}
                </AppText>
              </View>
              {!!planInsight && (
                <View style={styles.planInsight}>
                  <AppText color={colors.primary} style={styles.planInsightIcon}>✦</AppText>
                  <View style={styles.planInsightCopy}>
                    <AppText color={colors.textSecondary} numberOfLines={isPlanSummaryExpanded ? undefined : 2} style={styles.planInsightText}>{planInsight}</AppText>
                    {planInsight.length > 120 && (
                      <Pressable onPress={() => setIsPlanSummaryExpanded((isExpanded) => !isExpanded)}>
                        <AppText color={colors.primary} variant="caption" style={styles.planInsightToggle}>{isPlanSummaryExpanded ? "Ver menos" : "Ver más"}</AppText>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
              <View style={styles.planSummary}>
                <AppText color={colors.textSecondary} style={styles.planSummaryText}>{aiResult.totalPlannedMinutes ?? 0} min programados</AppText>
                <View style={styles.planSummaryDot} />
                <AppText color={colors.textSecondary} style={styles.planSummaryText}>{aiResult.unscheduledMinutes ?? 0} min sin programar</AppText>
              </View>
              <View style={styles.weeklyPlan}>
                {planDates.map((date) => {
                  const dayBlocks = aiResult.blocks.filter((block) => block.date === date);
                  const isToday = isTodayPlanDate(date);
                  const dayLabel = formatPlanDate(date);

                  return (
                    <View key={date} style={styles.weekDaySection}>
                      <View style={styles.weekDayHeader}>
                        <View style={[styles.weekDayMarker, isToday && styles.weekDayMarkerToday]} />
                        <AppText color={isToday ? colors.primary : colors.text} numberOfLines={1} style={styles.weekDayTitle}>{`${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)}`}</AppText>
                        <View style={styles.weekDayCount}>
                          <AppText color={colors.textSecondary} style={styles.weekDayCountText}>{dayBlocks.length}</AppText>
                        </View>
                        {isToday && <AppText color={colors.primary} variant="caption" style={styles.weekDayTodayLabel}>Hoy</AppText>}
                      </View>
                      {dayBlocks.length > 0 ? (
                        <View style={styles.weekDayBlocks}>
                          {dayBlocks.map((block) => {
                            const localTask = tasks.find((task) => task._id === block.taskId);
                            return (
                              <Card key={`${block.taskId}-${block.date}-${block.startTime}`} style={styles.planBlockCard}>
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
                        </View>
                      ) : (
                        <View style={styles.weekDayEmpty}>
                          <AppText color={colors.textMuted} variant="caption">Sin bloques programados</AppText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
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
