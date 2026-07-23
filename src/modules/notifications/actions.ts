"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  revalidatePath("/notificacoes");
}
