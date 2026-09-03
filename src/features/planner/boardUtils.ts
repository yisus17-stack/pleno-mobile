import { AiRefreshResult } from "@/features/planner/api";
import { colors } from "@/theme";

export type TaskStatus = "todo" | "in_progress" | "completed";
type BoardColumnStatus = TaskStatus | "overdue";

export const boardColumns: Array<{
  status: BoardColumnStatus;
  title: string;
  color: string;
  textColor: string;
  emptyMessage: string;
  actionLabel: string;
  nextStatus: TaskStatus;
}> = [
  { status: "todo", title: "Pendientes", color: colors.accent, textColor: colors.text, emptyMessage: "No tienes tareas pendientes.", actionLabel: "Empezar tarea", nextStatus: "in_progress" },
  { status: "in_progress", title: "En progreso", color: colors.primary, textColor: colors.white, emptyMessage: "Elige una tarea para comenzar.", actionLabel: "Marcar completada", nextStatus: "completed" },
  { status: "completed", title: "Completadas", color: "#2476B9", textColor: colors.white, emptyMessage: "Tus avances aparecerán aquí.", actionLabel: "Reabrir tarea", nextStatus: "todo" },
  { status: "overdue", title: "Vencidas", color: colors.danger, textColor: colors.white, emptyMessage: "No tienes tareas vencidas.", actionLabel: "Marcar completada", nextStatus: "completed" },
];

export function getDueLabel(dueDate?: number) {
  if (!dueDate) return "Sin fecha";
  const due = new Date(dueDate);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  if (dueDate >= startOfToday && dueDate < startOfTomorrow) return "Hoy";
  return due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function isOverdueTask(dueDate?: number) {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const hasSpecificTime = due.getHours() !== 0 || due.getMinutes() !== 0 || due.getSeconds() !== 0 || due.getMilliseconds() !== 0;
  if (hasSpecificTime) return dueDate < Date.now();

  const endOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
  return endOfDueDay < Date.now();
}

export function keepActionableAiResult(result: AiRefreshResult, actionableTaskIds: Set<string>): AiRefreshResult {
  const criticalTaskIds = result.criticalTaskIds.filter((taskId) => actionableTaskIds.has(taskId));
  const criticalTasks = result.criticalTasks.filter((task) => actionableTaskIds.has(task.taskId));
  const blocks = result.blocks.filter((block) => actionableTaskIds.has(block.taskId));
  const insights = result.insights.filter((insight) => actionableTaskIds.has(insight.taskId));
  const unscheduledTaskIds = result.unscheduledTaskIds.filter((taskId) => actionableTaskIds.has(taskId));
  const analyzedTaskIds = new Set([...criticalTaskIds, ...blocks.map((block) => block.taskId), ...insights.map((insight) => insight.taskId)]);

  return { ...result, analyzedTasks: analyzedTaskIds.size, blocks, criticalTaskIds, criticalTasks, insights, totalPlannedMinutes: blocks.reduce((total, block) => total + block.plannedMinutes, 0), unscheduledTaskIds };
}

export function formatPlanDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? date : parsedDate.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
}

export function getPlanWeekDates(weekStart?: string, fallbackDates: string[] = []) {
  if (!weekStart) return fallbackDates;

  const start = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return fallbackDates;

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

export function getPlanDayLabel(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return date;

  const label = parsedDate.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function getPlanDayNumber(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? "" : String(parsedDate.getDate());
}

export function isTodayPlanDate(date: string) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return date === todayKey;
}

export function isPastPlanDate(date: string) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return date < todayKey;
}

export function getDeadlineRiskLabel(risk?: string) {
  if (risk === "at_risk") return "En riesgo";
  if (risk === "overdue") return "Vencida";
  if (risk === "safe") return "A tiempo";
  return "Por revisar";
}
