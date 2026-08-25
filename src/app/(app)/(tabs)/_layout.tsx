import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio" }}
      />

      <Tabs.Screen
        name="tasks"
        options={{ title: "Tareas" }}
      />

      <Tabs.Screen
        name="board"
        options={{ title: "Tablero" }}
      />

      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil" }}
      />
    </Tabs>
  );
}