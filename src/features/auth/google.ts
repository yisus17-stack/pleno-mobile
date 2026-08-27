import { GoogleSignin } from "@react-native-google-signin/google-signin";

export const classroomScopes = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
];

export function configureGoogleSignIn() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    throw new Error("Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en las variables de entorno.");
  }

  GoogleSignin.configure({
    webClientId,
  });
}
