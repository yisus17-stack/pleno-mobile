import { PropsWithChildren } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

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
    <SafeAreaView style={styles.safeArea}>
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
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
  },

  padded: {
    paddingHorizontal: spacing.xl,
  },
});