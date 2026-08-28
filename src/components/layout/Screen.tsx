import { PropsWithChildren } from "react";
import {
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/theme";

interface ScreenProps extends PropsWithChildren {
  style?: ViewStyle;
  padded?: boolean;
  safeAreaColor?: string;
}

export function Screen({
  children,
  style,
  padded = true,
  safeAreaColor = colors.primary,
}: ScreenProps) {
  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: safeAreaColor }]}>
      <View
        style={[
          styles.container,
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  padded: {
    paddingHorizontal: spacing.xl,
  },
});
