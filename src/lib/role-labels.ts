export function roleLabel(role: "admin" | "employee") {
  return role === "admin" ? "Администратор" : "Сотрудник";
}
