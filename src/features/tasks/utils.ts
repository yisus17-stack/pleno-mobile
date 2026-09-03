import { colors } from "@/theme";

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "completed";

export function getDueLabel(dueDate?: number) {
  if (!dueDate) return "Sin fecha";

  const due = new Date(dueDate);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const startOfDayAfterTomorrow = startOfTomorrow + 24 * 60 * 60 * 1000;

  if (dueDate < startOfTomorrow && dueDate >= startOfToday) return "Hoy";
  if (dueDate < startOfDayAfterTomorrow && dueDate >= startOfTomorrow) return "Mañana";

  return due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function isTaskOverdue(dueDate?: number) {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const hasSpecificTime = due.getHours() !== 0 || due.getMinutes() !== 0 || due.getSeconds() !== 0 || due.getMilliseconds() !== 0;

  if (hasSpecificTime) return dueDate < Date.now();

  // Google Classroom representa una fecha sin hora como medianoche. Esa tarea vence al terminar el día, no al iniciarlo.
  const endOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999).getTime();
  return endOfDueDay < Date.now();
}

export function getDueTime(dueDate?: number) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  if (due.getHours() === 0 && due.getMinutes() === 0) return null;

  return due.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function getPriorityDetails(priority: TaskPriority) {
  switch (priority) {
    case "high":
      return { label: "Alta", color: colors.danger, background: "#FFF0F0" };
    case "medium":
      return { label: "Media", color: colors.warning, background: "#FFF8E7" };
    default:
      return { label: "Baja", color: colors.success, background: "#EFFAF3" };
  }
}

export function getStatusLabel(status: TaskStatus) {
  if (status === "in_progress") return "En progreso";
  if (status === "completed") return "Completada";
  return "Pendiente";
}

export function getSourceDetails(source?: string) {
  if (source === "google_classroom") {
    return { background: "#EAF6FF", color: "#2476B9", label: "Classroom" };
  }

  return { background: colors.surfaceSecondary, color: colors.textSecondary, label: "Manual" };
}

export function formatSelectedDate(date: Date) {
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function formatSelectedTime(date: Date) {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function normalizePickerDate(date: Date) {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12);
}

export function toPickerCalendarDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function getMinimumTaskDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
}

export function buildManualDueDate(date: Date | null, time: Date | null) {
  if (!date) return undefined;

  const dueDate = new Date(date);
  dueDate.setHours(time?.getHours() ?? 23, time?.getMinutes() ?? 59, time ? 0 : 59, time ? 0 : 999);
  return dueDate.getTime();
}
