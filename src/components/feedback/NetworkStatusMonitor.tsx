import { useCallback, useEffect, useRef } from "react";
import * as Network from "expo-network";
import { AppState, BackHandler, Platform } from "react-native";

import { useFeedback } from "@/components/feedback";

function isOffline(state: Network.NetworkState) {
  return state.isConnected === false || state.isInternetReachable === false;
}

export function NetworkStatusMonitor() {
  const { hideDialog, showDialog, showToast } = useFeedback();
  const isOfflineRef = useRef(false);
  const isOfflineDialogVisibleRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const initialCheckCompletedRef = useRef(false);
  const updateNetworkStateRef = useRef<(state: Network.NetworkState, isInitial?: boolean) => void>(() => undefined);

  const updateNetworkState = useCallback((state: Network.NetworkState, isInitial = false) => {
    if (!isOffline(state)) {
      const connectionWasLost = isOfflineRef.current;
      isOfflineRef.current = false;
      if (connectionWasLost) {
        if (isOfflineDialogVisibleRef.current) hideDialog();
        isOfflineDialogVisibleRef.current = false;
        showToast({ type: "success", title: "De nuevo en línea", message: "Tu conexión a internet se restableció." });
      }
      return;
    }

    if (isOfflineRef.current) return;
    isOfflineRef.current = true;
    isOfflineDialogVisibleRef.current = true;

    showDialog({
      dismissible: false,
      showIcon: false,
      type: "warning",
      title: "No estás conectado",
      message: isInitial
        ? "Necesitas conexión a internet para cargar Pleno. Revisa tu red e inténtalo de nuevo."
        : "Se perdió tu conexión. Puedes ver la información que ya estaba cargada, pero no se actualizará hasta volver a conectarte.",
      actions: [
        {
          label: "REINTENTAR",
          variant: "primary",
          onPress: () => {
            isOfflineDialogVisibleRef.current = false;
            isOfflineRef.current = false;
            void Network.getNetworkStateAsync()
              .then((networkState) => updateNetworkStateRef.current(networkState, isInitial))
              .catch(() => updateNetworkStateRef.current({ isConnected: false }, isInitial));
          },
        },
        ...(isInitial
          ? Platform.OS === "android"
            ? [{ label: "CERRAR", onPress: () => BackHandler.exitApp() }]
            : []
          : [{ label: "CERRAR", onPress: () => { isOfflineDialogVisibleRef.current = false; } }]),
      ],
    });
  }, [hideDialog, showDialog, showToast]);

  updateNetworkStateRef.current = updateNetworkState;

  useEffect(() => {
    void Network.getNetworkStateAsync()
      .then((state) => updateNetworkState(state, true))
      .catch(() => updateNetworkState({ isConnected: false }, true))
      .finally(() => {
        initialCheckCompletedRef.current = true;
      });

    const subscription = Network.addNetworkStateListener((state) => {
      updateNetworkState(state, !initialCheckCompletedRef.current);
    });
    const appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
      const wasInBackground = appStateRef.current === "background" || appStateRef.current === "inactive";
      appStateRef.current = nextAppState;

      if (nextAppState !== "active" || !wasInBackground) return;

      isOfflineRef.current = false;
      void Network.getNetworkStateAsync()
        .then((state) => updateNetworkState(state))
        .catch(() => updateNetworkState({ isConnected: false }));
    });

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [updateNetworkState]);

  return null;
}
