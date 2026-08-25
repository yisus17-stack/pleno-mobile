import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from "react-native";

import { AppText } from "./AppText";
import { colors, radius, spacing } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.white : colors.text}
        />
      ) : (
        <AppText
          style={styles.label}
          color={variant === "primary" ? colors.white : colors.text}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.lg,
  },

  primary: {
    backgroundColor: colors.primary,
  },

  secondary: {
    backgroundColor: colors.accent,
  },

  ghost: {
    backgroundColor: "transparent",
  },

  label: {
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.5,
  },
});