import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppText, Card } from "@/components/ui";
import { CriticalTask } from "@/features/planner/api";
import { getDeadlineRiskLabel } from "@/features/planner/boardUtils";
import { styles } from "@/features/planner/styles";
import { colors } from "@/theme";

type TaskDetail = {
  _id: string;
  description?: string;
  dueDate?: number;
  title: string;
};

type CriticalPathJourneyProps = {
  taskDetails: TaskDetail[];
  tasks: CriticalTask[];
};

function getRiskColor(risk?: string) {
  if (risk === "overdue" || risk === "at_risk") return colors.danger;
  if (risk === "safe") return colors.success;
  return colors.primary;
}

function formatTaskDeadline(dueDate?: number) {
  if (!dueDate) return "Sin fecha";

  const due = new Date(dueDate);
  const dateLabel = due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const hasSpecificTime = due.getHours() !== 0 || due.getMinutes() !== 0;
  if (!hasSpecificTime) return dateLabel;

  return `${dateLabel}, ${due.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
}

export function CriticalPathJourney({ taskDetails, tasks }: CriticalPathJourneyProps) {
  const taskById = new Map(taskDetails.map((task) => [task._id, task]));

  return (
    <View style={styles.criticalRoute}>
      <View style={styles.criticalRouteLine} />
      {tasks.map((task, index) => {
        const detail = taskById.get(task.taskId);
        const riskColor = getRiskColor(task.deadlineRisk);
        return (
          <View key={task.taskId} style={styles.criticalRouteStep}>
            <View style={styles.criticalRouteOrder}>
              <AppText color={colors.white} style={styles.criticalRouteOrderText}>{index + 1}</AppText>
            </View>
            <Card style={styles.criticalRouteCard}>
              <View style={styles.criticalRouteCardBody}>
                <View style={styles.criticalRouteTitleRow}>
                  <View style={styles.criticalRouteTitleCopy}>
                    <AppText numberOfLines={2} style={styles.criticalRouteTitle}>{task.title || detail?.title || "Tarea sin título"}</AppText>
                    <View style={styles.criticalRouteRiskRow}>
                      <View style={[styles.criticalRouteRiskDot, { backgroundColor: riskColor }]} />
                      <AppText color={riskColor} variant="caption" style={styles.criticalRouteRiskText}>
                        {task.deadlineRisk ? `RIESGO ${getDeadlineRiskLabel(task.deadlineRisk).toUpperCase()}` : "RUTA CRÍTICA"}
                      </AppText>
                    </View>
                  </View>
                  <Svg height={22} viewBox="0 0 24 24" width={22} fill="none">
                    <Path d="m9 6 6 6-6 6" stroke={colors.textSecondary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </Svg>
                </View>
                <AppText color={colors.textSecondary} variant="caption" style={styles.criticalRouteMeta}>
                  {task.estimatedMinutes ?? "—"} min · {formatTaskDeadline(detail?.dueDate)}
                </AppText>
                {!!detail?.description?.trim() && (
                  <AppText color={colors.textSecondary} variant="caption" numberOfLines={2} style={styles.criticalRouteDescription}>
                    {detail.description}
                  </AppText>
                )}
              </View>
            </Card>
          </View>
        );
      })}
    </View>
  );
}
