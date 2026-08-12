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
import { requireOnboardedUser } from "@/lib/session";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const session = await requireOnboardedUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Profile settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Control how your builder identity appears across zihAI.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>
            Your OAuth avatar stays in place until you replace it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-5 pt-4">
          <Avatar
            src={session.user.image}
            alt={session.user.username || "Avatar"}
            size={88}
          />
          <ImageUploader kind="avatar" currentCount={0} compact />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Public identity</CardTitle>
          <CardDescription>
            Changing your username also changes your public profile URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ProfileForm username={session.user.username || ""} />
        </CardContent>
      </Card>
    </div>
  );
}
