import { useMutation, useQuery } from "convex/react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { api } from "@convex/_generated/api";
import GoogleClassroomIcon from "@/assets/icons/google-classroom.svg";
import BannerImage from "@/assets/images/tareas_image.png";
import { Screen } from "@/components/layout";
import { AppText } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { useFeedback } from "@/components/feedback";
import { syncClassroomTasks } from "@/features/classroom/api";
import { getClassroomErrorMessage } from "@/features/classroom/errors";
import { cancelTaskReminder, syncTaskReminder } from "@/features/notifications/taskReminders";
import { ManualTaskSheet } from "@/features/tasks/components/ManualTaskSheet";
import { TaskSection, TaskSectionData } from "@/features/tasks/components/TaskSection";
import { styles } from "@/features/tasks/styles";
import { buildManualDueDate, isTaskOverdue } from "@/features/tasks/utils";
import { colors, spacing } from "@/theme";

const usersApi = (api as unknown as {
  users: {
    getUserByGoogleId: any;
  };
}).users;

type ClassroomConnection = {
  classroomEnabled?: boolean;
};

export default function TasksScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const { user } = useAuth();
  const { showDialog, showToast } = useFeedback();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const [isSyncingClassroom, setIsSyncingClassroom] = useState(false);
  const [isAssignedExpanded, setIsAssignedExpanded] = useState(true);
  const [isInProgressExpanded, setIsInProgressExpanded] = useState(true);
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true);
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
  const [manualTitleError, setManualTitleError] = useState<string | null>(null);
  const [isCreatingManualTask, setIsCreatingManualTask] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [manualTaskMenuId, setManualTaskMenuId] = useState<string | null>(null);
  const [isTaskMenuVisible, setIsTaskMenuVisible] = useState(false);
  const listRef = useRef<ScrollView>(null);
  const formScrollRef = useRef<ScrollView>(null);
  const formFieldOffsetsRef = useRef({ course: 0, description: 0 });
  const createSheetTranslateY = useRef(new Animated.Value(0)).current;
  const createSheetBackdropOpacity = useRef(new Animated.Value(1)).current;
  const isClosingCreateSheetRef = useRef(false);
  const createSheetDragDistanceRef = useRef(0);
  const taskMenuTranslateY = useRef(new Animated.Value(0)).current;
  const taskMenuBackdropOpacity = useRef(new Animated.Value(1)).current;
  const isClosingTaskMenuRef = useRef(false);
  const taskMenuDragDistanceRef = useRef(0);
  const tasks = useQuery(api.tasks.getTasksByUser, user ? { userId: user.id } : "skip");
  const classroomUser = useQuery(
    usersApi.getUserByGoogleId,
    user ? { googleId: user.id } : "skip"
  ) as ClassroomConnection | null | undefined;
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
    setIsInProgressExpanded(true);
    setIsOverdueExpanded(true);
    setIsCompletedExpanded(true);
  }, [allTasks, taskId]);

  const sortSelectedFirst = (taskList: typeof allTasks) =>
    selectedTaskId
      ? [...taskList].sort((first, second) => Number(second._id === selectedTaskId) - Number(first._id === selectedTaskId))
      : taskList;

  const assignedTasks = sortSelectedFirst(filteredTasks.filter((task) => task.status === "todo" && !isTaskOverdue(task.dueDate)));
  const inProgressTasks = sortSelectedFirst(filteredTasks.filter((task) => task.status === "in_progress" && !isTaskOverdue(task.dueDate)));
  const overdueTasks = sortSelectedFirst(filteredTasks.filter((task) => task.status !== "completed" && isTaskOverdue(task.dueDate)));
  const taskSections: TaskSectionData[] = [
    {
      title: "Asignadas",
      color: colors.accent,
      textColor: colors.text,
      emptyMessage: "No tienes tareas asignadas.",
      tasks: assignedTasks,
    },
    {
      title: "En progreso",
      color: colors.primary,
      textColor: colors.white,
      emptyMessage: "No tienes tareas en progreso.",
      tasks: inProgressTasks,
    },
    {
      title: "Vencidas",
      color: colors.danger,
      textColor: colors.white,
      emptyMessage: "No tienes tareas vencidas.",
      tasks: overdueTasks,
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

      if (task.source === "manual") {
        if (task.status === "completed") {
          await syncTaskReminder({ dueDate: task.dueDate, taskId: task._id, title: task.title });
        } else {
          await cancelTaskReminder(task._id);
        }
      }
    } catch (error) {
      showToast({ type: "error", title: "No se pudo actualizar la tarea", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    }
  };

  const presentClassroomConnectionDialog = () => {
    showDialog({
      type: "warning",
      title: "Primero conecta Classroom",
      message: "Vincula Google Classroom desde Configuración para poder actualizar tus tareas.",
      actions: [
        { label: "Ahora no" },
        { label: "Ir a Configuración", onPress: () => router.push("/profile") },
      ],
    });
  };

  const handleClassroomSync = async () => {
    if (!user) {
      showToast({ type: "error", title: "Sesión no disponible", message: "Inicia sesión nuevamente para actualizar Classroom." });
      return;
    }

    if (classroomUser === undefined) {
      showToast({ type: "warning", title: "Comprobando Classroom", message: "Espera un momento mientras verificamos tu conexión." });
      return;
    }

    if (!classroomUser?.classroomEnabled) {
      presentClassroomConnectionDialog();
      return;
    }

    setIsSyncingClassroom(true);

    try {
      const { accessToken } = await GoogleSignin.getTokens();
      const result = await syncClassroomTasks(accessToken);

      showToast({
        type: "success",
        title: "Classroom actualizado",
        message: result.totalSynced === 1
          ? "Se sincronizó 1 tarea."
          : typeof result.totalSynced === "number"
            ? `Se sincronizaron ${result.totalSynced} tareas.`
            : "Tus tareas se sincronizaron correctamente.",
      });
    } catch (error) {
      showToast({ type: "error", title: "No se pudo actualizar Classroom", message: getClassroomErrorMessage(error, "sync") });
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
    setManualTitleError(null);
    setManualCourseName("");
    setManualDescription("");
    setManualDate(null);
    setManualTime(null);
    setManualPriority("medium");
  };

  const presentCreateSheet = () => {
    isClosingCreateSheetRef.current = false;
    createSheetTranslateY.setValue(screenHeight);
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

  const presentTaskMenu = (id: string) => {
    isClosingTaskMenuRef.current = false;
    taskMenuTranslateY.setValue(screenHeight);
    taskMenuBackdropOpacity.setValue(0);
    setManualTaskMenuId(id);
    setIsTaskMenuVisible(true);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(taskMenuTranslateY, {
          damping: 22,
          stiffness: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(taskMenuBackdropOpacity, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeTaskMenu = (onFinished?: () => void) => {
    if (isClosingTaskMenuRef.current) return;

    isClosingTaskMenuRef.current = true;
    taskMenuTranslateY.stopAnimation();

    Animated.parallel([
      Animated.timing(taskMenuTranslateY, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: screenHeight,
        useNativeDriver: true,
      }),
      Animated.timing(taskMenuBackdropOpacity, {
        duration: 210,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        isClosingTaskMenuRef.current = false;
        return;
      }

      setIsTaskMenuVisible(false);
      setManualTaskMenuId(null);
      isClosingTaskMenuRef.current = false;
      onFinished?.();
    });
  };

  const openEditManualTask = () => {
    if (!manualTaskMenu) return;

    setManualTitleError(null);
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
    closeTaskMenu(presentCreateSheet);
  };

  const animateCreateSheetOut = (onFinished?: () => void) => {
    // En Android el teclado ya no altera el alto de la hoja durante esta animación.
    Keyboard.dismiss();
    createSheetTranslateY.stopAnimation();

    Animated.parallel([
      Animated.timing(createSheetTranslateY, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
        toValue: screenHeight,
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

    animateCreateSheetOut(() => {
      setIsCreateModalVisible(false);
      setEditingTaskId(null);
      isClosingCreateSheetRef.current = false;
    });
  };

  const handleSaveManualTask = async () => {
    if (!user) {
      showToast({ type: "error", title: "Sesión no disponible", message: "Inicia sesión nuevamente para crear una tarea." });
      return;
    }

    if (!manualTitle.trim()) {
      setManualTitleError("Escribe el nombre de la tarea para continuar.");
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
          courseName: manualCourseName.trim() || "General",
          description: manualDescription.trim(),
          dueDate,
          priority: manualPriority,
        });
        await syncTaskReminder({ dueDate, taskId: editingTask._id, title: manualTitle.trim() });
      } else {
        const createdTask = await createManualTask({
          userId: user.id,
          title: manualTitle.trim(),
          courseName: manualCourseName.trim() || undefined,
          description: manualDescription.trim() || undefined,
          dueDate,
          priority: manualPriority,
        });
        await syncTaskReminder({ dueDate, taskId: createdTask.taskId, title: manualTitle.trim() });
      }

      showToast({
        type: "success",
        title: editingTask ? "Tarea actualizada" : "Tarea creada",
        message: editingTask ? "Tus cambios se guardaron correctamente." : "Ya la agregamos a tu lista.",
      });
      resetManualTaskForm();
      isClosingCreateSheetRef.current = true;
      animateCreateSheetOut(() => {
        setEditingTaskId(null);
        setIsCreateModalVisible(false);
        isClosingCreateSheetRef.current = false;
      });
    } catch (error) {
      showToast({ type: "error", title: editingTask ? "No se pudo actualizar la tarea" : "No se pudo crear la tarea", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    } finally {
      setIsCreatingManualTask(false);
    }
  };

  const handleDeleteManualTask = () => {
    if (!manualTaskMenu || !user) return;

    closeTaskMenu(() => showDialog({
      type: "error",
      title: "¿Eliminar tarea?",
      message: `Se eliminará “${manualTaskMenu.title}” de tu lista.`,
      actions: [
        { label: "Cancelar" },
        {
          label: "Eliminar",
          variant: "destructive",
          onPress: () => {
            void (async () => {
              setManualTaskMenuId(null);
              try {
                await deleteTask({ taskId: manualTaskMenu._id as never, userId: user.id });
                await cancelTaskReminder(manualTaskMenu._id);
                showToast({ type: "success", title: "Tarea eliminada", message: "La quitamos de tu lista." });
              } catch (error) {
                showToast({ type: "error", title: "No se pudo eliminar la tarea", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
              }
            })();
          },
        },
      ],
    }));
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

  const taskMenuPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 1 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy > 1 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          taskMenuDragDistanceRef.current = 0;
          taskMenuTranslateY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          if (isClosingTaskMenuRef.current) return;

          const distance = Math.max(0, gesture.dy);
          taskMenuDragDistanceRef.current = distance;
          taskMenuTranslateY.setValue(distance);
        },
        onPanResponderRelease: (_, gesture) => {
          if (isClosingTaskMenuRef.current) return;

          if (gesture.dy > 72 || gesture.vy > 0.65) {
            closeTaskMenu();
            return;
          }

          Animated.spring(taskMenuTranslateY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          if (isClosingTaskMenuRef.current) return;

          if (taskMenuDragDistanceRef.current > 72) {
            closeTaskMenu();
            return;
          }

          Animated.spring(taskMenuTranslateY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [closeTaskMenu, taskMenuTranslateY]
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
            onPressIn={() => {
              if (classroomUser !== undefined && !classroomUser?.classroomEnabled) {
                presentClassroomConnectionDialog();
              }
            }}
            onPress={() => {
              if (classroomUser !== undefined && !classroomUser?.classroomEnabled) return;
              void handleClassroomSync();
            }}
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

        {taskSections.map((section) => {
          const isExpanded = section.title === "Asignadas"
            ? isAssignedExpanded
            : section.title === "En progreso"
              ? isInProgressExpanded
              : section.title === "Vencidas"
                ? isOverdueExpanded
                : isCompletedExpanded;

          return <TaskSection
            key={section.title}
            expandedTaskId={expandedTaskId}
            isExpanded={isExpanded}
            onOpenMenu={presentTaskMenu}
            onToggleExpanded={() => {
              if (section.title === "Asignadas") setIsAssignedExpanded((current) => !current);
              if (section.title === "En progreso") setIsInProgressExpanded((current) => !current);
              if (section.title === "Vencidas") setIsOverdueExpanded((current) => !current);
              if (section.title === "Completadas") setIsCompletedExpanded((current) => !current);
            }}
            onToggleInstructions={(taskId) => setExpandedTaskId((current) => current === taskId ? null : taskId)}
            onToggleTask={(task) => void handleTaskToggle(task as (typeof allTasks)[number])}
            section={section}
          />;
        })}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="none"
        onRequestClose={() => closeTaskMenu()}
        transparent
        visible={isTaskMenuVisible}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: taskMenuBackdropOpacity }]}>
          <Pressable accessibilityLabel="Cerrar opciones" onPress={() => closeTaskMenu()} style={styles.modalBackdrop} />
          <Animated.View style={[styles.taskMenuSheet, { transform: [{ translateY: taskMenuTranslateY }] }]}>
            <View {...taskMenuPanResponder.panHandlers} style={styles.sheetHandleTouchArea}>
              <View style={styles.sheetHandle} />
            </View>
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
          </Animated.View>
        </Animated.View>
      </Modal>

      <ManualTaskSheet
        createSheetBackdropOpacity={createSheetBackdropOpacity}
        createSheetTranslateY={createSheetTranslateY}
        editingTask={editingTask}
        formFieldOffsetsRef={formFieldOffsetsRef}
        formScrollRef={formScrollRef}
        isCreating={isCreatingManualTask}
        isDatePickerVisible={isDatePickerVisible}
        isTimePickerVisible={isTimePickerVisible}
        isVisible={isCreateModalVisible}
        manualCourseName={manualCourseName}
        manualDate={manualDate}
        manualDescription={manualDescription}
        manualPriority={manualPriority}
        manualTime={manualTime}
        manualTitle={manualTitle}
        titleError={manualTitleError}
        onClose={closeCreateModal}
        onFocusField={scrollFormToFocusedField}
        onSave={() => void handleSaveManualTask()}
        onTitleChange={(value) => {
          setManualTitle(value);
          if (value.trim()) setManualTitleError(null);
        }}
        panHandlers={createSheetPanResponder.panHandlers}
        setIsDatePickerVisible={setIsDatePickerVisible}
        setIsTimePickerVisible={setIsTimePickerVisible}
        setManualCourseName={setManualCourseName}
        setManualDate={setManualDate}
        setManualDescription={setManualDescription}
        setManualPriority={setManualPriority}
        setManualTime={setManualTime}
      />

    </Screen>
  );
}
