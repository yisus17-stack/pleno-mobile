import { useState } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { useMutation } from "convex/react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Svg, { Path } from "react-native-svg";

import PlenoLogoBlanco from "@/assets/brand/logo_pleno_blanco.svg";
import { useFeedback } from "@/components/feedback";
import { Screen } from "@/components/layout";
import { AppText } from "@/components/ui";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { colors, radius, spacing } from "@/theme";
import { api } from "@convex/_generated/api";
import { configureGoogleSignIn } from "@/features/auth/google";
import { useAuth } from "@/features/auth/AuthProvider";

configureGoogleSignIn();

function LockIcon() {
  return (
    <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
      <Path d="M7 10V8a5 5 0 0 1 10 0v2M6.5 10h11A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10Z" stroke={colors.primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
      <Path d="M12 14v3" stroke={colors.primary} strokeLinecap="round" strokeWidth={1.8} />
    </Svg>
  );
}

function PlannerBoardDecoration() {
  return (
    <Svg fill="none" height={88} viewBox="0 0 96 88" width={96}>
      <Path d="M16 19h64a7 7 0 0 1 7 7v43a7 7 0 0 1-7 7H16a7 7 0 0 1-7-7V26a7 7 0 0 1 7-7Z" stroke="#A9D9FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
      <Path d="M9 34h78M29 12v14M67 12v14" stroke="#A9D9FF" strokeLinecap="round" strokeWidth={3} />
      <Path d="M27 49h1M48 49h1M69 49h1M27 63h1M48 63h1" stroke="#A9D9FF" strokeLinecap="round" strokeWidth={6} />
    </Svg>
  );
}

function PaperPlaneDecoration() {
  return (
    <Svg fill="none" height={105} viewBox="0 0 175 105" width={175}>
      <Path d="M58 24h27c25 0 49 25 80 52" stroke="#A9D9FF" strokeDasharray="5 7" strokeLinecap="round" strokeWidth={2.5} />
      <Path d="m4 24 58-19-18 19 18 19L4 24Z" stroke="#A9D9FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} />
      <Path d="M4 24h40" stroke="#A9D9FF" strokeLinecap="round" strokeWidth={2.5} />
    </Svg>
  );
}

export function LoginScreen() {
  const { height } = useWindowDimensions();
  const isCompactScreen = height < 700;
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const storeUser = useMutation(api.users.storeUser);
  const { setAuthenticatedUser } = useAuth();
  const { showToast } = useFeedback();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResponse = await GoogleSignin.signIn();

      if (signInResponse.type === "cancelled") {
        return;
      }

      const { user } = signInResponse.data;
      await storeUser({
        googleId: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        picture: user.photo || undefined,
      });

      setAuthenticatedUser(user);
    } catch (error) {
      showToast({ type: "error", title: "No se pudo iniciar sesión", message: error instanceof Error ? error.message : "Inténtalo de nuevo." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const heroHeight = isCompactScreen
    ? Math.min(390, Math.max(280, height - 280))
    : Math.min(478, Math.max(410, Math.round(height * 0.6)));

  return (
    <Screen padded={false}>
      <View style={styles.container}>
          <View style={[styles.hero, { height: heroHeight }]}>
            <View style={styles.heroDecorationLeft} />
            <View style={styles.heroDecorationRight} />
            <View style={styles.heroPlane}><PaperPlaneDecoration /></View>
            <View style={styles.heroBoard}><PlannerBoardDecoration /></View>
            <PlenoLogoBlanco width={isCompactScreen ? 220 : 250} height={isCompactScreen ? 78 : 88} style={styles.heroLogo} />
            <View style={[styles.heroCopy, isCompactScreen && styles.heroCopyCompact]}>
              <AppText color={colors.white} style={styles.heroSlogan}>Tu día, tu plan,</AppText>
              <AppText color={colors.accent} style={styles.heroSlogan}>tu mejor versión.</AppText>
              <Image source={require("@/assets/images/line_image.png")} style={styles.heroUnderline} resizeMode="contain" />
            </View>
            <Image
              source={require("@/assets/images/login_image.png")}
              style={[styles.illustration, isCompactScreen && styles.illustrationCompact, { bottom: heroHeight - (isCompactScreen ? 470 : 531) }]}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.content, isCompactScreen && styles.contentCompact]}>
            <View style={styles.contentGroup}>
              <View style={styles.brand}>
                <AppText variant="h1" style={styles.title}>
                  Bienvenido a Pleno
                </AppText>
                
                <AppText color={colors.textSecondary} style={[styles.subtitle, isCompactScreen && styles.subtitleCompact]}>
                  Inicia sesión con tu cuenta de Google para continuar
                </AppText>
              </View>

              <View style={[styles.footer, isCompactScreen && styles.footerCompact]}>
                <GoogleSignInButton
                  onPress={handleGoogleLogin}
                  loading={isGoogleLoading}
                />
                <View style={styles.securityNote}>
                  <LockIcon />
                  <AppText color={colors.textSecondary} style={styles.securityText}>Seguro, rápido y sin contraseñas</AppText>
                </View>
              </View>
            </View>
          </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    overflow: "hidden",
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  illustration: {
    position: "absolute",
    width: 300,
    height: 400,
    zIndex: 2,
  },
  illustrationCompact: { height: 360, width: 270 },
  heroLogo: {
    position: "absolute",
    top: 30,
    zIndex: 4,
  },
  heroCopy: { alignItems: "center", marginTop: 110, zIndex: 4 },
  heroCopyCompact: { marginTop: 92 },
  heroSlogan: { fontSize: 22, fontWeight: "800", lineHeight: 29, textAlign: "center" },
  heroUnderline: { height: 40, marginTop: -5, width: 90, zIndex: 4 },
  heroDecorationLeft: { borderColor: "#A9D9FF", borderRadius: radius.full, borderStyle: "dashed", borderWidth: 2.5, height: 159, left: -130, opacity: 0.6, position: "absolute", top: 0, transform: [{ rotate: "-26deg" }], width: 200 },
  heroDecorationRight: { borderColor: "#A9D9FF", borderRadius: radius.full, borderStyle: "dashed", borderWidth: 2.5, height: 96, opacity: 0.6, position: "absolute", right: -39, top: 132, transform: [{ rotate: "28deg" }], width: 106 },
  heroPlane: { left: -50, opacity: 0.6, position: "absolute", top: 260, transform: [{ rotate: "-28deg" }, { scaleX: -1 }], zIndex: 1 },
  heroBoard: { opacity: 0.6, position: "absolute", right: 12, top: 292, transform: [{ rotate: "9deg" }], zIndex: 1 },
  content: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -25,
    paddingHorizontal: spacing.xxl,
    paddingTop: 52,
    paddingBottom: 14,
    flex: 1,
    justifyContent: "center",
    zIndex: 5,
  },
  contentCompact: { paddingBottom: spacing.sm, paddingTop: spacing.xl },
  brand: {
    alignItems: "center",
  },
  contentGroup: { transform: [{ translateY: -20 }] },
  title: {
    fontSize: 28,
    fontWeight: "700",

  },
  subtitle: {
    lineHeight: 23,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    maxWidth: 290,
    textAlign: "center",
  },
  subtitleCompact: { marginBottom: spacing.lg, marginTop: spacing.sm },
  footer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  footerCompact: { gap: spacing.sm },
 
  securityNote: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.xs },
  securityText: { fontSize: 13 },
});
