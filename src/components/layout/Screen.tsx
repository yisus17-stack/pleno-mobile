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
}

export function Screen({
  children,
  style,
  padded = true,
}: ScreenProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
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
