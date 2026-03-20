import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  company_id: string;
};

function formatNameFromEmail(email: string) {
  const handle = email.split("@")[0] ?? "";
  return handle
    .split(/[._-]/g)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export async function getSignedInUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Unable to load session: ${error.message}`);
  }

  return user;
}

export async function getOrCreateProfile(user: User) {
  const supabase = createClient();

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, full_name, email, company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Unable to load profile: ${selectError.message}`);
  }

  if (existingProfile) {
    return existingProfile as Profile;
  }

  const fullName = user.user_metadata.full_name ?? formatNameFromEmail(user.email ?? "Employee");
  const email = user.email ?? `${user.id}@unknown.local`;

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fullName,
      email,
      company_id: DEFAULT_COMPANY_ID,
    })
    .select("id, full_name, email, company_id")
    .single();

  if (insertError) {
    throw new Error(`Unable to create profile: ${insertError.message}`);
  }

  return insertedProfile as Profile;
}
