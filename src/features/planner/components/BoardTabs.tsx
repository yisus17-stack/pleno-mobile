import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui";
import { BoardView } from "@/features/planner/components/BoardHeader";
import { styles } from "@/features/planner/styles";
import { colors } from "@/theme";

type BoardTabsProps = {
  activeView: BoardView;
  onChangeView: (view: BoardView) => void;
};

export function BoardTabs({ activeView, onChangeView }: BoardTabsProps) {
  return <View style={styles.viewTabs}>
    {(["flow", "critical", "plan"] as const).map((view) => {
      const label = view === "flow" ? "Flujo" : view === "critical" ? "Ruta crítica" : "Plan semanal";
      const isActive = activeView === view;

      return <Pressable key={view} accessibilityRole="button" onPress={() => onChangeView(view)} style={[styles.viewTab, isActive && styles.viewTabActive]}>
        <AppText color={isActive ? colors.primary : colors.textSecondary} style={styles.viewTabText}>{label}</AppText>
      </Pressable>;
    })}
  </View>;
}
