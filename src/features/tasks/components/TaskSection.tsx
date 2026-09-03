import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { Card, AppText } from "@/components/ui";
import { styles } from "@/features/tasks/styles";
import { getDueLabel, getDueTime, getPriorityDetails, getSourceDetails, getStatusLabel, isTaskOverdue, TaskPriority, TaskStatus } from "@/features/tasks/utils";
import { colors } from "@/theme";

export type TaskItem = {
  _id: string;
  courseName?: string;
  description: string;
  dueDate?: number;
  priority: TaskPriority;
  source?: string;
  status: TaskStatus;
  title: string;
};

export type TaskSectionData = {
  title: "Asignadas" | "Vencidas" | "Completadas";
  color: string;
  textColor: string;
  emptyMessage: string;
  tasks: TaskItem[];
};

function TaskCheckIcon({ completed }: { completed: boolean }) {
  return <Svg width={27} height={27} viewBox="0 0 28 28" fill="none">
    <Circle cx={14} cy={14} r={10} fill={completed ? colors.text : "none"} stroke={colors.text} strokeWidth={1.8} />
    {completed && <Path d="m8.5 14.2 3.3 3.4 7.5-8" stroke={colors.white} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />}
  </Svg>;
}

type TaskSectionProps = {
  expandedTaskId: string | null;
  isExpanded: boolean;
  onOpenMenu: (taskId: string) => void;
  onToggleExpanded: () => void;
  onToggleInstructions: (taskId: string) => void;
  onToggleTask: (task: TaskItem) => void;
  section: TaskSectionData;
};

export function TaskSection({ expandedTaskId, isExpanded, onOpenMenu, onToggleExpanded, onToggleInstructions, onToggleTask, section }: TaskSectionProps) {
  const titleColor = section.title === "Vencidas" ? colors.danger : colors.text;

  return <View style={styles.taskSection}>
    <Pressable
      accessibilityRole="button"
      onPress={onToggleExpanded}
      style={({ pressed }) => [
        styles.sectionHeader,
        !isExpanded && styles.sectionHeaderCollapsed,
        pressed && styles.sectionHeaderPressed,
      ]}
    >
      <AppText color={titleColor} variant="h3" style={styles.sectionTitle}>{section.title}</AppText>
      <View style={styles.sectionHeaderRight}>
        <View style={styles.sectionCount}>
          <AppText color={colors.textSecondary} style={styles.sectionCountText}>{section.tasks.length}</AppText>
        </View>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d={isExpanded ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5"} stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </Pressable>

    {isExpanded && section.tasks.length === 0 && <View style={styles.sectionEmpty}>
      <AppText color={colors.textSecondary} variant="bodySmall" style={styles.sectionEmptyText}>{section.emptyMessage}</AppText>
    </View>}

    {isExpanded && section.tasks.map((task) => {
      const priority = getPriorityDetails(task.priority);
      const source = getSourceDetails(task.source);
      const isCompleted = task.status === "completed";
      const isOverdue = !isCompleted && isTaskOverdue(task.dueDate);
      const hasInstructions = task.description.trim().length > 0;
      const isInstructionsExpanded = expandedTaskId === task._id;

      return <Card key={task._id} style={styles.taskCard}>
        <View style={styles.taskTopRow}>
          <View style={styles.taskTitleContainer}>
            <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={1} style={styles.courseName}>{task.courseName || "General"}</AppText>
            <AppText style={styles.taskTitle} numberOfLines={2}>{task.title}</AppText>
            {hasInstructions && <Pressable accessibilityRole="button" accessibilityState={{ expanded: isInstructionsExpanded }} onPress={() => onToggleInstructions(task._id)} style={styles.instructionsPreview}>
              <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={isInstructionsExpanded ? undefined : 2} style={styles.instructionsText}>{task.description}</AppText>
              <AppText color={colors.primary} variant="caption" style={styles.instructionsPreviewLabel}>{isInstructionsExpanded ? "Ver menos" : "Ver instrucciones"}</AppText>
            </Pressable>}
          </View>
          <View style={styles.taskActions}>
            <View style={styles.taskControls}>
              {task.source !== "google_classroom" && <Pressable accessibilityLabel={`Opciones de ${task.title}`} accessibilityRole="button" onPress={() => onOpenMenu(task._id)} style={styles.taskMenuTrigger}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={5} r={1.35} fill={colors.textSecondary} /><Circle cx={12} cy={12} r={1.35} fill={colors.textSecondary} /><Circle cx={12} cy={19} r={1.35} fill={colors.textSecondary} /></Svg>
              </Pressable>}
              <Pressable accessibilityLabel={isCompleted ? "Marcar como pendiente" : "Marcar como completada"} accessibilityRole="checkbox" accessibilityState={{ checked: isCompleted }} onPress={() => onToggleTask(task)} style={styles.taskCheckbox}><TaskCheckIcon completed={isCompleted} /></Pressable>
            </View>
            <View style={styles.taskSourceRow}>
              <View style={[styles.sourceBadge, { backgroundColor: source.background }]}><AppText color={source.color} style={styles.sourceBadgeText}>{source.label}</AppText></View>
            </View>
          </View>
        </View>
        <View style={styles.taskFooter}>
          <View style={styles.taskFooterStatus}>
            <AppText color={isOverdue ? colors.danger : colors.textSecondary} variant="caption">{isOverdue ? "Vencida" : getStatusLabel(task.status)}</AppText>
            <View style={[styles.priorityPill, { backgroundColor: priority.background }]}><AppText color={priority.color} style={styles.priorityText}>{priority.label}</AppText></View>
          </View>
          <View style={styles.dueDetails}>
            <AppText color={task.dueDate ? priority.color : colors.textMuted} variant="caption" style={styles.dueDate}>{getDueLabel(task.dueDate)}</AppText>
            {getDueTime(task.dueDate) && <AppText color={colors.textSecondary} variant="caption" style={styles.dueTime}>{getDueTime(task.dueDate)}</AppText>}
          </View>
        </View>
      </Card>;
    })}
  </View>;
}
