export const DYNAMIC_VISIBILITY_STATUSES = [
  "visible",
  "pending",
  "hidden",
] as const;

export type DynamicVisibilityStatus =
  (typeof DYNAMIC_VISIBILITY_STATUSES)[number];

export function isDynamicVisibilityStatus(
  value: string | null | undefined
): value is DynamicVisibilityStatus {
  return DYNAMIC_VISIBILITY_STATUSES.includes(
    value as DynamicVisibilityStatus
  );
}

export function normalizeDynamicVisibilityStatus(
  visibilityStatus: string | null | undefined,
  isVisibleOnSite?: boolean | null
): DynamicVisibilityStatus {
  if (isDynamicVisibilityStatus(visibilityStatus)) {
    return visibilityStatus;
  }

  return isVisibleOnSite === false ? "hidden" : "visible";
}

export function isDynamicVisibilityPublic(
  visibilityStatus: string | null | undefined,
  isVisibleOnSite?: boolean | null
) {
  return normalizeDynamicVisibilityStatus(visibilityStatus, isVisibleOnSite) === "visible";
}

export function getDynamicVisibilityBoolean(status: DynamicVisibilityStatus) {
  return status === "visible";
}

export function getDynamicVisibilityLabel(status: DynamicVisibilityStatus) {
  switch (status) {
    case "visible":
      return "Visível";
    case "pending":
      return "Pendente";
    case "hidden":
      return "Oculto";
  }
}
