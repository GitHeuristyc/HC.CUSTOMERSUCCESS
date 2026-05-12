import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { UserId } from "./types";

let _serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_serverClient) {
    _serverClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serverClient;
}

const USER_EMAIL_BY_ID: Record<UserId, string> = {
  jesus: "jrincon@heuristyc.com",
  david: "david@heuristyc.com",
};

type UserMaps = {
  idToUuid: Record<UserId, string>;
  uuidToId: Record<string, UserId>;
};

let _userMapsPromise: Promise<UserMaps | null> | null = null;

async function loadUserMaps(client: SupabaseClient): Promise<UserMaps | null> {
  const emails = Object.values(USER_EMAIL_BY_ID);
  const { data, error } = await client
    .from("users")
    .select("id, email")
    .in("email", emails);
  if (error || !data) return null;

  const idToUuid = {} as Record<UserId, string>;
  const uuidToId: Record<string, UserId> = {};
  for (const row of data) {
    const uid = (Object.entries(USER_EMAIL_BY_ID).find(
      ([, e]) => e === row.email
    )?.[0] ?? null) as UserId | null;
    if (uid) {
      idToUuid[uid] = row.id;
      uuidToId[row.id] = uid;
    }
  }
  return { idToUuid, uuidToId };
}

export async function getUserMaps(
  client: SupabaseClient
): Promise<UserMaps | null> {
  if (!_userMapsPromise) {
    _userMapsPromise = loadUserMaps(client).catch(() => null);
  }
  const maps = await _userMapsPromise;
  if (!maps) _userMapsPromise = null;
  return maps;
}

export function assigneeToUuid(
  assignee: UserId | "both",
  maps: UserMaps
): string | null {
  if (assignee === "both") return null;
  return maps.idToUuid[assignee] ?? null;
}

export function uuidToAssignee(
  uuid: string | null,
  maps: UserMaps
): UserId | "both" {
  if (!uuid) return "both";
  return maps.uuidToId[uuid] ?? "both";
}
