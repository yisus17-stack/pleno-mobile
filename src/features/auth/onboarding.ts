import AsyncStorage from "@react-native-async-storage/async-storage";

const onboardingKey = (googleId: string) => `pleno:onboarding-complete:${googleId}`;

export async function hasCompletedOnboarding(googleId: string) {
  try {
    return (await AsyncStorage.getItem(onboardingKey(googleId))) === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(googleId: string) {
  await AsyncStorage.setItem(onboardingKey(googleId), "true");
}
