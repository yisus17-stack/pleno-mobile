type ClassroomAction = "link" | "sync" | "disconnect";

export function getClassroomErrorMessage(error: unknown, action: ClassroomAction) {
  const technicalMessage = error instanceof Error ? error.message.toLocaleLowerCase("en-US") : "";

  if (
    technicalMessage.includes("add scopes")
    || technicalMessage.includes("access_denied")
    || technicalMessage.includes("verification")
    || technicalMessage.includes("blocked")
  ) {
    return "No pudimos solicitar el permiso de Google Classroom. Asegúrate de que esta cuenta esté autorizada para las pruebas de la app e inténtalo de nuevo.";
  }

  if (technicalMessage.includes("network") || technicalMessage.includes("internet") || technicalMessage.includes("timeout")) {
    return "No pudimos conectarnos con Google Classroom. Revisa tu conexión a internet e inténtalo de nuevo.";
  }

  if (action === "sync") return "No pudimos actualizar tus tareas de Classroom. Inténtalo de nuevo en unos segundos.";
  if (action === "disconnect") return "No pudimos desconectar Google Classroom. Inténtalo de nuevo.";
  return "No pudimos vincular Google Classroom. Inténtalo de nuevo en unos segundos.";
}
