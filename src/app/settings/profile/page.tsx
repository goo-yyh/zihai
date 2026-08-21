import type { Metadata } from "next";

import { ProfileForm } from "@/components/settings/profile-form";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUploader } from "@/components/upload/image-uploader";
import { getTranslations } from "@/lib/i18n-server";
import { getInitialContactEmail } from "@/lib/contact-email";
import { requireOnboardedUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("Profile settings") };
}

export default async function ProfileSettingsPage() {
  const [session, { t }] = await Promise.all([
    requireOnboardedUser(),
    getTranslations(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {t("Profile settings")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Control how your builder identity appears across zihAI.")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("Avatar")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-5 pt-4">
          <Avatar
            src={session.user.image}
            alt={session.user.username || t("Avatar")}
            size={88}
          />
          <ImageUploader kind="avatar" currentCount={0} compact />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("Public identity")}</CardTitle>
          <CardDescription>
            {t("Changing your username also changes your public profile URL.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ProfileForm
            username={session.user.username || ""}
            contactEmail={getInitialContactEmail(
              session.user.contactEmail,
              session.user.email,
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
