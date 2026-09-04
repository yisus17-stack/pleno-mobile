import DateTimePicker from "@expo/ui/community/datetime-picker";
import type { MutableRefObject, RefObject } from "react";
import { ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import type { GestureResponderHandlers } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { AppText } from "@/components/ui";
import { styles } from "@/features/tasks/styles";
import { formatSelectedDate, formatSelectedTime, getMinimumTaskDate, getPriorityDetails, normalizePickerDate, TaskPriority, toPickerCalendarDate } from "@/features/tasks/utils";
import { colors } from "@/theme";

type FormField = "course" | "description";

type ManualTaskSheetProps = {
  createSheetBackdropOpacity: Animated.Value;
  createSheetTranslateY: Animated.Value;
  editingTask: { courseName?: string } | null;
  formFieldOffsetsRef: MutableRefObject<Record<FormField, number>>;
  formScrollRef: RefObject<ScrollView | null>;
  isCreating: boolean;
  isDatePickerVisible: boolean;
  isTimePickerVisible: boolean;
  isVisible: boolean;
  manualCourseName: string;
  manualDate: Date | null;
  manualDescription: string;
  manualPriority: TaskPriority;
  manualTime: Date | null;
  manualTitle: string;
  titleError: string | null;
  onClose: () => void;
  onFocusField: (field: FormField) => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  panHandlers: GestureResponderHandlers;
  setIsDatePickerVisible: (visible: boolean) => void;
  setIsTimePickerVisible: (visible: boolean) => void;
  setManualCourseName: (value: string) => void;
  setManualDate: (value: Date | null) => void;
  setManualDescription: (value: string) => void;
  setManualPriority: (value: TaskPriority) => void;
  setManualTime: (value: Date | null) => void;
};

export function ManualTaskSheet({
  createSheetBackdropOpacity,
  createSheetTranslateY,
  editingTask,
  formFieldOffsetsRef,
  formScrollRef,
  isCreating,
  isDatePickerVisible,
  isTimePickerVisible,
  isVisible,
  manualCourseName,
  manualDate,
  manualDescription,
  manualPriority,
  manualTime,
  manualTitle,
  titleError,
  onClose,
  onFocusField,
  onSave,
  onTitleChange,
  panHandlers,
  setIsDatePickerVisible,
  setIsTimePickerVisible,
  setManualCourseName,
  setManualDate,
  setManualDescription,
  setManualPriority,
  setManualTime,
}: ManualTaskSheetProps) {
  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={isVisible}>
      <Animated.View style={[styles.modalOverlay, { opacity: createSheetBackdropOpacity }]}>
        <Pressable accessibilityLabel="Cerrar creación de tarea" onPress={onClose} style={styles.modalBackdrop} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} pointerEvents="box-none" style={styles.modalKeyboardContainer}>
          <Animated.View style={[styles.createTaskSheet, { transform: [{ translateY: createSheetTranslateY }] }]}>
            <View {...panHandlers} style={styles.sheetHandleTouchArea}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.sheetHeader}>
              <View>
                <AppText variant="h2">{editingTask ? "Editar tarea" : "Nueva tarea"}</AppText>
                <AppText color={colors.textSecondary} variant="bodySmall" style={styles.sheetSubtitle}>
                  {editingTask ? "Actualiza los detalles que necesites." : "Agrégala a tu lista en unos segundos."}
                </AppText>
              </View>
              <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.closeSheetButton}>
                <AppText color={colors.textSecondary} style={styles.closeSheetButtonText}>×</AppText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.createForm} keyboardShouldPersistTaps="handled" ref={formScrollRef} showsVerticalScrollIndicator={false} style={styles.createFormScroll}>
              <View>
                <AppText style={styles.inputLabel}>Título de la tarea</AppText>
                <TextInput
                  autoFocus
                  accessibilityHint={titleError ?? undefined}
                  onChangeText={onTitleChange}
                  placeholder="Ej. Terminar presentación"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.formInput, titleError && styles.formInputError]}
                  value={manualTitle}
                />
                {titleError && <AppText color={colors.danger} variant="caption" style={styles.formFieldError}>{titleError}</AppText>}
              </View>

              <View onLayout={({ nativeEvent }) => { formFieldOffsetsRef.current.course = nativeEvent.layout.y; }}>
                <AppText style={styles.inputLabel}>Materia o proyecto</AppText>
                <TextInput
                  onChangeText={setManualCourseName}
                  onFocus={() => onFocusField("course")}
                  placeholder="Ej. Desarrollo móvil"
                  placeholderTextColor={colors.textMuted}
                  style={styles.formInput}
                  value={manualCourseName}
                />
              </View>

              <View onLayout={({ nativeEvent }) => { formFieldOffsetsRef.current.description = nativeEvent.layout.y; }}>
                <AppText style={styles.inputLabel}>Instrucciones <AppText color={colors.textMuted}>(opcional)</AppText></AppText>
                <TextInput
                  multiline
                  onChangeText={setManualDescription}
                  onFocus={() => onFocusField("description")}
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
                        style={[styles.priorityOption, isSelected && { backgroundColor: details.background, borderColor: details.color }]}
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
              <Pressable disabled={isCreating} onPress={onClose} style={styles.cancelCreateButton}>
                <AppText color={colors.textSecondary} style={styles.cancelCreateButtonText}>Cancelar</AppText>
              </Pressable>
              <Pressable
                disabled={isCreating}
                onPress={onSave}
                style={({ pressed }) => [styles.saveCreateButton, pressed && !isCreating && styles.saveCreateButtonPressed]}
              >
                {isCreating ? (
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
            minimumDate={getMinimumTaskDate()}
            mode="date"
            negativeButton={{ label: "Cancelar" }}
            onDismiss={() => setIsDatePickerVisible(false)}
            onValueChange={(_, date) => {
              setManualDate(normalizePickerDate(date));
              setIsDatePickerVisible(false);
            }}
            positiveButton={{ label: "Listo" }}
            presentation="dialog"
            value={toPickerCalendarDate(manualDate ?? new Date())}
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
  );
}
