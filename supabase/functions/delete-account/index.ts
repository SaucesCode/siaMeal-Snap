import { createClient } from "jsr:@supabase/supabase-js@2";

// Permanently deletes the calling user's account (App Store guideline 5.1.1(v)).
// Removing the auth user cascades to profiles, meals and ai_requests via their
// ON DELETE CASCADE foreign keys; storage objects have no FK, so photos are removed first.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MEAL_IMAGES_BUCKET = "meal-images";
const LIST_PAGE_SIZE = 1000;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const requestId = crypto.randomUUID();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Please sign in again to delete your account." }, 401);
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Please sign in again to delete your account." }, 401);
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Remove every photo in the user's folder. Re-list from offset 0 after each removal
    // because deleted objects shift the listing.
    let removedPhotos = 0;
    while (true) {
      const { data: objects, error: listError } = await admin.storage
        .from(MEAL_IMAGES_BUCKET)
        .list(userId, { limit: LIST_PAGE_SIZE });
      if (listError) throw new Error(`list photos: ${listError.message}`);
      if (!objects || objects.length === 0) break;

      const paths = objects.map((o) => `${userId}/${o.name}`);
      const { error: removeError } = await admin.storage.from(MEAL_IMAGES_BUCKET).remove(paths);
      if (removeError) throw new Error(`remove photos: ${removeError.message}`);
      removedPhotos += paths.length;
      if (objects.length < LIST_PAGE_SIZE) break;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`delete user: ${deleteError.message}`);

    console.log(JSON.stringify({ event: "account_deleted", requestId, removedPhotos }));
    return jsonResponse({ deleted: true });
  } catch (err) {
    console.error(`[${requestId}] Account deletion failed:`, err instanceof Error ? err.message : err);
    return jsonResponse(
      { error: "We couldn't delete your account right now. Please try again, or contact support." },
      500
    );
  }
});
