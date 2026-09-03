import { GoogleSignin } from "@react-native-google-signin/google-signin";

const API_URL = "https://api-pleno.onrender.com";

type ClassroomSyncResult = {
  totalSynced?: number;
};

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
