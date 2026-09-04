import { GoogleSignin } from "@react-native-google-signin/google-signin";

type JsonRecord = Record<string, unknown>;

export type AiTaskInsight = {
  taskId: string;
  priority?: "low" | "medium" | "high";
  estimatedMinutes?: number;
  complexityScore?: number;
  confidence?: number;
  reasoning?: string;
  suggestedAction?: string;
};

export type CriticalTask = {
  taskId: string;
  title?: string;
  estimatedMinutes?: number;
  deadlineRisk?: string;
};

export type StudyBlock = {
  date: string;
  taskId: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  reason?: string;
};

export type AiRefreshResult = {
  analyzedTasks: number;
  reusedTasks: number;
  summary?: string;
  workloadRisk?: string;
  criticalTaskIds: string[];
  criticalTasks: CriticalTask[];
  weekStart?: string;
  weekEnd?: string;
  totalPlannedMinutes?: number;
  unscheduledMinutes?: number;
  unscheduledTaskIds: string[];
  blocks: StudyBlock[];
  warnings: string[];
  insights: AiTaskInsight[];
};

export function getAiRefreshErrorFeedback(error: unknown) {
  const technicalMessage = error instanceof Error ? error.message.toLocaleLowerCase("en-US") : "";

  if (technicalMessage.includes("sesion") || technicalMessage.includes("session") || technicalMessage.includes("token")) {
    return {
      title: "Tu sesión ya no está disponible",
      message: "Inicia sesión de nuevo para poder actualizar tu plan.",
    };
  }

  return {
    title: "El agente de IA no está disponible",
    message: "No pudimos organizar tu plan en este momento. Inténtalo de nuevo en unos minutos.",
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getResponseData(value: unknown) {
  if (!isRecord(value)) return {};
  if (isRecord(value.data)) return value.data;
  if (isRecord(value.payload)) return value.payload;
  return value;
}

function getApiUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_PLANNER_API_URL;
  if (!apiUrl) throw new Error("Falta EXPO_PUBLIC_PLANNER_API_URL en .env.local.");
  return apiUrl.replace(/\/$/, "");
}

function parseAiRefreshResponse(payload: unknown): AiRefreshResult {
  if (!isRecord(payload)) throw new Error("La API devolvio una respuesta invalida.");

  const responseData = getResponseData(payload);
  const analysis = isRecord(responseData.analysis) ? responseData.analysis : responseData;
  const batchAnalysis = isRecord(analysis.batchAnalysis) ? analysis.batchAnalysis : {};
  const criticalPath = getResponseData(responseData.criticalPath);
  const plan = getResponseData(responseData.plan);
  const rawInsights = Array.isArray(analysis.tasks) ? analysis.tasks : [];
  const insights = rawInsights.flatMap((item) => {
    if (!isRecord(item)) return [];
    const taskId = getString(item.taskId);
    if (!taskId) return [];

    const rawPriority = getString(item.priorityIA);
    const priority: AiTaskInsight["priority"] = rawPriority === "low" || rawPriority === "medium" || rawPriority === "high"
      ? rawPriority
      : undefined;
    return [{
      taskId,
      priority,
      estimatedMinutes: getNumber(item.estimatedMinutes),
      complexityScore: getNumber(item.complexityScore),
      confidence: getNumber(item.confidence),
      reasoning: getString(item.reasoning),
      suggestedAction: getString(item.suggestedAction),
    }];
  });
  const rawCriticalTasks = Array.isArray(criticalPath.tasks) ? criticalPath.tasks : [];
  const criticalTasks = rawCriticalTasks.flatMap((item) => {
    if (!isRecord(item)) return [];
    const taskId = getString(item.taskId);
    if (!taskId) return [];

    return [{
      taskId,
      title: getString(item.title),
      estimatedMinutes: getNumber(item.estimatedMinutes),
      deadlineRisk: getString(item.deadlineRisk),
    }];
  });
  const rawBlocks = Array.isArray(plan.blocks) ? plan.blocks : [];
  const blocks = rawBlocks.flatMap((item) => {
    if (!isRecord(item)) return [];
    const date = getString(item.date);
    const taskId = getString(item.taskId);
    const startTime = getString(item.startTime);
    const endTime = getString(item.endTime);
    const plannedMinutes = getNumber(item.plannedMinutes);
    if (!date || !taskId || !startTime || !endTime || plannedMinutes === undefined) return [];

    return [{ date, taskId, startTime, endTime, plannedMinutes, reason: getString(item.reason) }];
  });

  return {
    analyzedTasks: getNumber(analysis.analyzedTasks) ?? 0,
    reusedTasks: getNumber(analysis.reusedTasks) ?? 0,
    summary: getString(batchAnalysis.summary) ?? getString(batchAnalysis.resumen) ?? getString(analysis.summary),
    workloadRisk: getString(batchAnalysis.workloadRisk),
    criticalTaskIds: getStringArray(criticalPath.criticalTaskIds),
    criticalTasks,
    weekStart: getString(plan.weekStart),
    weekEnd: getString(plan.weekEnd),
    totalPlannedMinutes: getNumber(plan.totalPlannedMinutes),
    unscheduledMinutes: getNumber(plan.unscheduledMinutes),
    unscheduledTaskIds: getStringArray(plan.unscheduledTaskIds),
    blocks,
    warnings: getStringArray(plan.warnings),
    insights,
  };
}

export async function refreshTasksWithAi(): Promise<AiRefreshResult> {
  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) throw new Error("No se encontro una sesion de Google valida.");

  const response = await fetch(`${getApiUrl()}/v1/agent/tasks/refresh?force=false`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const responseText = await response.text();
  let payload: unknown;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
 
  } catch {
    throw new Error("La API no devolvio JSON valido.");
  }

  if (!response.ok) {
    const message = isRecord(payload) ? getString(payload.message) : undefined;
    throw new Error(message || "No se pudo actualizar el analisis con IA.");
  }

  return parseAiRefreshResponse(payload);
}
