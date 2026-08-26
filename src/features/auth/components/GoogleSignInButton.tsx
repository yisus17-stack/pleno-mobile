import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import GoogleIcon from "@/assets/icons/google.svg";
import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export function GoogleSignInButton({
  onPress,
  loading = false,
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <GoogleIcon width={22} height={22} />
          <AppText style={styles.text}>Continuar con Google</AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },

  text: {
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.65,
  },
});
