import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFeedback } from "@/components/feedback";
import { AiRefreshResult, refreshTasksWithAi } from "@/features/planner/api";
import { boardColumns, formatPlanDate, getDueLabel, isOverdueTask, keepActionableAiResult, TaskStatus } from "@/features/planner/boardUtils";
import { BoardHeader, BoardView } from "@/features/planner/components/BoardHeader";
import { BoardTabs } from "@/features/planner/components/BoardTabs";
import { CriticalPathJourney } from "@/features/planner/components/CriticalPathJourney";
import { styles } from "@/features/planner/styles";
import { colors, spacing } from "@/theme";

type StoredPlan = {
  plan: {
    _id: string;
    marginMinutes: number;
    totalAvailableMinutes: number;
    totalPlannedMinutes: number;
    unscheduledMinutes?: number;
    unscheduledTaskIds?: string[];
    weekEnd: string;
    weekStart: string;
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
  aiEstimatedMinutes?: number;
  aiRecommendedPriority?: "low" | "medium" | "high";
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
      if (!minutesByTask.has(task._id)) return [];
      return [{
        taskId: task._id,
        estimatedMinutes: task.aiEstimatedMinutes,
        priority: task.aiRecommendedPriority ?? task.priority,
      }];
    }),
    reusedTasks: 0,
    totalPlannedMinutes: planData.plan.totalPlannedMinutes,
    unscheduledTaskIds: planData.plan.unscheduledTaskIds ?? [],
    warnings: planData.plan.unscheduledMinutes ? ["Hay tiempo pendiente por acomodar."] : [],
    weekEnd: planData.plan.weekEnd,
    weekStart: planData.plan.weekStart,
  };
}

export default function BoardScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { hideLoading, showLoading, showToast } = useFeedback();
  const tasks = useQuery(api.tasks.getTasksByUser, user ? { userId: user.id } : "skip");
  const latestStudyPlan = useQuery(tasksApi.getLatestStudyPlan, user ? { userId: user.id } : "skip") as StoredPlan | null | undefined;
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

  useEffect(() => {
    if (!latestStudyPlan || !tasks) return;

    const restoredResult = keepActionableAiResult(
      restoreAiResult(latestStudyPlan, tasks as BoardTask[]),
      actionableTaskIds
    );
    setAiResult(restoredResult);
    setSelectedPlanDate((currentDate) =>
      currentDate && restoredResult.blocks.some((block) => block.date === currentDate)
        ? currentDate
        : restoredResult.blocks[0]?.date ?? null
    );
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
      setSelectedPlanDate(actionableResult.blocks[0]?.date ?? null);
      setActiveView("critical");
      showToast({ type: "success", title: "Tu plan está listo", message: "Revisa tu ruta crítica y el plan semanal." });
    } catch (error) {
      showToast({ type: "error", title: "No se pudo actualizar con IA", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
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
                            {isCritical && <AppText color={colors.danger} variant="caption" style={styles.aiTaskMetaText}>Crítica</AppText>}
                            {insight?.priority && <AppText color={colors.primary} variant="caption" style={styles.aiTaskMetaText}>IA: prioridad {getAiPriorityLabel(insight.priority)}</AppText>}
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
