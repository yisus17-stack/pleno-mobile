import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function getExpoPushToken() {
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notificaciones de PLENO",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const finalStatus = existingStatus === "granted"
    ? existingStatus
    : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("No se encontró el projectId de EAS para notificaciones.");

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
