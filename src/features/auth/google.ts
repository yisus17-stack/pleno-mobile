import { GoogleSignin } from "@react-native-google-signin/google-signin";

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId:
      "383449093256-cclli1g3ioljn0v36rdkucni8t18hlgk.apps.googleusercontent.com",
    scopes: [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    ],
  });
}
