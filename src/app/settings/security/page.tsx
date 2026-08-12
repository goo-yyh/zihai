import type { Metadata } from "next";

import { deleteAccountAction } from "@/actions/profile";
import { SecurityForm } from "@/components/settings/security-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireOnboardedUser } from "@/lib/session";

export const metadata: Metadata = { title: "Security settings" };

export default async function SecuritySettingsPage() {
  await requireOnboardedUser();
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black tracking-tight">Security</h1><p className="mt-2 text-sm text-muted-foreground">Manage your username sign-in password and account data.</p></div>
      <Card><CardHeader><CardTitle>Change password</CardTitle><CardDescription>Other active sessions are revoked after a successful change.</CardDescription></CardHeader><CardContent className="pt-4"><SecurityForm /></CardContent></Card>
      <Card className="border-rose-200"><CardHeader><CardTitle className="text-danger">Delete account</CardTitle><CardDescription>This permanently removes your profile, projects, iterations, likes, and uploaded Blob images.</CardDescription></CardHeader><CardContent className="pt-4"><form action={deleteAccountAction} className="flex flex-wrap items-end gap-3"><div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="confirmation">Type DELETE to confirm</Label><Input id="confirmation" name="confirmation" pattern="DELETE" required /></div><Button type="submit" variant="danger">Delete my account</Button></form></CardContent></Card>
    </div>
  );
}
