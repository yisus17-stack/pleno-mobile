import { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Tabs } from "expo-router";

import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const tabDetails = {
  index: { label: "Inicio", icon: "home" },
  tasks: { label: "Tareas", icon: "tasks" },
  board: { label: "Tablero", icon: "board" },
  profile: { label: "Configuración", icon: "profile" },
} as const;

type TabIconName = (typeof tabDetails)[keyof typeof tabDetails]["icon"];

function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  const props = { stroke: color, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {name === "home" && <Path {...props} d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" />}
      {name === "tasks" && (
        <>
          <Rect {...props} x="4" y="4" width="16" height="16" rx="3" />
          <Path {...props} d="m8 10 1.5 1.5L12 8.8M8 15h8" />
        </>
      )}
      {name === "board" && (
        <>
          <Rect {...props} x="3" y="4" width="18" height="16" rx="3" />
          <Path {...props} d="M9 4v16M15 4v16M5.5 8h1M11.5 10h1M17.5 8h1" />
        </>
      )}
      {name === "profile" && (
        <>
          <Circle {...props} cx="12" cy="8" r="3.5" />
          <Path {...props} d="M4.5 21c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" />
        </>
      )}
    </Svg>
  );
}

interface TabButtonProps {
  label: string;
  icon: TabIconName;
  isFocused: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
  onLongPress: () => void;
}

function FloatingTabButton({
  label,
  icon,
  isFocused,
  accessibilityLabel,
  onPress,
  onLongPress,
}: TabButtonProps) {
  return (
    <View style={styles.tab}>
      {isFocused && <View style={styles.activeIndicator} />}
      <Pressable
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <TabIcon name={icon} color={isFocused ? colors.primary : colors.textSecondary} />
        <AppText
          variant="caption"
          color={isFocused ? colors.primary : colors.textSecondary}
          style={[styles.label, isFocused && styles.activeLabel]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const details = tabDetails[route.name as keyof typeof tabDetails];
          if (!details) return null;

          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View
              key={route.key}
              style={styles.tabSlot}
            >
              <FloatingTabButton
                label={details.label}
                icon={details.icon}
                isFocused={isFocused}
                accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    minHeight: 76,
    paddingVertical: spacing.sm,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: "#1A365D",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    width: "100%",
    height: 58,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
  },
  pressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: { fontSize: 11 },
  activeLabel: { fontWeight: "700" },
  activeIndicator: {
    position: "absolute",
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.78 },
});
