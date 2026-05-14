import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "./supabase";
import type { UserId } from "./types";

const USER_EMAIL_BY_ID: Record<UserId, string> = {
  jesus: "jrincon@heuristyc.com",
  david: "david@heuristyc.com",
};

const EMAIL_TO_USER_ID: Record<string, UserId> = Object.fromEntries(
  Object.entries(USER_EMAIL_BY_ID).map(([id, email]) => [email, id as UserId])
);

export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Components cannot set cookies; middleware refreshes them.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Server Components cannot remove cookies; middleware refreshes them.
        }
      },
    },
  });
}

export type CurrentUser = {
  uuid: string;
  userId: UserId;
  email: string;
  role: "admin" | "viewer";
  name: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  const userId = EMAIL_TO_USER_ID[email];
  if (!userId) return null;

  // Use admin client (service role) to bypass RLS — identity is already
  // verified via getUser() above; we just need the user's metadata row.
  const admin = getSupabaseServerClient();
  if (!admin) return null;

  const { data: row } = await admin
    .from("users")
    .select("id, email, role, name, active")
    .eq("email", email)
    .maybeSingle();

  if (!row || row.active === false) return null;

  return {
    uuid: row.id as string,
    userId,
    email: row.email as string,
    role: (row.role as "admin" | "viewer") ?? "viewer",
    name: (row.name as string | null) ?? null,
  };
}

export async function requireUser(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export { USER_EMAIL_BY_ID, EMAIL_TO_USER_ID };

export type { NextRequest };
