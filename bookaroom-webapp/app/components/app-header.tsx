"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type AppHeaderProps = {
  activePath: "/schedule" | "/timeline";
  userLabel: string;
};

export function AppHeader({ activePath, userLabel }: AppHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold">Bookaroom</h1>
          <nav className="flex items-center gap-2">
            <Link
              href="/schedule"
              className={cn(
                buttonVariants({ size: "sm", variant: activePath === "/schedule" ? "default" : "ghost" }),
              )}
            >
              My Schedule
            </Link>
            <Link
              href="/timeline"
              className={cn(
                buttonVariants({ size: "sm", variant: activePath === "/timeline" ? "default" : "ghost" }),
              )}
            >
              Company Timeline
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{userLabel}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
