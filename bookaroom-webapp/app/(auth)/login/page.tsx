"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.search).get("message");
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signInWithPassword(formData: FormData) {
    const emailEntry = formData.get("email");
    const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
    const passwordEntry = formData.get("password");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";

    if (!email || !password) {
      setMessage("Please provide email and password.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/schedule");
  }

  async function signUpWithPassword(formData: FormData) {
    const fullNameEntry = formData.get("fullName");
    const fullName = typeof fullNameEntry === "string" ? fullNameEntry.trim() : "";
    const emailEntry = formData.get("email");
    const email = typeof emailEntry === "string" ? emailEntry.trim() : "";
    const passwordEntry = formData.get("password");
    const password = typeof passwordEntry === "string" ? passwordEntry : "";

    if (!fullName || !email || !password) {
      setMessage("Please provide full name, email, and password.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push("/schedule");
      return;
    }

    setMessage("Account created. You can now sign in.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Office Attendance</CardTitle>
          <CardDescription>Sign in or create an account with email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                action={(formData) => {
                  void signInWithPassword(formData);
                }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">Work email</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                action={(formData) => {
                  void signUpWithPassword(formData);
                }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Jane Doe"
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
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}

          <p className="mt-6 text-xs text-muted-foreground">
            After login, you will be redirected to your schedule.
          </p>
        </CardContent>
      </Card>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Link href="/" className="underline">
          Back to app
        </Link>
      </p>
    </main>
  );
}
