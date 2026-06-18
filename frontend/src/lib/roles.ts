export type UserRoleRing = "member" | "admin" | "super_admin";

export function resolveUserRoleRing(roles: readonly string[] | null | undefined): UserRoleRing {
  if (!roles?.length) {
    return "member";
  }

  const normalizedRoles = new Set(
    roles
      .map((role) => (typeof role === "string" ? role.trim().toLowerCase() : ""))
      .filter(Boolean),
  );

  if (normalizedRoles.has("super_admin")) {
    return "super_admin";
  }
  if (normalizedRoles.has("admin")) {
    return "admin";
  }
  return "member";
}
