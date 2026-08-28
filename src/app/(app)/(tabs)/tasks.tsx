import { useMutation, useQuery } from "convex/react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { api } from "@convex/_generated/api";
import GoogleClassroomIcon from "@/assets/icons/google-classroom.svg";
import BannerImage from "@/assets/images/tareas_image.png";
import { Screen } from "@/components/layout";
import { AppText, Card } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { classroomScopes } from "@/features/auth/google";
import { syncClassroomTasks } from "@/features/classroom/api";
import { colors, radius, spacing } from "@/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

function TaskCheckIcon({ completed }: { completed: boolean }) {
  return (
    <Svg width={27} height={27} viewBox="0 0 28 28" fill="none">
      <Circle
        cx={14}
        cy={14}
        r={10}
        fill={completed ? colors.text : "none"}
        stroke={colors.text}
        strokeWidth={1.8}
      />
      {completed && (
        <Path
          d="m8.5 14.2 3.3 3.4 7.5-8"
          stroke={colors.white}
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function getDueLabel(dueDate?: number) {
  if (!dueDate) return "Sin fecha";

  const due = new Date(dueDate);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
  const startOfDayAfterTomorrow = startOfTomorrow + 24 * 60 * 60 * 1000;

  if (dueDate < startOfTomorrow && dueDate >= startOfToday) return "Hoy";
  if (dueDate < startOfDayAfterTomorrow && dueDate >= startOfTomorrow) return "Mañana";

  return due.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function getDueTime(dueDate?: number) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  if (due.getHours() === 0 && due.getMinutes() === 0) return null;

  return due.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function getPriorityDetails(priority: "low" | "medium" | "high") {
  switch (priority) {
    case "high":
      return { label: "Alta", color: colors.danger, background: "#FFF0F0" };
    case "medium":
      return { label: "Media", color: colors.warning, background: "#FFF8E7" };
    default:
      return { label: "Baja", color: colors.success, background: "#EFFAF3" };
  }
}

function getStatusLabel(status: "todo" | "in_progress" | "completed") {
  if (status === "in_progress") return "En progreso";
  if (status === "completed") return "Completada";
  return "Pendiente";
}

function getSourceDetails(source?: string) {
  if (source === "google_classroom") {
    return { background: "#EAF6FF", color: "#2476B9", label: "Classroom" };
  }

  return { background: colors.surfaceSecondary, color: colors.textSecondary, label: "Manual" };
}

function formatSelectedDate(date: Date) {
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatSelectedTime(date: Date) {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function buildManualDueDate(date: Date | null, time: Date | null) {
  if (!date) return undefined;

  const dueDate = new Date(date);
  dueDate.setHours(time?.getHours() ?? 23, time?.getMinutes() ?? 59, time ? 0 : 59, time ? 0 : 999);

  return dueDate.getTime();
}

export default function TasksScreen() {
  const { user } = useAuth();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const [isSyncingClassroom, setIsSyncingClassroom] = useState(false);
  const [isAssignedExpanded, setIsAssignedExpanded] = useState(true);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualDate, setManualDate] = useState<Date | null>(null);
  const [manualTime, setManualTime] = useState<Date | null>(null);
  const [manualPriority, setManualPriority] = useState<"low" | "medium" | "high">("medium");
  const [isCreatingManualTask, setIsCreatingManualTask] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [manualTaskMenuId, setManualTaskMenuId] = useState<string | null>(null);
  const listRef = useRef<ScrollView>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const formFieldOffsetsRef = useRef({ course: 0, description: 0 });
  const createSheetTranslateY = useRef(new Animated.Value(0)).current;
  const createSheetBackdropOpacity = useRef(new Animated.Value(1)).current;
  const isClosingCreateSheetRef = useRef(false);
  const createSheetDragDistanceRef = useRef(0);
  const tasks = useQuery(api.tasks.getTasksByUser, user ? { userId: user.id } : "skip");
  const updateTask = useMutation(api.tasks.updateTask);
  const createManualTask = useMutation(api.tasks.createManualTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  const allTasks = tasks ?? [];
  const editingTask = editingTaskId ? allTasks.find((task) => task._id === editingTaskId) ?? null : null;
  const manualTaskMenu = manualTaskMenuId ? allTasks.find((task) => task._id === manualTaskMenuId) ?? null : null;
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredTasks = normalizedSearch
    ? allTasks.filter((task) =>
        [task.title, task.courseName, task.description]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedSearch)
      )
    : allTasks;
  useEffect(() => {
    if (!taskId || !allTasks.some((task) => task._id === taskId)) return;

    setSelectedTaskId(taskId);
    setExpandedTaskId(taskId);
    setIsAssignedExpanded(true);
    setIsCompletedExpanded(true);
  }, [allTasks, taskId]);

  const sortSelectedFirst = (taskList: typeof allTasks) =>
    selectedTaskId
      ? [...taskList].sort((first, second) => Number(second._id === selectedTaskId) - Number(first._id === selectedTaskId))
      : taskList;

  const assignedTasks = sortSelectedFirst(filteredTasks.filter((task) => task.status === "todo"));
  const taskSections = [
    {
      title: "Asignadas",
      color: colors.accent,
      textColor: colors.text,
      emptyMessage: "No tienes tareas asignadas.",
      tasks: assignedTasks,
    },
    {
      title: "Completadas",
      color: "#2476B9",
      textColor: colors.white,
      emptyMessage: "Aún no has completado tareas.",
      tasks: sortSelectedFirst(filteredTasks.filter((task) => task.status === "completed")),
    },
  ];

  const handleTaskToggle = async (task: (typeof allTasks)[number]) => {
    if (!user) return;

    try {
      await updateTask({
        taskId: task._id as never,
        userId: user.id,
        status: task.status === "completed" ? "todo" : "completed",
      });
    } catch (error) {
      Alert.alert(
        "No se pudo actualizar la tarea",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    }
  };

  const handleClassroomSync = async () => {
    if (!user) {
      Alert.alert("Sesión no disponible", "Inicia sesión nuevamente para actualizar Classroom.");
      return;
    }

    setIsSyncingClassroom(true);

    try {
      const authorization = await GoogleSignin.addScopes({ scopes: classroomScopes });
      if (!authorization || authorization.type === "cancelled") return;

      const { accessToken } = await GoogleSignin.getTokens();
      const result = await syncClassroomTasks(accessToken);

      Alert.alert(
        "Classroom actualizado",
        result.totalSynced === 1
          ? "Se sincronizó 1 tarea."
          : typeof result.totalSynced === "number"
            ? `Se sincronizaron ${result.totalSynced} tareas.`
            : "Tus tareas se sincronizaron correctamente."
      );
    } catch (error) {
      Alert.alert(
        "No se pudo actualizar Classroom",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    } finally {
      setIsSyncingClassroom(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (!value.trim()) {
      setIsSearchFocused(false);
      Keyboard.dismiss();
    }
  };

  const resetManualTaskForm = () => {
    setManualTitle("");
    setManualCourseName("");
    setManualDescription("");
    setManualDate(null);
    setManualTime(null);
    setManualPriority("medium");
  };

  const presentCreateSheet = () => {
    isClosingCreateSheetRef.current = false;
    createSheetTranslateY.setValue(SCREEN_HEIGHT);
    createSheetBackdropOpacity.setValue(0);
    setIsCreateModalVisible(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(createSheetTranslateY, {
          damping: 22,
          stiffness: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(createSheetBackdropOpacity, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const openCreateManualTask = () => {
    resetManualTaskForm();
    setEditingTaskId(null);
    presentCreateSheet();
  };

  const openEditManualTask = () => {
    if (!manualTaskMenu) return;

    const existingDueDate = manualTaskMenu.dueDate ? new Date(manualTaskMenu.dueDate) : null;
    const hasSpecificTime = existingDueDate
      && !(existingDueDate.getHours() === 23 && existingDueDate.getMinutes() === 59);

    setEditingTaskId(manualTaskMenu._id);
    setManualTitle(manualTaskMenu.title);
    setManualCourseName(manualTaskMenu.courseName || "General");
    setManualDescription(manualTaskMenu.description);
    setManualDate(existingDueDate);
    setManualTime(hasSpecificTime ? existingDueDate : null);
    setManualPriority(manualTaskMenu.priority);
    setManualTaskMenuId(null);
    presentCreateSheet();
  };

  const animateCreateSheetOut = (onFinished?: () => void) => {
    // En Android el teclado ya no altera el alto de la hoja durante esta animación.
    Keyboard.dismiss();
    createSheetTranslateY.stopAnimation();

    Animated.parallel([
      Animated.timing(createSheetTranslateY, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
      }),
      Animated.timing(createSheetBackdropOpacity, {
        duration: 210,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        isClosingCreateSheetRef.current = false;
        return;
      }

      onFinished?.();
    });
  };

  const closeCreateModal = () => {
    if (isCreatingManualTask || isClosingCreateSheetRef.current) return;

    isClosingCreateSheetRef.current = true;
    const taskIdToReopenMenu = editingTaskId;

    animateCreateSheetOut(() => {
      setIsCreateModalVisible(false);
      setEditingTaskId(null);
      isClosingCreateSheetRef.current = false;

      if (taskIdToReopenMenu) {
        requestAnimationFrame(() => setManualTaskMenuId(taskIdToReopenMenu));
      }
    });
  };

  const handleSaveManualTask = async () => {
    if (!user) {
      Alert.alert("Sesión no disponible", "Inicia sesión nuevamente para crear una tarea.");
      return;
    }

    if (!manualTitle.trim()) {
      Alert.alert("Agrega un título", "Escribe el nombre de la tarea para continuar.");
      return;
    }

    const dueDate = buildManualDueDate(manualDate, manualTime);

    setIsCreatingManualTask(true);

    try {
      if (editingTask) {
        await updateTask({
          taskId: editingTask._id as never,
          userId: user.id,
          title: manualTitle.trim(),
          description: manualDescription.trim(),
          dueDate,
          priority: manualPriority,
        });
      } else {
        await createManualTask({
          userId: user.id,
          title: manualTitle.trim(),
          courseName: manualCourseName.trim() || undefined,
          description: manualDescription.trim() || undefined,
          dueDate,
          priority: manualPriority,
        });
      }

      resetManualTaskForm();
      isClosingCreateSheetRef.current = true;
      animateCreateSheetOut(() => {
        setEditingTaskId(null);
        setIsCreateModalVisible(false);
        isClosingCreateSheetRef.current = false;
      });
    } catch (error) {
      Alert.alert(
        editingTask ? "No se pudo actualizar la tarea" : "No se pudo crear la tarea",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    } finally {
      setIsCreatingManualTask(false);
    }
  };

  const handleDeleteManualTask = () => {
    if (!manualTaskMenu || !user) return;

    Alert.alert(
      "¿Eliminar tarea?",
      `Se eliminará “${manualTaskMenu.title}” de tu lista.`,
      [
        { style: "cancel", text: "Cancelar" },
        {
          style: "destructive",
          text: "Eliminar",
          onPress: () => {
            void (async () => {
              setManualTaskMenuId(null);

              try {
                await deleteTask({ taskId: manualTaskMenu._id as never, userId: user.id });
              } catch (error) {
                Alert.alert(
                  "No se pudo eliminar la tarea",
                  error instanceof Error ? error.message : "Inténtalo de nuevo."
                );
              }
            })();
          },
        },
      ]
    );
  };

  const scrollFormToFocusedField = (field: "course" | "description") => {
    setTimeout(() => {
      formScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, formFieldOffsetsRef.current[field] - spacing.md),
      });
    }, 260);
  };

  const createSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 1 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy > 1 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          createSheetDragDistanceRef.current = 0;
          createSheetTranslateY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          if (isClosingCreateSheetRef.current) return;

          const distance = Math.max(0, gesture.dy);
          createSheetDragDistanceRef.current = distance;
          createSheetTranslateY.setValue(distance);
        },
        onPanResponderRelease: (_, gesture) => {
          if (isClosingCreateSheetRef.current) return;

          if (gesture.dy > 72 || gesture.vy > 0.65) {
            closeCreateModal();
            return;
          }

          Animated.spring(createSheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          if (isClosingCreateSheetRef.current) return;

          // Un gesto cancelado no debe cerrar la hoja si apenas se rozó la agarradera.
          if (createSheetDragDistanceRef.current > 72) {
            closeCreateModal();
            return;
          }

          Animated.spring(createSheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [createSheetTranslateY, closeCreateModal]
  );

  return (
    <Screen padded={false} safeAreaColor={colors.accent}>
      <StatusBar style="dark" animated />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardContainer}>
        <View style={[styles.header, isSearchFocused && styles.headerSearchActive]}>
          {!isSearchFocused && <Image source={BannerImage} resizeMode="contain" style={styles.headerImage} />}
          {!isSearchFocused && (
            <View style={styles.headerContent}>
              <AppText color={colors.text} variant="h1" style={styles.headerTitle}>
                Mis tareas
              </AppText>
              <AppText color={colors.textSecondary} style={styles.headerSubtitle}>
                Organiza todo lo que tienes pendiente.
              </AppText>
              <View style={styles.headerSummary}>
                <View style={styles.pendingDot} />
                <AppText color={colors.text} style={styles.headerSummaryText}>
                  {assignedTasks.length} {assignedTasks.length === 1 ? "asignada" : "asignadas"}
                </AppText>
              </View>
            </View>
          )}
          <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Circle cx={11} cy={11} r={6.5} stroke={colors.textSecondary} strokeWidth={2} />
              <Path d="m16 16 4 4" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <TextInput
              autoCapitalize="none"
              onBlur={() => setIsSearchFocused(false)}
              onChangeText={handleSearchChange}
              onFocus={() => {
                setIsSearchFocused(true);
                listRef.current?.scrollTo({ animated: true, y: 0 });
              }}
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder="Buscar tarea o materia"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
          </View>
        </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ref={listRef}
        showsVerticalScrollIndicator={false}
        style={styles.taskList}
      >
        <View style={styles.listHeader}>
          <AppText variant="h3">Tu lista</AppText>
          <View style={styles.listHeaderActions}>
            {!tasks ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <AppText color={colors.textSecondary} variant="bodySmall">
                {tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}
              </AppText>
            )}
            <Pressable onPress={openCreateManualTask} style={styles.createTaskButton}>
              <AppText color={colors.white} style={styles.createTaskButtonText}>
                + Crear tarea
              </AppText>
            </Pressable>
          </View>
        </View>

        {!isSearchFocused && (
          <Pressable
            accessibilityRole="button"
            disabled={isSyncingClassroom}
            onPress={() => void handleClassroomSync()}
            style={({ pressed }) => [
              styles.classroomSyncRow,
              isSyncingClassroom && styles.classroomSyncRowLoading,
              pressed && !isSyncingClassroom && styles.classroomSyncRowPressed,
            ]}
          >
            {isSyncingClassroom ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <View style={styles.classroomSyncInfo}>
                  <GoogleClassroomIcon width={27} height={25} />
                  <View>
                    <AppText color={colors.text} style={styles.classroomSyncTitle}>
                      Google Classroom
                    </AppText>
                    <AppText color={colors.textSecondary} variant="caption">
                      Actualiza tus tareas asignadas
                    </AppText>
                  </View>
                </View>
                <View style={styles.classroomSyncActionGroup}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20 11a8.1 8.1 0 0 0-15-3M4 5v3h3M4 13a8.1 8.1 0 0 0 15 3m1 3v-3h-3"
                      stroke={colors.primary}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <AppText color={colors.primary} style={styles.classroomSyncAction}>
                    Actualizar
                  </AppText>
                </View>
              </>
            )}
          </Pressable>
        )}

        {taskSections.map((section) => (
            <View key={section.title} style={styles.taskSection}>
              {(() => {
                const isAssignedSection = section.title === "Asignadas";
                const isCompletedSection = section.title === "Completadas";
                const isCollapsible = isAssignedSection || isCompletedSection;
                const isExpanded = isAssignedSection
                  ? isAssignedExpanded
                  : isCompletedSection
                    ? isCompletedExpanded
                    : true;
                const controlColor = isAssignedSection ? colors.text : section.textColor;

                return (
                  <>
              <Pressable
                accessibilityRole={isCollapsible ? "button" : undefined}
                disabled={!isCollapsible}
                onPress={() => {
                  if (isAssignedSection) setIsAssignedExpanded((current) => !current);
                  if (isCompletedSection) setIsCompletedExpanded((current) => !current);
                }}
                style={({ pressed }) => [
                  styles.sectionHeader,
                  { backgroundColor: section.color },
                  !isExpanded && styles.sectionHeaderCollapsed,
                  pressed && isCollapsible && styles.sectionHeaderPressed,
                ]}
              >
                <AppText color={section.textColor} variant="h3">{section.title}</AppText>
                <View style={styles.sectionHeaderRight}>
                  {isCollapsible && (
                    <>
                      <AppText color={controlColor} style={styles.sectionTaskTotal}>
                        {section.tasks.length} {section.tasks.length === 1 ? "tarea" : "tareas"}
                      </AppText>
                      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path
                          d={isExpanded ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5"}
                          stroke={controlColor}
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </>
                  )}
                  {!isCollapsible && (
                    <View style={styles.sectionCount}>
                      <AppText color={section.textColor} style={styles.sectionCountText}>
                        {section.tasks.length}
                      </AppText>
                    </View>
                  )}
                </View>
              </Pressable>

              {isExpanded && section.tasks.length === 0 && (
                <View style={styles.sectionEmpty}>
                  <AppText color={colors.textSecondary} variant="bodySmall" style={styles.sectionEmptyText}>
                    {section.emptyMessage}
                  </AppText>
                </View>
              )}

              {isExpanded && section.tasks.map((task) => {
                const priority = getPriorityDetails(task.priority);
                const source = getSourceDetails(task.source);
                const isCompleted = task.status === "completed";
                const hasInstructions = task.description.trim().length > 0;
                const isInstructionsExpanded = expandedTaskId === task._id;

                return (
                  <Card key={task._id} style={styles.taskCard}>
                    <View style={styles.taskTopRow}>
                      <View style={styles.taskTitleContainer}>
                        <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={1} style={styles.courseName}>
                          {task.courseName || "General"}
                        </AppText>
                        <AppText style={styles.taskTitle} numberOfLines={2}>
                          {task.title}
                        </AppText>
                        {hasInstructions && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded: isInstructionsExpanded }}
                            onPress={() => setExpandedTaskId(isInstructionsExpanded ? null : task._id)}
                            style={styles.instructionsPreview}
                          >
                            <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={isInstructionsExpanded ? undefined : 2} style={styles.instructionsText}>
                              {task.description}
                            </AppText>
                            <AppText color={colors.primary} variant="caption" style={styles.instructionsPreviewLabel}>
                              {isInstructionsExpanded ? "Ver menos" : "Ver instrucciones"}
                            </AppText>
                          </Pressable>
                        )}
                      </View>
                      <View style={styles.taskActions}>
                        <View style={styles.taskSourceRow}>
                          <View style={[styles.sourceBadge, { backgroundColor: source.background }]}>
                            <AppText color={source.color} style={styles.sourceBadgeText}>
                              {source.label}
                            </AppText>
                          </View>
                          {task.source !== "google_classroom" && (
                            <Pressable
                              accessibilityLabel={`Opciones de ${task.title}`}
                              accessibilityRole="button"
                              onPress={() => setManualTaskMenuId(task._id)}
                              style={styles.taskMenuTrigger}
                            >
                              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <Circle cx={12} cy={5} r={1.35} fill={colors.textSecondary} />
                                <Circle cx={12} cy={12} r={1.35} fill={colors.textSecondary} />
                                <Circle cx={12} cy={19} r={1.35} fill={colors.textSecondary} />
                              </Svg>
                            </Pressable>
                          )}
                        </View>
                        <Pressable
                          accessibilityLabel={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isCompleted }}
                          onPress={() => void handleTaskToggle(task)}
                          style={styles.taskCheckbox}
                        >
                          <TaskCheckIcon completed={isCompleted} />
                        </Pressable>
                        <View style={[styles.priorityPill, { backgroundColor: priority.background }]}>
                          <AppText color={priority.color} style={styles.priorityText}>
                            {priority.label}
                          </AppText>
                        </View>
                      </View>
                    </View>
                    <View style={styles.taskFooter}>
                      <AppText color={colors.textSecondary} variant="caption">
                        {getStatusLabel(task.status)}
                      </AppText>
                      <View style={styles.dueDetails}>
                        <AppText color={task.dueDate ? priority.color : colors.textMuted} variant="caption" style={styles.dueDate}>
                          {getDueLabel(task.dueDate)}
                        </AppText>
                        {getDueTime(task.dueDate) && (
                          <AppText color={colors.textSecondary} variant="caption" style={styles.dueTime}>
                            {getDueTime(task.dueDate)}
                          </AppText>
                        )}
                      </View>
                    </View>
                  </Card>
                );
              })}
                  </>
                );
              })()}
            </View>
        ))}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setManualTaskMenuId(null)}
        transparent
        visible={Boolean(manualTaskMenu)}
      >
        <View style={styles.modalOverlay}>
          <Pressable accessibilityLabel="Cerrar opciones" onPress={() => setManualTaskMenuId(null)} style={styles.modalBackdrop} />
          <View style={styles.taskMenuSheet}>
            <View style={styles.sheetHandle} />
            <AppText variant="h3" style={styles.taskMenuTitle}>Opciones de tarea</AppText>
            <AppText color={colors.textSecondary} variant="bodySmall" numberOfLines={1} style={styles.taskMenuSubtitle}>
              {manualTaskMenu?.title}
            </AppText>
            <Pressable onPress={openEditManualTask} style={styles.taskMenuOption}>
              <AppText style={styles.taskMenuOptionText}>Editar tarea</AppText>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="m9 6 6 6-6 6" stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
            <Pressable onPress={handleDeleteManualTask} style={[styles.taskMenuOption, styles.taskMenuDangerOption]}>
              <AppText color={colors.danger} style={styles.taskMenuOptionText}>Eliminar tarea</AppText>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="m9 6 6 6-6 6" stroke={colors.danger} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="none"
        onRequestClose={closeCreateModal}
        transparent
        visible={isCreateModalVisible}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: createSheetBackdropOpacity }]}>
          <Pressable accessibilityLabel="Cerrar creación de tarea" onPress={closeCreateModal} style={styles.modalBackdrop} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} pointerEvents="box-none" style={styles.modalKeyboardContainer}>
            <Animated.View style={[styles.createTaskSheet, { transform: [{ translateY: createSheetTranslateY }] }]}>
              <View {...createSheetPanResponder.panHandlers} style={styles.sheetHandleTouchArea}>
                <View style={styles.sheetHandle} />
              </View>
              <View style={styles.sheetHeader}>
                <View>
                  <AppText variant="h2">{editingTask ? "Editar tarea" : "Nueva tarea"}</AppText>
                  <AppText color={colors.textSecondary} variant="bodySmall" style={styles.sheetSubtitle}>
                    {editingTask ? "Actualiza los detalles que necesites." : "Agrégala a tu lista en unos segundos."}
                  </AppText>
                </View>
                <Pressable accessibilityLabel="Cerrar" onPress={closeCreateModal} style={styles.closeSheetButton}>
                  <AppText color={colors.textSecondary} style={styles.closeSheetButtonText}>×</AppText>
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.createForm} keyboardShouldPersistTaps="handled" ref={formScrollRef} showsVerticalScrollIndicator={false} style={styles.createFormScroll}>
                <View>
                  <AppText style={styles.inputLabel}>Título de la tarea</AppText>
                  <TextInput
                    autoFocus
                    onChangeText={setManualTitle}
                    placeholder="Ej. Terminar presentación"
                    placeholderTextColor={colors.textMuted}
                    style={styles.formInput}
                    value={manualTitle}
                  />
                </View>

                <View onLayout={({ nativeEvent }) => { formFieldOffsetsRef.current.course = nativeEvent.layout.y; }}>
                  <AppText style={styles.inputLabel}>Materia o proyecto</AppText>
                  {editingTask ? (
                    <View style={styles.readOnlyFormField}>
                      <AppText color={colors.textSecondary}>{manualCourseName || "General"}</AppText>
                    </View>
                  ) : (
                    <TextInput
                      onChangeText={setManualCourseName}
                      onFocus={() => scrollFormToFocusedField("course")}
                      placeholder="Ej. Desarrollo móvil"
                      placeholderTextColor={colors.textMuted}
                      style={styles.formInput}
                      value={manualCourseName}
                    />
                  )}
                </View>

                <View onLayout={({ nativeEvent }) => { formFieldOffsetsRef.current.description = nativeEvent.layout.y; }}>
                  <AppText style={styles.inputLabel}>Instrucciones <AppText color={colors.textMuted}>(opcional)</AppText></AppText>
                  <TextInput
                    multiline
                    onChangeText={setManualDescription}
                    onFocus={() => scrollFormToFocusedField("description")}
                    placeholder="Anota lo que necesitas hacer..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.formInput, styles.descriptionInput]}
                    textAlignVertical="top"
                    value={manualDescription}
                  />
                </View>

                <View>
                  <AppText style={styles.inputLabel}>Fecha y hora <AppText color={colors.textMuted}>(opcional)</AppText></AppText>
                  <View style={styles.dateTimePickerRow}>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setIsDatePickerVisible(true);
                      }}
                      style={styles.formDatePicker}
                    >
                      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                        <Path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 6 5Z" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" />
                      </Svg>
                      <View style={styles.dateTimePickerCopy}>
                        <AppText color={colors.textMuted} style={styles.dateTimePickerLabel}>Fecha</AppText>
                        <AppText color={manualDate ? colors.text : colors.textSecondary} style={styles.dateTimePickerValue}>
                          {manualDate ? formatSelectedDate(manualDate) : "Seleccionar"}
                        </AppText>
                      </View>
                    </Pressable>
                    <Pressable
                      disabled={!manualDate}
                      onPress={() => {
                        Keyboard.dismiss();
                        setIsTimePickerVisible(true);
                      }}
                      style={[styles.formDatePicker, !manualDate && styles.formDatePickerDisabled]}
                    >
                      <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
                        <Circle cx={12} cy={12} r={8} stroke={manualDate ? colors.primary : colors.textMuted} strokeWidth={1.8} />
                        <Path d="M12 7.5V12l3.2 2" stroke={manualDate ? colors.primary : colors.textMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                      <View style={styles.dateTimePickerCopy}>
                        <AppText color={colors.textMuted} style={styles.dateTimePickerLabel}>Hora</AppText>
                        <AppText color={manualTime ? colors.text : colors.textSecondary} style={styles.dateTimePickerValue}>
                          {manualTime ? formatSelectedTime(manualTime) : "Opcional"}
                        </AppText>
                      </View>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <AppText style={styles.inputLabel}>Prioridad</AppText>
                  <View style={styles.priorityOptions}>
                    {(["low", "medium", "high"] as const).map((priority) => {
                      const details = getPriorityDetails(priority);
                      const isSelected = manualPriority === priority;

                      return (
                        <Pressable
                          key={priority}
                          onPress={() => setManualPriority(priority)}
                          style={[
                            styles.priorityOption,
                            isSelected && { backgroundColor: details.background, borderColor: details.color },
                          ]}
                        >
                          <AppText color={isSelected ? details.color : colors.textSecondary} style={styles.priorityOptionText}>
                            {details.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.sheetActions}>
                <Pressable disabled={isCreatingManualTask} onPress={closeCreateModal} style={styles.cancelCreateButton}>
                  <AppText color={colors.textSecondary} style={styles.cancelCreateButtonText}>Cancelar</AppText>
                </Pressable>
                <Pressable
                  disabled={isCreatingManualTask}
                  onPress={() => void handleSaveManualTask()}
                  style={({ pressed }) => [
                    styles.saveCreateButton,
                    pressed && !isCreatingManualTask && styles.saveCreateButtonPressed,
                  ]}
                >
                  {isCreatingManualTask ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <AppText color={colors.white} style={styles.saveCreateButtonText}>{editingTask ? "Guardar cambios" : "Crear tarea"}</AppText>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
          {isDatePickerVisible && (
            <DateTimePicker
              accentColor={colors.primary}
              minimumDate={new Date()}
              mode="date"
              negativeButton={{ label: "Cancelar" }}
              onDismiss={() => setIsDatePickerVisible(false)}
              onValueChange={(_, date) => {
                setManualDate(date);
                setIsDatePickerVisible(false);
              }}
              positiveButton={{ label: "Listo" }}
              presentation="dialog"
              value={manualDate ?? new Date()}
            />
          )}
          {isTimePickerVisible && (
            <DateTimePicker
              accentColor={colors.primary}
              is24Hour={false}
              mode="time"
              negativeButton={{ label: "Cancelar" }}
              onDismiss={() => setIsTimePickerVisible(false)}
              onValueChange={(_, date) => {
                setManualTime(date);
                setIsTimePickerVisible(false);
              }}
              positiveButton={{ label: "Listo" }}
              presentation="dialog"
              value={manualTime ?? manualDate ?? new Date()}
            />
          )}
        </Animated.View>
      </Modal>

    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  header: {
    backgroundColor: colors.accent,
    minHeight: 260,
    overflow: "hidden",
    position: "relative",
  },
  headerSearchActive: { minHeight: 106 },
  headerImage: { bottom: 77, height: 175, position: "absolute", right: -20, width: 267, zIndex: 1 },
  headerContent: { maxWidth: "64%", paddingHorizontal: spacing.xl, paddingTop: spacing.xl, zIndex: 1 },
  headerTitle: { fontSize: 30, fontWeight: "700"},
  headerSubtitle: { lineHeight: 22, marginTop: spacing.sm},
  headerSummary: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    marginTop: spacing.md,
  },
  pendingDot: { backgroundColor: colors.primary, borderRadius: radius.full, height: 9, marginRight: spacing.sm, width: 9 },
  headerSummaryText: { fontSize: 13, fontWeight: "600" },
  searchBar: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    bottom: spacing.xl + spacing.xs,
    flexDirection: "row",
    left: spacing.xl,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    position: "absolute",
    right: spacing.xl,
    zIndex: 2,
  },
  searchBarFocused: { bottom: spacing.lg },
  searchInput: { color: colors.text, flex: 1, fontSize: 15, marginLeft: spacing.sm, paddingVertical: 0 },
  taskList: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  listHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  listHeaderActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  createTaskButton: { backgroundColor: colors.primary, borderRadius: radius.full, minWidth: 94, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  createTaskButtonText: { fontSize: 12, fontWeight: "700" },
  modalOverlay: { backgroundColor: "rgba(15, 23, 42, 0.4)", flex: 1 },
  modalBackdrop: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  modalKeyboardContainer: { flex: 1, justifyContent: "flex-end" },
  taskMenuSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: "auto",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  taskMenuTitle: { marginTop: spacing.lg },
  taskMenuSubtitle: { marginTop: spacing.xs },
  taskMenuOption: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, minHeight: 44 },
  taskMenuDangerOption: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  taskMenuOptionText: { fontSize: 15, fontWeight: "400" },
  createTaskSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    flexShrink: 1,
    maxHeight: "88%",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  sheetHandleTouchArea: { alignSelf: "center", paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  sheetHandle: { alignSelf: "center", backgroundColor: colors.border, borderRadius: radius.full, height: 4, marginTop: spacing.sm, width: 42 },
  sheetHeader: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
  sheetSubtitle: { marginTop: 3 },
  closeSheetButton: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.full, height: 34, justifyContent: "center", width: 34 },
  closeSheetButtonText: { fontSize: 25, fontWeight: "300", lineHeight: 28 },
  createFormScroll: { flexShrink: 1 },
  createForm: { gap: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.xl },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  formInput: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: "transparent",
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  descriptionInput: { minHeight: 88 },
  readOnlyFormField: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md },
  dateTimePickerRow: { flexDirection: "row", gap: spacing.sm },
  formDatePicker: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: spacing.sm,
  },
  formDatePickerDisabled: { opacity: 0.52 },
  dateTimePickerCopy: { flex: 1, marginLeft: spacing.xs },
  dateTimePickerLabel: { fontSize: 10, fontWeight: "600" },
  dateTimePickerValue: { fontSize: 15, fontWeight: "400", marginTop: 2 },
  priorityOptions: { flexDirection: "row", gap: spacing.xs },
  priorityOption: { alignItems: "center", borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, flex: 1, minHeight: 48, justifyContent: "center", paddingHorizontal: 2 },
  priorityOptionText: { fontSize: 11, fontWeight: "700" },
  sheetActions: { flexDirection: "row", gap: spacing.md },
  cancelCreateButton: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, flex: 1, justifyContent: "center", minHeight: 52 },
  cancelCreateButtonText: { fontSize: 14, fontWeight: "700" },
  saveCreateButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flex: 1.4, justifyContent: "center", minHeight: 52 },
  saveCreateButtonPressed: { opacity: 0.8 },
  saveCreateButtonText: { fontSize: 14, fontWeight: "700" },
  classroomSyncRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  classroomSyncInfo: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  classroomSyncTitle: { fontSize: 14, fontWeight: "600" },
  classroomSyncActionGroup: { alignItems: "center", gap: 2 },
  classroomSyncAction: { fontSize: 13, fontWeight: "700" },
  classroomSyncRowLoading: { justifyContent: "center" },
  classroomSyncRowPressed: { backgroundColor: colors.surfaceSecondary },
  emptyCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg, marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  emptyMark: { alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.full, height: 48, justifyContent: "center", width: 48 },
  emptyMarkText: { fontSize: 27, fontWeight: "400", lineHeight: 30 },
  emptyTitle: { marginTop: spacing.lg, textAlign: "center" },
  emptyDescription: { lineHeight: 22, marginTop: spacing.sm, textAlign: "center" },
  taskSection: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xl,
    overflow: "hidden",
  },
  sectionHeader: {
    alignItems: "center",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionHeaderRight: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  sectionHeaderCollapsed: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  sectionHeaderPressed: { opacity: 0.8 },
  sectionCount: { alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.24)", borderRadius: radius.full, minWidth: 24, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  sectionCountText: { fontSize: 11, fontWeight: "700" },
  sectionTaskTotal: { fontSize: 14, fontWeight: "400" },
  sectionEmpty: { minHeight: 74, justifyContent: "center", paddingHorizontal: spacing.lg },
  sectionEmptyText: { textAlign: "center" },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: 0,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderWidth: 0,
    marginTop: 0,
    padding: spacing.lg,
  },
  taskTopRow: { alignItems: "flex-start", flexDirection: "row" },
  taskActions: {
    alignItems: "center",
    marginLeft: spacing.md,
    minWidth: 106,
    paddingLeft: spacing.md,
  },
  taskCheckbox: { alignItems: "center", height: 27, justifyContent: "center", marginTop: spacing.sm, width: 27 },
  taskTitleContainer: { flex: 1 },
  taskTitle: { fontSize: 17, fontWeight: "600", lineHeight: 22 },
  priorityPill: { backgroundColor: "rgba(255, 255, 255, 0.66)", borderRadius: radius.full, marginTop: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  priorityText: { fontSize: 11, fontWeight: "700" },
  courseName: { marginBottom: spacing.xs },
  taskSourceRow: { alignItems: "center", alignSelf: "flex-end", flexDirection: "row", gap: spacing.xs },
  sourceBadge: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  taskMenuTrigger: { alignItems: "center", height: 28, justifyContent: "center", width: 22 },
  taskFooter: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.sm, flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  dueDetails: { alignItems: "flex-end" },
  dueDate: { fontWeight: "700" },
  dueTime: { marginTop: 2 },
  instructionsPreview: { marginTop: spacing.xs },
  instructionsText: { lineHeight: 19 },
  instructionsPreviewLabel: { fontWeight: "600", marginTop: spacing.xs },
});
