import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import Svg, { Path } from "react-native-svg";

import { Screen } from "@/components/layout";
import { useFeedback } from "@/components/feedback";
import { AppText, Button } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { profilesApi, UserProfile } from "@/features/profiles/api";
import { colors, radius, spacing } from "@/theme";

const days = [["monday", "Lun"], ["tuesday", "Mar"], ["wednesday", "Mié"], ["thursday", "Jue"], ["friday", "Vie"], ["saturday", "Sáb"], ["sunday", "Dom"]] as const;
const steps = [
  { title: "Tu tiempo", description: "Cuéntanos cuándo puedes avanzar sin prisas." },
  { title: "Tu energía", description: "Ajustaremos la carga a tu ritmo real." },
  { title: "Tus preferencias", description: "Los últimos detalles para hacer el plan más tuyo." },
];
const roleOptions = ["Estudiante", "Profesional", "Emprendedor"] as const;
const occupationOptions = ["Secundaria o preparatoria", "Ingeniería o tecnología", "Diseño o comunicación", "Administración o negocios", "Salud", "Ciencias sociales o derecho", "Trabajo de tiempo completo", "Trabajo y estudio"] as const;
const workMethodOptions = ["Pomodoro", "Bloques de tiempo", "Lista priorizada", "Sesiones largas"];
const learningStyleOptions = ["Visual", "Práctico", "Lectura y escritura", "Auditivo"];
const goalOptions = ["Terminar tareas a tiempo", "Menos estrés", "Mejor organización", "Más tiempo personal"];
const activityOptions = ["Estudiar", "Ejercicio", "Lectura", "Proyectos personales"];
const distractionOptions = ["Redes sociales", "Notificaciones", "Ruido", "Multitarea"];
const DAILY_AWAKE_HOURS = 16;

const parseList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const timeToPickerDate = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
const formatPickerTime = (date: Date) => `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const calculateEndTime = (startTime: string, hours: number) => {
  const totalMinutes = (timeToMinutes(startTime) + hours * 60) % (24 * 60);
  return `${Math.floor(totalMinutes / 60).toString().padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
};

function ChoiceRow({ label, value, onChange, options, isOptionDisabled, large = false, required = false, invalid = false }: { label: string; value: number | null; onChange: (next: number) => void; options: number[]; isOptionDisabled?: (option: number) => boolean; large?: boolean; required?: boolean; invalid?: boolean }) {
  return <View style={styles.choiceGroup}>
    <AppText color={invalid ? colors.danger : colors.text} style={styles.inputLabel}>{label}{required && <AppText color={colors.danger}> *</AppText>}</AppText>
    <View style={[styles.choiceRow, large && styles.scaleChoiceRow, invalid && styles.choiceRowInvalid]}>
      {options.map((option) => {
        const isDisabled = isOptionDisabled?.(option) ?? false;
        if (large) {
          const isSelected = value === option;
          return <View key={option} style={styles.scaleChoiceOption}>
            <AppText color={isDisabled ? colors.textMuted : colors.text} style={styles.scaleChoiceLabel}>{option}</AppText>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => onChange(option)}
              style={[styles.scaleRadio, isSelected && styles.scaleRadioActive, isDisabled && styles.choiceDisabled]}
            >
              {isSelected && <View style={styles.scaleRadioDot} />}
            </Pressable>
          </View>;
        }
        return <Pressable disabled={isDisabled} key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceActive, isDisabled && styles.choiceDisabled]}><AppText color={value === option ? colors.white : isDisabled ? colors.textMuted : colors.textSecondary} style={styles.choiceText}>{option}</AppText></Pressable>;
      })}
    </View>
    {invalid && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Selecciona una opción para continuar.</AppText>}
  </View>;
}

function PreferenceSelect({ label, options, value, onChange, multiple = false, required = false, invalid = false }: { label: string; options: string[]; value: string; onChange: (next: string) => void; multiple?: boolean; required?: boolean; invalid?: boolean }) {
  const selected = multiple ? parseList(value) : value ? [value] : [];

  return <View style={styles.preferenceSelectGroup}>
    <AppText color={invalid ? colors.danger : colors.text} style={styles.inputLabel}>{label}{required && <AppText color={colors.danger}> *</AppText>}</AppText>
    {multiple && <AppText color={colors.textSecondary} variant="caption" style={styles.preferenceSelectHint}>Puedes seleccionar más de una opción.</AppText>}
    <View style={[styles.preferenceSelectMenu, invalid && styles.preferenceSelectMenuInvalid]}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return <Pressable accessibilityRole={multiple ? "checkbox" : "radio"} accessibilityState={{ checked: isSelected }} key={option} onPress={() => {
          if (!multiple) {
            onChange(isSelected ? "" : option);
            return;
          }
          onChange(isSelected ? selected.filter((item) => item !== option).join(", ") : [...selected, option].join(", "));
        }} style={styles.preferenceSelectOption}>
          <AppText style={styles.preferenceSelectOptionText}>{option}</AppText>
          <View style={[styles.preferenceSelectMark, isSelected && styles.preferenceSelectMarkActive]}>
            {isSelected && <Svg height={16} viewBox="0 0 20 20" width={16} fill="none"><Path d="m4 10 4 4 8-9" stroke={colors.white} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} /></Svg>}
          </View>
        </Pressable>;
      })}
    </View>
    {invalid && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Selecciona al menos una opción para continuar.</AppText>}
  </View>;
}

export default function PreferencesScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { user } = useAuth();
  const { showToast } = useFeedback();
  const profile = useQuery(profilesApi.getProfile, user ? { userId: user.id } : "skip") as UserProfile | null | undefined;
  const saveProfile = useMutation(profilesApi.saveProfile);
  const isEditing = mode === "edit";
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [isOccupationMenuOpen, setIsOccupationMenuOpen] = useState(false);
  const [isCustomOccupation, setIsCustomOccupation] = useState(false);
  const [isStartTimePickerVisible, setIsStartTimePickerVisible] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [availableHours, setAvailableHours] = useState<number | null>(null);
  const [studyHours, setStudyHours] = useState<number | null>(null);
  const [workHours, setWorkHours] = useState<number | null>(null);
  const [tolerance, setTolerance] = useState<number | null>(null);
  const [morningEnergy, setMorningEnergy] = useState<number | null>(null);
  const [afternoonEnergy, setAfternoonEnergy] = useState<number | null>(null);
  const [nightEnergy, setNightEnergy] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const [startTime, setStartTime] = useState("17:00");
  const [workMethod, setWorkMethod] = useState("");
  const [learningStyle, setLearningStyle] = useState("");
  const [goals, setGoals] = useState("");
  const [activities, setActivities] = useState("");
  const [distractions, setDistractions] = useState("");
  const hasValidationError = (field: string) => validationErrors.includes(field);
  const clearValidationError = (field: string) => setValidationErrors((current) => current.filter((item) => item !== field));

  useEffect(() => {
    if (!profile) return;
    setRole(profile.role ?? ""); setIsCustomRole(Boolean(profile.role) && !roleOptions.includes(profile.role as typeof roleOptions[number])); setAge(profile.age?.toString() ?? ""); setOccupation(profile.occupation ?? ""); setIsCustomOccupation(Boolean(profile.occupation) && !occupationOptions.includes(profile.occupation as typeof occupationOptions[number]));
    setAvailableHours(profile.availableHoursPerDay ?? null); setStudyHours(profile.studyHoursPerDay ?? null); setWorkHours(profile.workHoursPerDay ?? null);
    setTolerance(profile.workloadTolerance ?? null); setMorningEnergy(profile.energyMorning ?? null); setAfternoonEnergy(profile.energyAfternoon ?? null); setNightEnergy(profile.energyNight ?? null);
    setSelectedDays(profile.availableSchedule?.map((block) => block.day) ?? ["monday", "tuesday", "wednesday", "thursday", "friday"]);
    setStartTime(profile.availableSchedule?.[0]?.start ?? "17:00");
    setWorkMethod(profile.workMethod ?? ""); setLearningStyle(profile.learningStyle ?? ""); setGoals(profile.personalGoals?.join(", ") ?? "");
    setActivities(profile.preferredActivities?.join(", ") ?? ""); setDistractions(profile.distractions?.join(", ") ?? "");
  }, [profile]);

  const declaredFields = useMemo(() => ["role", "age", "occupation", "availableHoursPerDay", "availableSchedule", "workHoursPerDay", "studyHoursPerDay", "energyMorning", "energyAfternoon", "energyNight", "preferredActivities", "distractions", "workMethod", "personalGoals", "learningStyle", "workloadTolerance"], []);
  const toggleDay = (day: string) => setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  const handleAvailableHoursChange = (next: number) => {
    setAvailableHours(next);
    if (studyHours !== null && studyHours > next) setStudyHours(next);
  };
  const calculatedEndTime = calculateEndTime(startTime, availableHours ?? 0);

  const canLeaveTimeStep = () => {
    const errors: string[] = [];
    if (!role.trim()) errors.push("role");
    if (!age.trim() || toNumber(age, 0) < 10 || toNumber(age, 0) > 99) errors.push("age");
    if (!occupation.trim()) errors.push("occupation");
    if (availableHours === null) errors.push("availableHours");
    if (studyHours === null || (availableHours !== null && studyHours > availableHours)) errors.push("studyHours");
    if (workHours === null || (availableHours !== null && workHours + availableHours > DAILY_AWAKE_HOURS)) errors.push("workHours");
    if (!selectedDays.length) errors.push("days");
    if (!/^\d{2}:\d{2}$/.test(startTime) || (availableHours !== null && timeToMinutes(startTime) + availableHours * 60 > 24 * 60)) errors.push("startTime");
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const canLeaveEnergyStep = () => {
    const errors = [
      morningEnergy === null && "morningEnergy",
      afternoonEnergy === null && "afternoonEnergy",
      nightEnergy === null && "nightEnergy",
      tolerance === null && "tolerance",
    ].filter((field): field is string => Boolean(field));
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const canSavePreferences = () => {
    const errors = [
      !workMethod && "workMethod",
      !learningStyle && "learningStyle",
      !goals && "goals",
      !activities && "activities",
      !distractions && "distractions",
    ].filter((field): field is string => Boolean(field));
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleContinue = () => {
    if (step === 0 && !canLeaveTimeStep()) return;
    if (step === 1 && !canLeaveEnergyStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleSave = async () => {
    if (!user || !canLeaveTimeStep() || !canLeaveEnergyStep() || !canSavePreferences()) return;
    setIsSaving(true);
    try {
      await saveProfile({
        userId: user.id, role: role.trim() || undefined, age: age.trim() ? Math.max(1, Math.round(toNumber(age, 0))) : undefined, occupation: occupation.trim() || undefined,
        availableHoursPerDay: availableHours ?? undefined, availableSchedule: selectedDays.map((day) => ({ day, start: startTime, end: calculatedEndTime })), workHoursPerDay: workHours ?? undefined, studyHoursPerDay: studyHours ?? undefined,
        workloadTolerance: tolerance ?? undefined, energyMorning: morningEnergy ?? undefined, energyAfternoon: afternoonEnergy ?? undefined, energyNight: nightEnergy ?? undefined,
        workMethod: workMethod.trim() || undefined, learningStyle: learningStyle.trim() || undefined, personalGoals: parseList(goals), preferredActivities: parseList(activities), distractions: parseList(distractions), declaredFieldNames: declaredFields,
      });
      if (isEditing) router.back(); else router.replace("/classroom");
    } catch (error) {
      showToast({ type: "error", title: "No se pudo guardar tu perfil", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    } finally { setIsSaving(false); }
  };

  const stepContent = step === 0 ? <>
    <AppText variant="h2">Disponibilidad</AppText>
    <View>
      <AppText style={styles.inputLabel}>Rol <AppText color={colors.danger}>*</AppText></AppText>
      <Pressable accessibilityRole="button" onPress={() => setIsRoleMenuOpen((current) => !current)} style={[styles.roleSelect, hasValidationError("role") && styles.inputInvalid]}>
        <AppText color={role ? colors.text : colors.textMuted}>{isCustomRole ? "Otro" : role || "Selecciona tu rol"}</AppText>
        <Svg height={20} viewBox="0 0 24 24" width={20} fill="none">
          <Path d="m7 10 5 5 5-5" stroke={colors.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
        </Svg>
      </Pressable>
      {isRoleMenuOpen && <View style={styles.roleMenu}>
        {roleOptions.map((option) => <Pressable key={option} onPress={() => { setRole(option); clearValidationError("role"); setIsCustomRole(false); setIsRoleMenuOpen(false); }} style={styles.roleMenuOption}><AppText>{option}</AppText></Pressable>)}
        <Pressable onPress={() => { setRole(""); setIsCustomRole(true); setIsRoleMenuOpen(false); }} style={styles.roleMenuOption}><AppText>Otro</AppText></Pressable>
      </View>}
      {isCustomRole && <TextInput autoFocus onChangeText={(value) => { setRole(value); if (value.trim()) clearValidationError("role"); }} placeholder="Escribe tu rol" placeholderTextColor={colors.textMuted} style={[styles.input, styles.customRoleInput, hasValidationError("role") && styles.inputInvalid]} value={role} />}
      {hasValidationError("role") && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Selecciona o escribe tu rol.</AppText>}
    </View>
    <View>
      <AppText style={styles.inputLabel}>Edad <AppText color={colors.danger}>*</AppText></AppText>
      <TextInput keyboardType="number-pad" maxLength={2} onChangeText={(value) => { const nextAge = value.replace(/\D/g, ""); setAge(nextAge); if (nextAge) clearValidationError("age"); }} placeholder="Escribe tu edad" placeholderTextColor={colors.textMuted} style={[styles.input, hasValidationError("age") && styles.inputInvalid]} value={age} />
      {hasValidationError("age") && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Escribe una edad válida entre 10 y 99 años.</AppText>}
    </View>
    <View>
      <AppText style={styles.inputLabel}>Ocupación o carrera <AppText color={colors.danger}>*</AppText></AppText>
      <Pressable accessibilityRole="button" onPress={() => setIsOccupationMenuOpen((current) => !current)} style={[styles.roleSelect, hasValidationError("occupation") && styles.inputInvalid]}>
        <AppText color={occupation ? colors.text : colors.textMuted}>{isCustomOccupation ? "Otro" : occupation || "Selecciona una opción"}</AppText>
        <Svg height={20} viewBox="0 0 24 24" width={20} fill="none"><Path d="m7 10 5 5 5-5" stroke={colors.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} /></Svg>
      </Pressable>
      {isOccupationMenuOpen && <View style={styles.roleMenu}>
        {occupationOptions.map((option) => <Pressable key={option} onPress={() => { setOccupation(option); clearValidationError("occupation"); setIsCustomOccupation(false); setIsOccupationMenuOpen(false); }} style={styles.roleMenuOption}><AppText>{option}</AppText></Pressable>)}
        <Pressable onPress={() => { setOccupation(""); setIsCustomOccupation(true); setIsOccupationMenuOpen(false); }} style={styles.roleMenuOption}><AppText>Otro</AppText></Pressable>
      </View>}
      {isCustomOccupation && <TextInput autoFocus onChangeText={(value) => { setOccupation(value); if (value.trim()) clearValidationError("occupation"); }} placeholder="Escribe tu ocupación o carrera" placeholderTextColor={colors.textMuted} style={[styles.input, styles.customRoleInput, hasValidationError("occupation") && styles.inputInvalid]} value={occupation} />}
      {hasValidationError("occupation") && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Selecciona o escribe tu ocupación.</AppText>}
    </View>
    <ChoiceRow invalid={hasValidationError("availableHours")} large required label="Horas que tienes libres al día" onChange={(value) => { handleAvailableHoursChange(value); clearValidationError("availableHours"); }} options={[1, 2, 3, 4, 5, 6]} value={availableHours} />
    <ChoiceRow invalid={hasValidationError("studyHours")} large required isOptionDisabled={(option) => option > (availableHours ?? 0)} label="Horas que quieres dedicar a estudiar" onChange={(value) => { setStudyHours(value); clearValidationError("studyHours"); }} options={[1, 2, 3, 4, 5, 6]} value={studyHours} />
    <ChoiceRow invalid={hasValidationError("workHours")} large required isOptionDisabled={(option) => option + (availableHours ?? 0) > DAILY_AWAKE_HOURS} label="Horas de trabajo al día" onChange={(value) => { setWorkHours(value); clearValidationError("workHours"); }} options={[0, 2, 4, 6, 8, 10]} value={workHours} />
    <AppText color={colors.textSecondary} variant="caption" style={styles.hoursNote}>Tus horas de estudio se ajustan dentro de tu tiempo libre. Reservamos al menos 8 h para descanso.</AppText>
    <AppText style={styles.inputLabel}>Días disponibles</AppText>
    <View style={[styles.dayRow, hasValidationError("days") && styles.dayRowInvalid]}>{days.map(([day, label]) => <Pressable key={day} onPress={() => { toggleDay(day); clearValidationError("days"); }} style={[styles.day, selectedDays.includes(day) && styles.dayActive]}><AppText color={selectedDays.includes(day) ? colors.white : colors.textSecondary} style={styles.dayText}>{label}</AppText></Pressable>)}</View>
    {hasValidationError("days") && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Elige al menos un día disponible.</AppText>}
    <View>
      <AppText style={styles.inputLabel}>¿A qué hora normalmente empiezas?</AppText>
      <Pressable accessibilityRole="button" onPress={() => setIsStartTimePickerVisible(true)} style={[styles.timePickerButton, hasValidationError("startTime") && styles.inputInvalid]}><AppText>{startTime}</AppText></Pressable>
      {hasValidationError("startTime") && <AppText color={colors.danger} variant="caption" style={styles.fieldError}>Elige una hora válida para tu bloque disponible.</AppText>}
    </View>
  </> : step === 1 ? <>
    <AppText variant="h2">Energía y carga</AppText>
    <AppText color={colors.textSecondary} style={styles.stepCopy}>1 es poca energía y 5 es tu mejor momento para concentrarte.</AppText>
    <ChoiceRow invalid={hasValidationError("morningEnergy")} large required label="Energía por la mañana" onChange={(value) => { setMorningEnergy(value); clearValidationError("morningEnergy"); }} options={[1, 2, 3, 4, 5]} value={morningEnergy} />
    <ChoiceRow invalid={hasValidationError("afternoonEnergy")} large required label="Energía por la tarde" onChange={(value) => { setAfternoonEnergy(value); clearValidationError("afternoonEnergy"); }} options={[1, 2, 3, 4, 5]} value={afternoonEnergy} />
    <ChoiceRow invalid={hasValidationError("nightEnergy")} large required label="Energía por la noche" onChange={(value) => { setNightEnergy(value); clearValidationError("nightEnergy"); }} options={[1, 2, 3, 4, 5]} value={nightEnergy} />
    <View>
      <ChoiceRow invalid={hasValidationError("tolerance")} large required label="¿Qué tanto de tu tiempo libre quieres usar para tareas?" onChange={(value) => { setTolerance(value); clearValidationError("tolerance"); }} options={[50, 65, 80, 100]} value={tolerance} />
      <AppText color={colors.textSecondary} variant="caption" style={styles.toleranceHint}>Elige una carga cómoda para ti.</AppText>
    </View>
  </> : <>
    <AppText variant="h2">Preferencias</AppText>
    <AppText color={colors.textSecondary} style={styles.stepCopy}>Elige lo que más se parezca a ti. Puedes seleccionar varias opciones donde aplique.</AppText>
    <PreferenceSelect invalid={hasValidationError("workMethod")} required label="Método de trabajo" onChange={(value) => { setWorkMethod(value); if (value) clearValidationError("workMethod"); }} options={workMethodOptions} value={workMethod} />
    <PreferenceSelect invalid={hasValidationError("learningStyle")} required label="Estilo de aprendizaje" onChange={(value) => { setLearningStyle(value); if (value) clearValidationError("learningStyle"); }} options={learningStyleOptions} value={learningStyle} />
    <PreferenceSelect invalid={hasValidationError("goals")} required label="Tus metas" multiple onChange={(value) => { setGoals(value); if (value) clearValidationError("goals"); }} options={goalOptions} value={goals} />
    <PreferenceSelect invalid={hasValidationError("activities")} required label="Actividades que disfrutas" multiple onChange={(value) => { setActivities(value); if (value) clearValidationError("activities"); }} options={activityOptions} value={activities} />
    <PreferenceSelect invalid={hasValidationError("distractions")} required label="Distracciones frecuentes" multiple onChange={(value) => { setDistractions(value); if (value) clearValidationError("distractions"); }} options={distractionOptions} value={distractions} />
    <AppText color={colors.textSecondary} variant="caption" style={styles.note}>Los tiempos reales, estimaciones y cumplimiento se aprenderán automáticamente conforme uses PLENO.</AppText>
  </>;

  return <Screen padded={false} safeAreaColor={colors.primary}>
    <View style={styles.screen}>
      <View style={styles.hero}>
        <AppText color={colors.white} style={styles.stepLabel}>PASO {step + 1} DE {steps.length}</AppText>
        <AppText color={colors.white} variant="h1">{steps[step].title}</AppText>
        <AppText color={colors.white} style={styles.heroDescription}>{steps[step].description}</AppText>
        <View style={styles.stepper}>
          <View style={styles.stepLine} />
          <View style={[styles.stepLineComplete, { width: `${(step / (steps.length - 1)) * 66.66}%` }]} />
          {steps.map((item, index) => (
            <Pressable accessibilityLabel={`Ir a ${item.title}`} key={item.title} onPress={() => setStep(index)} style={styles.stepProgressItem}>
              <View style={[styles.stepDot, index === step && styles.stepDotActive, index < step && styles.stepDotComplete]}>
                <AppText color={index <= step ? colors.primary : colors.white} style={styles.stepNumber}>{index + 1}</AppText>
              </View>
              <AppText color={index <= step ? colors.white : "rgba(255, 255, 255, 0.64)"} numberOfLines={1} style={styles.stepCategory}>{item.title}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{stepContent}</ScrollView>
      <View style={styles.actions}>{step > 0 && <Button onPress={() => setStep((current) => current - 1)} style={styles.backButton} title="Atrás" variant="secondary" />}{step === steps.length - 1 ? <Button disabled={isSaving} loading={isSaving} onPress={() => void handleSave()} style={styles.nextButton} title={isEditing ? "Guardar" : "Guardar y continuar"} /> : <Button onPress={handleContinue} style={styles.nextButton} title="Continuar" />}</View>
      {isStartTimePickerVisible && <DateTimePicker
        accentColor={colors.primary}
        is24Hour
        mode="time"
        negativeButton={{ label: "Cancelar" }}
        onDismiss={() => setIsStartTimePickerVisible(false)}
        onValueChange={(_, date) => {
          setStartTime(formatPickerTime(date));
          clearValidationError("startTime");
          setIsStartTimePickerVisible(false);
        }}
        positiveButton={{ label: "Listo" }}
        presentation="dialog"
        value={timeToPickerDate(startTime)}
      />}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  hero: { backgroundColor: colors.primary, paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  stepLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.1, opacity: 0.66 },
  heroDescription: { lineHeight: 22, marginTop: spacing.sm, maxWidth: 310 },
  stepper: { flexDirection: "row", marginTop: spacing.lg, position: "relative", width: "100%" },
  stepLine: { backgroundColor: "#7AC0FA", height: 2, left: "16.67%", position: "absolute", right: "16.67%", top: 14 },
  stepLineComplete: { backgroundColor: colors.white, height: 2, left: "16.67%", position: "absolute", top: 14 },
  stepProgressItem: { alignItems: "center", flex: 1 },
  stepDot: { alignItems: "center", backgroundColor: "#7AC0FA", borderRadius: radius.full, height: 29, justifyContent: "center", width: 29, zIndex: 1 },
  stepDotActive: { backgroundColor: colors.white, transform: [{ scale: 1.12 }] },
  stepDotComplete: { backgroundColor: colors.white },
  stepNumber: { fontSize: 12, fontWeight: "800" },
  stepCategory: { fontSize: 11, fontWeight: "700", marginTop: spacing.xs, textAlign: "center" },
  form: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  input: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 50, paddingHorizontal: spacing.md },
  inputInvalid: { borderColor: colors.danger },
  fieldError: { marginTop: spacing.xs },
  inputLabel: { fontSize: 15, fontWeight: "600", marginBottom: spacing.xs },
  roleSelect: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 50, paddingHorizontal: spacing.md },
  roleMenu: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.xs, overflow: "hidden" },
  roleMenuOption: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 46, justifyContent: "center", paddingHorizontal: spacing.md },
  customRoleInput: { marginTop: spacing.sm },
  choiceGroup: { marginTop: spacing.xs },
  choiceRow: { flexDirection: "row", justifyContent: "space-between" },
  choiceRowInvalid: { borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, padding: spacing.xs },
  scaleChoiceRow: { marginTop: spacing.sm, minHeight: 70 },
  scaleChoiceOption: { alignItems: "center", flex: 1, gap: spacing.sm },
  choice: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.full, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceDisabled: { backgroundColor: colors.surfaceSecondary, opacity: 0.52 },
  choiceText: { fontSize: 13, fontWeight: "700" },
  scaleChoiceLabel: { fontSize: 14, fontWeight: "500" },
  scaleRadio: { alignItems: "center", borderColor: "#C9CED6", borderRadius: radius.full, borderWidth: 2, height: 30, justifyContent: "center", width: 30 },
  scaleRadioActive: { borderColor: colors.primary },
  scaleRadioDot: { backgroundColor: colors.primary, borderRadius: radius.full, height: 14, width: 14 },
  preferenceSelectGroup: { marginTop: spacing.xs },
  preferenceSelectHint: { marginBottom: spacing.xs, marginTop: -2 },
  preferenceSelectMenu: { backgroundColor: colors.white, borderRadius: radius.md, overflow: "hidden" },
  preferenceSelectMenuInvalid: { borderColor: colors.danger, borderWidth: 1 },
  preferenceSelectOption: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 52, paddingHorizontal: spacing.md },
  preferenceSelectOptionText: { color: colors.textSecondary, flexShrink: 1, fontSize: 15, fontWeight: "400" },
  preferenceSelectMark: { alignItems: "center", borderColor: "#C9CED6", borderRadius: radius.full, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  preferenceSelectMarkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hoursNote: { lineHeight: 18, marginTop: -spacing.xs },
  dayRow: { flexDirection: "row", gap: 4 },
  dayRowInvalid: { borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, padding: spacing.xs },
  day: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flex: 1, minHeight: 41, justifyContent: "center" },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 11, fontWeight: "700" },
  timePickerButton: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md },
  stepCopy: { lineHeight: 21 },
  toleranceHint: { marginTop: spacing.xs },
  note: { lineHeight: 18, marginTop: spacing.sm },
  actions: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  backButton: { flex: 0.55, paddingHorizontal: spacing.sm },
  nextButton: { flex: 1.45, paddingHorizontal: spacing.sm },
});
