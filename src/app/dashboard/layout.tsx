import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { getTranslations } from "@/lib/i18n-server";
import { requireOnboardedUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: t("Dashboard"),
    robots: { index: false, follow: false },
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireOnboardedUser();
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <Sidebar />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
