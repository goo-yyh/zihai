import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/dashboard/sidebar";
import { getTranslations } from "@/lib/i18n-server";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return {
    title: { default: t("Admin"), template: `%s — zihAI ${t("Admin")}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[14rem_1fr] lg:px-8">
      <Sidebar admin />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
