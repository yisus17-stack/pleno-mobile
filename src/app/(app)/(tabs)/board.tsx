import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery } from "convex/react";

import { api } from "@convex/_generated/api";
import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { colors, radius, spacing } from "@/theme";

type TaskStatus = "todo" | "in_progress" | "completed";

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

export default function BoardScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const tasks = useQuery(api.tasks.getTasksByUser, user ? { userId: user.id } : "skip");
  const updateTask = useMutation(api.tasks.updateTask);
  const columnWidth = Math.max(288, width - spacing.xl * 2);

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
        <AppText color={colors.white} variant="h1">
          Tu tablero
        </AppText>
        <AppText color={colors.white} style={styles.headerDescription}>
          Organiza tu flujo y avanza una tarea a la vez.
        </AppText>
        <AppText color={colors.white} style={styles.headerHint}>
          Desliza para ver cada columna.
        </AppText>
        <View style={styles.aiButton}>
          <View style={styles.aiBadge}>
            <AppText color={colors.primary} style={styles.aiBadgeText}>
              IA
            </AppText>
          </View>
          <View>
            <AppText color={colors.primary} style={styles.aiButtonTitle}>
              Priorizar con IA
            </AppText>
            <AppText color={colors.textSecondary} variant="caption" style={styles.aiButtonCaption}>
              Próximamente
            </AppText>
          </View>
        </View>
      </View>

      {!tasks ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={styles.columnsContent}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          snapToInterval={columnWidth + spacing.md}
          snapToAlignment="start"
        >
          {boardColumns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);

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
                    columnTasks.map((task) => (
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
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    minHeight: 232,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  headerDescription: { lineHeight: 22, marginTop: spacing.sm },
  headerHint: { fontSize: 13, fontWeight: "600", marginTop: spacing.lg, opacity: 0.82 },
  aiButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: "row",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  aiBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
    height: 30,
    justifyContent: "center",
    marginRight: spacing.sm,
    width: 30,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700" },
  aiButtonTitle: { fontSize: 13, fontWeight: "700" },
  aiButtonCaption: { marginTop: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  columnsContent: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  column: {
    backgroundColor: colors.surface,
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
  taskMeta: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, paddingTop: spacing.md },
  moveButton: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  moveButtonText: { fontWeight: "700" },
  moveButtonPressed: { opacity: 0.72 },
});
