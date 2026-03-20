"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, CircleAlert, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { isPersonalEmailDomain } from "@/lib/auth-client";

const inputClassName = "h-10 text-base";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("message");
  });
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const emailEntry = formData.get("email");
    const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
    const passwordEntry = formData.get("password");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";

    if (!email || !password) {
      setMessage("Please provide email and password.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }

    router.push("/schedule");
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const fullNameEntry = formData.get("fullName");
    const fullName =
      typeof fullNameEntry === "string" ? fullNameEntry.trim() : "";
    const emailEntry = formData.get("email");
    const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
    const passwordEntry = formData.get("password");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";

    if (!fullName || !email || !password) {
      setMessage("Please provide full name, email, and password.");
      setIsError(true);
      return;
    }

    if (isPersonalEmailDomain(email)) {
      setMessage(
        "Please use your work email. Personal email providers like Gmail and Outlook are not supported.",
      );
      setIsError(true);
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      setIsError(true);
      return;
    }

    if (data.session) {
      router.push("/schedule");
      return;
    }

    setMessage("Account created. You can now sign in.");
    setIsError(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[26rem] flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <Building2 className="size-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Bookaroom</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Plan your office days together with your team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Welcome</CardTitle>
          <CardDescription>
            Sign in or create an account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-5 grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Work email</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Your password"
                    className={inputClassName}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Jane Doe"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email">Work email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className={inputClassName}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {message && (
            <div
              className={
                isError
                  ? "mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                  : "mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground"
              }
            >
              {isError && <CircleAlert className="mt-0.5 size-4 shrink-0" />}
              <span>{message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-10 grid grid-cols-3 gap-6 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            Interactive
            <br />
            calendar
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <Users className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            Team
            <br />
            visibility
          </p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <Zap className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            Real-time
            <br />
            updates
          </p>
        </div>
      </div>
    </main>
  );
}
