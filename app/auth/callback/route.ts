import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase";

const ALLOWED_DOMAIN =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? "heuristyc.com";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Mutable response — reassigned when we know whether to redirect to next or to /login.
  const successUrl = new URL(next.startsWith("/") ? next : "/", req.url);
  let response: NextResponse = NextResponse.redirect(successUrl);

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const failTo = (error: string) => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", error);
    // Carry over any cookie mutations (e.g., signOut clears) into the new redirect.
    const errResponse = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) {
      errResponse.cookies.set(c);
    }
    response = errResponse;
    return response;
  };

  let userEmail: string | null = null;
  let userId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) {
      return failTo("callback_failed");
    }
    userEmail = data.user.email;
    userId = data.user.id;
  } else if (tokenHash && otpType) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error || !data.user?.email) {
      return failTo("callback_failed");
    }
    userEmail = data.user.email;
    userId = data.user.id;
  } else {
    return failTo("callback_failed");
  }

  const email = userEmail!.toLowerCase();

  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await supabase.auth.signOut();
    return failTo("domain_not_allowed");
  }

  const admin = getSupabaseServerClient();
  if (!admin) {
    return failTo("callback_failed");
  }

  const { data: row } = await admin
    .from("users")
    .select("id, email, active")
    .eq("email", email)
    .maybeSingle();

  if (!row || row.active === false) {
    await supabase.auth.signOut();
    return failTo("user_not_provisioned");
  }

  await admin
    .from("users")
    .update({ auth_user_id: userId })
    .eq("id", row.id);

  return response;
}
