import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "yahoo.co.uk",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "web.de",
  "t-online.de",
  "freenet.de",
]);

export function isPersonalEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? PERSONAL_EMAIL_DOMAINS.has(domain) : false;
}

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

  const email = user.email ?? `${user.id}@unknown.local`;
  const domain = email.split("@")[1] ?? "unknown.local";

  const { data: companyId, error: rpcError } = await supabase.rpc(
    "ensure_company_for_domain",
    { p_domain: domain },
  );

  if (rpcError || !companyId) {
    throw new Error(
      `Unable to resolve company: ${rpcError?.message ?? "Unknown error"}`,
    );
  }

  const fullName =
    user.user_metadata.full_name ?? formatNameFromEmail(email);

  const { data: insertedProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: fullName,
      email,
      company_id: companyId,
    })
    .select("id, full_name, email, company_id")
    .single();

  if (insertError) {
    throw new Error(`Unable to create profile: ${insertError.message}`);
  }

  return insertedProfile as Profile;
}
