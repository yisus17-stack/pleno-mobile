import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const TASK_REMINDERS_KEY = "@pleno/task-reminders";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getReminderIds() {
  const stored = await AsyncStorage.getItem(TASK_REMINDERS_KEY);
  return stored ? (JSON.parse(stored) as Record<string, string>) : {};
}

async function saveReminderIds(reminderIds: Record<string, string>) {
  await AsyncStorage.setItem(TASK_REMINDERS_KEY, JSON.stringify(reminderIds));
}

async function requestNotificationPermission() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      importance: Notifications.AndroidImportance.HIGH,
      name: "Recordatorios de PLENO",
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === "granted") return true;

  const request = await Notifications.requestPermissionsAsync();
  return request.status === "granted";
}

export async function cancelTaskReminder(taskId: string) {
  const reminderIds = await getReminderIds();
  const notificationId = reminderIds[taskId];
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } finally {
    delete reminderIds[taskId];
    await saveReminderIds(reminderIds);
  }
}

export async function syncTaskReminder({ dueDate, taskId, title }: { dueDate?: number; taskId: string; title: string }) {
  try {
    await cancelTaskReminder(taskId);
    if (!dueDate || dueDate <= Date.now()) return;
    if (!(await requestNotificationPermission())) return;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        body: `Vence ahora: ${title}`,
        sound: "default",
        title: "Tarea pendiente",
      },
      trigger: {
        channelId: "default",
        date: dueDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });

    const reminderIds = await getReminderIds();
    reminderIds[taskId] = notificationId;
    await saveReminderIds(reminderIds);
  } catch (error) {
    console.warn("No se pudo programar el recordatorio local:", error);
  }
}
