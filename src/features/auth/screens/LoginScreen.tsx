import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { useMutation } from "convex/react";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import PlenoLogoBlanco from "@/assets/brand/logo_pleno_blanco.svg";
import { Screen } from "@/components/layout";
import { AppText, Button } from "@/components/ui";
import { AuthTextInput } from "@/features/auth/components/AuthTextInput";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import { colors, spacing } from "@/theme";
import { api } from "@convex/_generated/api";
import { configureGoogleSignIn } from "@/features/auth/google";
import { useAuth } from "@/features/auth/AuthProvider";

configureGoogleSignIn();

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const storeUser = useMutation(api.users.storeUser);
  const { setAuthenticatedUser } = useAuth();

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
      Alert.alert(
        "No se pudo iniciar sesion",
        error instanceof Error ? error.message : "Intentalo de nuevo."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailLogin = () => {
    Alert.alert("Proximamente", "El acceso con correo estara disponible pronto.");
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <PlenoLogoBlanco width={250} height={76} style={styles.heroLogo} />
            <Image
              source={require("@/assets/images/login_image.png")}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          <View style={styles.content}>
            <View style={styles.brand}>
              <AppText variant="h1" style={styles.title}>
                Bienvenido a Pleno
              </AppText>
              <AppText color={colors.textSecondary} style={styles.subtitle}>
                Inicia sesion para continuar
              </AppText>
            </View>

            <View style={styles.footer}>
              <View style={styles.fields}>
                <AuthTextInput
                  label="Correo electronico"
                  placeholder="tu@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <AuthTextInput
                  label="Contrasena"
                  placeholder="Escribe tu contrasena"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <Button title="Iniciar sesion" onPress={handleEmailLogin} />
              <AppText color={colors.textMuted} style={styles.divider}>
                o continua con
              </AppText>
              <GoogleSignInButton
                onPress={handleGoogleLogin}
                loading={isGoogleLoading}
              />
              <AppText variant="caption" color={colors.textMuted} style={styles.legal}>
                {"Al continuar, aceptas los T\u00e9rminos de servicio y la Pol\u00edtica de privacidad."}
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    height: 310,
    overflow: "visible",
    backgroundColor: "#35A0F8",
    alignItems: "center",
  },
  illustration: {
    position: "absolute",
    bottom: -102,
    width: "125%",
    height: 390,
    zIndex: 3,
  },
  heroLogo: {
    position: "absolute",
    top: spacing.xxl,
    zIndex: 4,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
  },
  brand: {
    alignItems: "center",
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  footer: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  fields: {
    gap: spacing.md,
  },
  divider: {
    textAlign: "center",
  },
  legal: {
    textAlign: "center",
    lineHeight: 17,
  },
});
