import { Text, TextProps, StyleSheet } from "react-native";
import { colors, typography } from "@/theme";

type AppTextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySmall"
  | "caption";

interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: string;
}

export function AppText({
  variant = "body",
  color = colors.text,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles.base,
        { fontSize: typography[variant], color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: "400",
  },
});