import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useCallback, useEffect, useState } from "react";

const API_URL = "https://api-pleno.onrender.com";

type ClassroomSyncResult = {
  totalSynced?: number;
};

type ApiTask = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  dueDate?: number | string;
  courseName?: string;
  status?: "todo" | "in_progress" | "done" | "completed";
  priority?: "low" | "medium" | "high";
  source?: string;
};

export type Task = {
  _id: string;
  title: string;
  description: string;
  dueDate?: number;
  courseName: string;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  source?: string;
};

type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "dueDate" | "priority">> & {
  status?: Task["status"];
};

function getErrorMessage(responseText: string, fallback: string) {
  try {
    const payload = JSON.parse(responseText) as { message?: string | string[] };
    return Array.isArray(payload.message) ? payload.message.join("\n") : payload.message || fallback;
  } catch {
    return responseText || fallback;
  }
}

async function getAccessToken() {
  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) throw new Error("No se encontró una sesión de Google válida.");
  return accessToken;
}

async function fetchWithTimeout(input: RequestInfo, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("La API tardó demasiado en responder. Inténtalo de nuevo.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTask(task: ApiTask): Task | null {
  const taskId = task._id ?? task.id;
  if (!taskId || !task.title) return null;

  const parsedDueDate = typeof task.dueDate === "string" ? Date.parse(task.dueDate) : task.dueDate;
  const status = task.status === "done" || task.status === "completed" ? "completed" : task.status;

  return {
    _id: taskId,
    title: task.title,
    description: task.description ?? "",
    dueDate: Number.isFinite(parsedDueDate) ? parsedDueDate : undefined,
    courseName: task.courseName ?? "General",
    status: status === "completed" ? "completed" : status === "in_progress" ? "in_progress" : "todo",
    priority: task.priority ?? "medium",
    source: task.source,
  };
}

export async function getTasks(): Promise<Task[]> {
  const accessToken = await getAccessToken();
  const response = await fetchWithTimeout(`${API_URL}/v1/tasks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const responseText = await response.text();

  if (__DEV__) {
    console.log("GET /v1/tasks:", response.status, responseText);
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(responseText, "No se pudieron obtener las tareas."));
  }

  if (!responseText) return [];

  const payload = JSON.parse(responseText) as ApiTask[] | { data?: ApiTask[]; tasks?: ApiTask[] };
  const taskList = Array.isArray(payload) ? payload : payload.data ?? payload.tasks ?? [];
  return taskList.map(normalizeTask).filter((task): task is Task => task !== null);
}

export async function updateTask(taskId: string, updates: UpdateTaskInput) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_URL}/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...updates,
      status: updates.status === "completed" ? "done" : updates.status,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(getErrorMessage(responseText, "No se pudo actualizar la tarea."));
  }
}

export function useTasks(enabled: boolean) {
  const [tasks, setTasks] = useState<Task[] | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTasks([]);
      return;
    }

    setTasks(await getTasks());
  }, [enabled]);

  useEffect(() => {
    void refresh().catch((error) => {
      if (__DEV__) console.warn("No se pudieron cargar las tareas:", error);
      setTasks([]);
    });
  }, [refresh]);

  return { tasks, refresh };
}

export async function syncClassroomTasks(accessToken: string): Promise<ClassroomSyncResult> {
  const response = await fetch(`${API_URL}/v1/tasks/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ accessToken }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "No se pudo sincronizar Google Classroom.");
  }

  const responseText = await response.text();
  return responseText ? (JSON.parse(responseText) as ClassroomSyncResult) : {};
}
