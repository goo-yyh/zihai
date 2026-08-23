import type { Metadata } from "next";

import { deleteAccountAction } from "@/actions/security";
import { PasswordForm } from "@/components/settings/password-form";
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
import { hasCredentialAccount } from "@/db/queries/account";
import { getTranslations } from "@/lib/i18n-server";
import { requireOnboardedUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("Security settings") };
}

export default async function SecuritySettingsPage() {
  const [session, { t }] = await Promise.all([
    requireOnboardedUser(),
    getTranslations(),
  ]);
  const hasPassword = await hasCredentialAccount(session.user.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{t("Security")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Manage sign-in methods and account data.")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {t(hasPassword ? "Change password" : "Set password")}
          </CardTitle>
          <CardDescription>
            {t(
              hasPassword
                ? "Changing your password revokes your other active sessions."
                : "Set a password to sign in with your public username.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <PasswordForm hasPassword={hasPassword} />
        </CardContent>
      </Card>
      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-danger">{t("Delete account")}</CardTitle>
          <CardDescription>
            {t(
              "This permanently removes your profile, projects, iterations, ideas, likes, and uploaded Blob images.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form
            action={deleteAccountAction}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="confirmation">
                {t("Type DELETE to confirm")}
              </Label>
              <Input
                id="confirmation"
                name="confirmation"
                pattern="DELETE"
                required
              />
            </div>
            <Button type="submit" variant="danger">
              {t("Delete my account")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
