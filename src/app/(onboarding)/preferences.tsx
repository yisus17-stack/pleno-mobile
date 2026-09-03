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

function ChoiceRow({ label, value, onChange, options, isOptionDisabled, large = false, required = false }: { label: string; value: number | null; onChange: (next: number) => void; options: number[]; isOptionDisabled?: (option: number) => boolean; large?: boolean; required?: boolean }) {
  return <View style={styles.choiceGroup}>
    <AppText style={[styles.inputLabel, styles.preferenceSelectLabel]}>{label}{required && <AppText color={colors.danger}> *</AppText>}</AppText>
    <View style={[styles.choiceRow, large && styles.scaleChoiceRow]}>
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
  </View>;
}

function PreferenceSelect({ label, options, value, onChange, multiple = false, required = false }: { label: string; options: string[]; value: string; onChange: (next: string) => void; multiple?: boolean; required?: boolean }) {
  const selected = multiple ? parseList(value) : value ? [value] : [];

  return <View style={styles.preferenceSelectGroup}>
    <AppText style={styles.inputLabel}>{label}{required && <AppText color={colors.danger}> *</AppText>}</AppText>
    {multiple && <AppText color={colors.textSecondary} variant="caption" style={styles.preferenceSelectHint}>Puedes seleccionar más de una opción.</AppText>}
    <View style={styles.preferenceSelectMenu}>
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
  const showValidation = (title: string, message: string) => showToast({ type: "warning", title, message });

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
    if (!role.trim()) { showValidation("Elige tu rol", "Selecciona un rol para continuar."); return false; }
    if (!age.trim() || toNumber(age, 0) < 10 || toNumber(age, 0) > 99) { showValidation("Revisa tu edad", "Escribe una edad entre 10 y 99 años."); return false; }
    if (!occupation.trim()) { showValidation("Elige tu ocupación", "Selecciona tu ocupación o carrera para continuar."); return false; }
    if (availableHours === null || studyHours === null || workHours === null) { showValidation("Completa tus horas", "Elige tus horas libres, de estudio y de trabajo para continuar."); return false; }
    if (studyHours > availableHours) { showValidation("Revisa tus horas", "El tiempo de estudio no puede superar tus horas libres."); return false; }
    if (workHours + availableHours > DAILY_AWAKE_HOURS) { showValidation("Revisa tus horas", "Reservamos al menos 8 horas al día para descansar."); return false; }
    if (!selectedDays.length) { showValidation("Elige tus días", "Selecciona al menos un día en el que tengas tiempo disponible."); return false; }
    if (!/^\d{2}:\d{2}$/.test(startTime)) { showValidation("Revisa el horario", "Elige una hora de inicio válida."); return false; }
    if (timeToMinutes(startTime) + availableHours * 60 > 24 * 60) { showValidation("Revisa el horario", "Elige una hora de inicio más temprana para completar tu bloque disponible."); return false; }
    return true;
  };

  const canLeaveEnergyStep = () => {
    if (morningEnergy === null || afternoonEnergy === null || nightEnergy === null || tolerance === null) {
      showValidation("Completa tu energía", "Elige una opción en cada pregunta para continuar.");
      return false;
    }
    return true;
  };

  const canSavePreferences = () => {
    if (!workMethod || !learningStyle || !goals || !activities || !distractions) {
      showValidation("Completa tus preferencias", "Elige al menos una opción en cada sección para guardar tu perfil.");
      return false;
    }
    return true;
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
      <Pressable accessibilityRole="button" onPress={() => setIsRoleMenuOpen((current) => !current)} style={styles.roleSelect}>
        <AppText color={role ? colors.text : colors.textMuted}>{isCustomRole ? "Otro" : role || "Selecciona tu rol"}</AppText>
        <Svg height={20} viewBox="0 0 24 24" width={20} fill="none">
          <Path d="m7 10 5 5 5-5" stroke={colors.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
        </Svg>
      </Pressable>
      {isRoleMenuOpen && <View style={styles.roleMenu}>
        {roleOptions.map((option) => <Pressable key={option} onPress={() => { setRole(option); setIsCustomRole(false); setIsRoleMenuOpen(false); }} style={styles.roleMenuOption}><AppText>{option}</AppText></Pressable>)}
        <Pressable onPress={() => { setRole(""); setIsCustomRole(true); setIsRoleMenuOpen(false); }} style={styles.roleMenuOption}><AppText>Otro</AppText></Pressable>
      </View>}
      {isCustomRole && <TextInput autoFocus onChangeText={setRole} placeholder="Escribe tu rol" placeholderTextColor={colors.textMuted} style={[styles.input, styles.customRoleInput]} value={role} />}
    </View>
    <View>
      <AppText style={styles.inputLabel}>Edad <AppText color={colors.danger}>*</AppText></AppText>
      <TextInput keyboardType="number-pad" maxLength={2} onChangeText={(value) => setAge(value.replace(/\D/g, ""))} placeholder="Escribe tu edad" placeholderTextColor={colors.textMuted} style={styles.input} value={age} />
    </View>
    <View>
      <AppText style={styles.inputLabel}>Ocupación o carrera <AppText color={colors.danger}>*</AppText></AppText>
      <Pressable accessibilityRole="button" onPress={() => setIsOccupationMenuOpen((current) => !current)} style={styles.roleSelect}>
        <AppText color={occupation ? colors.text : colors.textMuted}>{isCustomOccupation ? "Otro" : occupation || "Selecciona una opción"}</AppText>
        <Svg height={20} viewBox="0 0 24 24" width={20} fill="none"><Path d="m7 10 5 5 5-5" stroke={colors.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} /></Svg>
      </Pressable>
      {isOccupationMenuOpen && <View style={styles.roleMenu}>
        {occupationOptions.map((option) => <Pressable key={option} onPress={() => { setOccupation(option); setIsCustomOccupation(false); setIsOccupationMenuOpen(false); }} style={styles.roleMenuOption}><AppText>{option}</AppText></Pressable>)}
        <Pressable onPress={() => { setOccupation(""); setIsCustomOccupation(true); setIsOccupationMenuOpen(false); }} style={styles.roleMenuOption}><AppText>Otro</AppText></Pressable>
      </View>}
      {isCustomOccupation && <TextInput autoFocus onChangeText={setOccupation} placeholder="Escribe tu ocupación o carrera" placeholderTextColor={colors.textMuted} style={[styles.input, styles.customRoleInput]} value={occupation} />}
    </View>
    <ChoiceRow large required label="Horas que tienes libres al día" onChange={handleAvailableHoursChange} options={[1, 2, 3, 4, 5, 6]} value={availableHours} />
    <ChoiceRow large required isOptionDisabled={(option) => option > (availableHours ?? 0)} label="Horas que quieres dedicar a estudiar" onChange={setStudyHours} options={[1, 2, 3, 4, 5, 6]} value={studyHours} />
    <ChoiceRow large required isOptionDisabled={(option) => option + (availableHours ?? 0) > DAILY_AWAKE_HOURS} label="Horas de trabajo al día" onChange={setWorkHours} options={[0, 2, 4, 6, 8, 10]} value={workHours} />
    <AppText color={colors.textSecondary} variant="caption" style={styles.hoursNote}>Tus horas de estudio se ajustan dentro de tu tiempo libre. Reservamos al menos 8 h para descanso.</AppText>
    <AppText style={styles.inputLabel}>Días disponibles</AppText>
    <View style={styles.dayRow}>{days.map(([day, label]) => <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.day, selectedDays.includes(day) && styles.dayActive]}><AppText color={selectedDays.includes(day) ? colors.white : colors.textSecondary} style={styles.dayText}>{label}</AppText></Pressable>)}</View>
    <View>
      <AppText style={styles.inputLabel}>¿A qué hora normalmente empiezas?</AppText>
      <Pressable accessibilityRole="button" onPress={() => setIsStartTimePickerVisible(true)} style={styles.timePickerButton}><AppText>{startTime}</AppText></Pressable>
      <View style={styles.availabilitySummary}>
        <AppText color={colors.textSecondary} variant="caption">Tu bloque disponible</AppText>
        <AppText color={colors.primary} style={styles.availabilitySummaryValue}>{startTime} – {calculatedEndTime} · {availableHours} h</AppText>
      </View>
    </View>
  </> : step === 1 ? <>
    <AppText variant="h2">Energía y carga</AppText>
    <AppText color={colors.textSecondary} style={styles.stepCopy}>1 es poca energía y 5 es tu mejor momento para concentrarte.</AppText>
    <ChoiceRow large required label="Energía por la mañana" onChange={setMorningEnergy} options={[1, 2, 3, 4, 5]} value={morningEnergy} />
    <ChoiceRow large required label="Energía por la tarde" onChange={setAfternoonEnergy} options={[1, 2, 3, 4, 5]} value={afternoonEnergy} />
    <ChoiceRow large required label="Energía por la noche" onChange={setNightEnergy} options={[1, 2, 3, 4, 5]} value={nightEnergy} />
    <ChoiceRow large required label="Carga que te resulta cómoda (%)" onChange={setTolerance} options={[50, 65, 80, 100]} value={tolerance} />
  </> : <>
    <AppText variant="h2">Preferencias</AppText>
    <AppText color={colors.textSecondary} style={styles.stepCopy}>Elige lo que más se parezca a ti. Puedes seleccionar varias opciones donde aplique.</AppText>
    <PreferenceSelect required label="Método de trabajo" onChange={setWorkMethod} options={workMethodOptions} value={workMethod} />
    <PreferenceSelect required label="Estilo de aprendizaje" onChange={setLearningStyle} options={learningStyleOptions} value={learningStyle} />
    <PreferenceSelect required label="Tus metas" multiple onChange={setGoals} options={goalOptions} value={goals} />
    <PreferenceSelect required label="Actividades que disfrutas" multiple onChange={setActivities} options={activityOptions} value={activities} />
    <PreferenceSelect required label="Distracciones frecuentes" multiple onChange={setDistractions} options={distractionOptions} value={distractions} />
    <AppText color={colors.textSecondary} variant="caption" style={styles.note}>Los tiempos reales, estimaciones y cumplimiento se aprenderán automáticamente conforme uses PLENO.</AppText>
  </>;

  return <Screen padded={false} safeAreaColor={colors.accent}>
    <View style={styles.screen}>
      <View style={styles.hero}>
        <AppText color={colors.text} style={styles.stepLabel}>PASO {step + 1} DE {steps.length}</AppText>
        <AppText color={colors.text} variant="h1">{steps[step].title}</AppText>
        <AppText color={colors.text} style={styles.heroDescription}>{steps[step].description}</AppText>
        <View style={styles.stepper}>
          <View style={styles.stepLine} />
          <View style={[styles.stepLineComplete, { width: `${(step / (steps.length - 1)) * 66.66}%` }]} />
          {steps.map((item, index) => (
            <Pressable accessibilityLabel={`Ir a ${item.title}`} key={item.title} onPress={() => setStep(index)} style={styles.stepProgressItem}>
              <View style={[styles.stepDot, index === step && styles.stepDotActive, index < step && styles.stepDotComplete]}>
                <AppText color={index <= step ? colors.white : colors.textMuted} style={styles.stepNumber}>{index + 1}</AppText>
              </View>
              <AppText color={index <= step ? colors.primary : colors.textMuted} numberOfLines={1} style={styles.stepCategory}>{item.title}</AppText>
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
  hero: { backgroundColor: colors.accent, paddingBottom: spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  stepLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.1, opacity: 0.66 },
  heroDescription: { lineHeight: 22, marginTop: spacing.sm, maxWidth: 310 },
  stepper: { flexDirection: "row", marginTop: spacing.lg, position: "relative", width: "100%" },
  stepLine: { backgroundColor: colors.white, height: 2, left: "16.67%", position: "absolute", right: "16.67%", top: 14 },
  stepLineComplete: { backgroundColor: colors.primary, height: 2, left: "16.67%", position: "absolute", top: 14 },
  stepProgressItem: { alignItems: "center", flex: 1 },
  stepDot: { alignItems: "center", backgroundColor: colors.white, borderRadius: radius.full, height: 29, justifyContent: "center", width: 29, zIndex: 1 },
  stepDotActive: { backgroundColor: colors.primary, transform: [{ scale: 1.12 }] },
  stepDotComplete: { backgroundColor: colors.primary },
  stepNumber: { fontSize: 12, fontWeight: "800" },
  stepCategory: { fontSize: 11, fontWeight: "700", marginTop: spacing.xs, textAlign: "center" },
  form: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  input: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 50, paddingHorizontal: spacing.md },
  inputLabel: { fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  roleSelect: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 50, paddingHorizontal: spacing.md },
  roleMenu: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.xs, overflow: "hidden" },
  roleMenuOption: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 46, justifyContent: "center", paddingHorizontal: spacing.md },
  customRoleInput: { marginTop: spacing.sm },
  choiceGroup: { marginTop: spacing.xs },
  choiceRow: { flexDirection: "row", justifyContent: "space-between" },
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
  preferenceSelectOption: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 52, paddingHorizontal: spacing.md },
  preferenceSelectLabel: { fontSize: 18, fontWeight: "700" },
  preferenceSelectOptionText: { color: colors.textSecondary, flexShrink: 1, fontSize: 15, fontWeight: "400" },
  preferenceSelectMark: { alignItems: "center", borderColor: "#C9CED6", borderRadius: radius.full, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  preferenceSelectMarkActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hoursNote: { lineHeight: 18, marginTop: -spacing.xs },
  dayRow: { flexDirection: "row", gap: 4 },
  day: { alignItems: "center", backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flex: 1, minHeight: 41, justifyContent: "center" },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 11, fontWeight: "700" },
  timePickerButton: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md },
  availabilitySummary: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  availabilitySummaryValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  stepCopy: { lineHeight: 21 },
  note: { lineHeight: 18, marginTop: spacing.sm },
  actions: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: spacing.md, padding: spacing.xl },
  backButton: { flex: 0.7 },
  nextButton: { flex: 1 },
});
