import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CheckIcon from "@/assets/icons/check.svg";
import CloseIcon from "@/assets/icons/close.svg";
import ExclamationIcon from "@/assets/icons/exclamation.svg";
import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

type ToastType = "success" | "error" | "warning";

type FeedbackMessage = {
  title: string;
  message?: string;
};

type ToastMessage = FeedbackMessage & {
  type: ToastType;
};

type DialogAction = {
  label: string;
  onPress?: () => void;
  variant?: "default" | "destructive" | "primary";
};

type DialogMessage = FeedbackMessage & {
  actions: DialogAction[];
  dismissible?: boolean;
  presentation?: "default" | "offline";
  type?: ToastType;
};

type FeedbackContextValue = {
  hideDialog: () => void;
  hideLoading: () => void;
  showDialog: (message: DialogMessage) => void;
  showLoading: (message: FeedbackMessage) => void;
  showToast: (message: ToastMessage) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastColors: Record<ToastType, { accent: string }> = {
  success: { accent: "#16A34A" },
  error: { accent: colors.danger },
  warning: { accent: colors.warning },
};

function ToastIcon({ size = 29, type }: { size?: number; type: ToastType }) {
  if (type === "success") {
    return <CheckIcon height={size} width={size} />;
  }

  if (type === "error") {
    return <CloseIcon height={size} width={size} />;
  }

  return <ExclamationIcon height={size} width={size} />;
}

function ToastCloseIcon() {
  return <Svg height={18} viewBox="0 0 24 24" width={18} fill="none"><Path d="m7.5 7.5 9 9m0-9-9 9" stroke={colors.textSecondary} strokeLinecap="round" strokeWidth={2} /></Svg>;
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [loading, setLoading] = useState<FeedbackMessage | null>(null);
  const [dialog, setDialog] = useState<DialogMessage | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-72)).current;
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(toastTranslateY, { toValue: -72, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastOpacity, toastTranslateY]);

  const showToast = useCallback((message: ToastMessage) => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-72);
    setToast(message);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(toastTranslateY, { damping: 10, mass: 0.85, stiffness: 230, toValue: 0, useNativeDriver: true }),
      ]).start();
    });

    dismissTimeoutRef.current = setTimeout(hideToast, 3600);
  }, [hideToast, toastOpacity, toastTranslateY]);

  useEffect(() => () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
  }, []);

  const closeDialog = () => setDialog(null);

  return <FeedbackContext.Provider value={{ hideDialog: closeDialog, hideLoading: () => setLoading(null), showDialog: setDialog, showLoading: setLoading, showToast }}>
    <View style={styles.root}>
      {children}
      {toast && <Animated.View style={[styles.toast, { opacity: toastOpacity, top: insets.top + spacing.lg, transform: [{ translateY: toastTranslateY }] }]}>
        <View style={styles.toastMain}>
          <View style={[styles.toastIcon, { backgroundColor: toastColors[toast.type].accent }]}><ToastIcon type={toast.type} /></View>
        <View style={styles.toastCopy}>
          <AppText style={styles.toastTitle}>{toast.title}</AppText>
          {toast.message && <AppText color={colors.textSecondary} variant="caption" style={styles.toastMessage}>{toast.message}</AppText>}
        </View>
          <Pressable accessibilityLabel="Cerrar mensaje" onPress={hideToast} style={styles.toastClose}><ToastCloseIcon /></Pressable>
        </View>
      </Animated.View>}
      {loading && <View style={styles.loadingOverlay}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} size="large" />
          <AppText style={styles.loadingTitle}>{loading.title}</AppText>
          {loading.message && <AppText color={colors.textSecondary} style={styles.loadingMessage}>{loading.message}</AppText>}
        </View>
      </View>}
      {dialog && <View style={[styles.dialogOverlay, dialog.presentation === "offline" && styles.offlineDialogOverlay]}>
          <Pressable accessibilityLabel="Cerrar alerta" disabled={dialog.dismissible === false} onPress={closeDialog} style={styles.dialogBackdrop} />
          <View style={[styles.dialogCard, dialog.presentation === "offline" && styles.offlineDialogCard]}>
            {dialog.presentation !== "offline" && <View style={[styles.dialogIcon, { backgroundColor: toastColors[dialog.type ?? "warning"].accent }]}><ToastIcon size={38} type={dialog.type ?? "warning"} /></View>}
            <AppText style={[styles.dialogTitle, dialog.presentation === "offline" && styles.offlineDialogTitle]}>{dialog.title}</AppText>
            {dialog.message && <AppText color={colors.textSecondary} style={[styles.dialogMessage, dialog.presentation === "offline" && styles.offlineDialogMessage]}>{dialog.message}</AppText>}
            <View style={[styles.dialogActions, dialog.presentation === "offline" && styles.offlineDialogActions]}>
              {dialog.actions.map((action, index) => <Pressable
                key={`${action.label}-${index}`}
                onPress={() => {
                  closeDialog();
                  action.onPress?.();
                }}
                style={[styles.dialogAction, action.variant === "destructive" ? styles.dialogActionDestructive : action.variant === "primary" ? styles.dialogActionPrimary : styles.dialogActionDefault, dialog.presentation === "offline" && styles.offlineDialogAction]}
              >
                <AppText color={action.variant === "destructive" || action.variant === "primary" ? colors.white : colors.textSecondary} style={[styles.dialogActionText, dialog.presentation === "offline" && styles.offlineDialogActionText]}>{action.label}</AppText>
              </Pressable>)}
            </View>
          </View>
        </View>}
    </View>
  </FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback debe usarse dentro de FeedbackProvider.");
  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: { backgroundColor: colors.white, borderRadius: 6, elevation: 8, left: spacing.xl, overflow: "hidden", position: "absolute", right: spacing.xl, shadowColor: colors.text, shadowOffset: { height: 6, width: 0 }, shadowOpacity: 0.18, shadowRadius: 14, zIndex: 30 },
  toastMain: { alignItems: "center", flexDirection: "row", minHeight: 76, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  toastIcon: { alignItems: "center", borderRadius: radius.full, height: 40, justifyContent: "center", marginRight: spacing.md, width: 40 },
  toastCopy: { flex: 1 },
  toastTitle: { fontSize: 15, fontWeight: "700" },
  toastMessage: { lineHeight: 17, marginTop: 3 },
  toastClose: { alignItems: "center", height: 32, justifyContent: "center", marginLeft: spacing.sm, width: 32 },
  loadingOverlay: { alignItems: "center", backgroundColor: "rgba(15, 23, 42, 0.38)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0, zIndex: 40 },
  loadingCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: 4, boxShadow: "0px 18px 132px 44px rgba(15, 23, 42, 0.28)", elevation: 26, marginHorizontal: spacing.xxl, paddingHorizontal: spacing.xxl, paddingVertical: spacing.xxl },
  loadingTitle: { fontSize: 17, fontWeight: "700", marginTop: spacing.lg, textAlign: "center" },
  loadingMessage: { lineHeight: 21, marginTop: spacing.sm, textAlign: "center" },
  dialogOverlay: { alignItems: "center", backgroundColor: "transparent", bottom: 0, elevation: 50, justifyContent: "center", left: 0, paddingHorizontal: spacing.xl, position: "absolute", right: 0, top: 0, zIndex: 50 },
  offlineDialogOverlay: { backgroundColor: "rgba(0, 0, 0, 0.58)" },
  dialogBackdrop: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  dialogCard: { alignItems: "center", backgroundColor: colors.white, borderRadius: 4, boxShadow: "0px 18px 132px 44px rgba(15, 23, 42, 0.28)", elevation: 26, maxWidth: 360, padding: spacing.xl, shadowColor: colors.text, shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.28, shadowRadius: 58, width: "100%" },
  dialogIcon: { alignItems: "center", borderRadius: radius.full, height: 68, justifyContent: "center", width: 68 },
  dialogTitle: { fontSize: 20, fontWeight: "700", marginTop: spacing.lg, textAlign: "center" },
  dialogMessage: { lineHeight: 22, marginTop: spacing.sm, textAlign: "center" },
  dialogActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl, width: "100%" },
  dialogAction: { alignItems: "center", borderRadius: 5, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.sm },
  dialogActionDefault: { backgroundColor: colors.surfaceSecondary },
  dialogActionDestructive: { backgroundColor: colors.danger },
  dialogActionPrimary: { backgroundColor: colors.primary },
  dialogActionText: { fontSize: 14, fontWeight: "700", textAlign: "center", width: "100%" },
  offlineDialogCard: { alignItems: "stretch", borderRadius: 18, maxWidth: 390, paddingHorizontal: 24, paddingVertical: 30 },
  offlineDialogTitle: { fontSize: 27, lineHeight: 33, marginTop: 0, textAlign: "left" },
  offlineDialogMessage: { fontSize: 17, lineHeight: 27, marginTop: 28, textAlign: "left" },
  offlineDialogActions: { flexDirection: "column", gap: 16, marginTop: 32 },
  offlineDialogAction: { borderRadius: 6, flex: 0, minHeight: 56 },
  offlineDialogActionText: { fontSize: 16, letterSpacing: 0.2 },
});
