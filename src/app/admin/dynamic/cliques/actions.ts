"use server";

import { revalidatePath } from "next/cache";
import { updateDynamicClickAlertConfig } from "@/lib/dynamicClickAlerts";

export async function saveClickAlertConfig(formData: FormData) {
  const clickEmailAlertsEnabled = formData.get("clickEmailAlertsEnabled") === "on";

  await updateDynamicClickAlertConfig({
    clickEmailAlertsEnabled,
  });

  revalidatePath("/admin/dynamic/cliques");
}
