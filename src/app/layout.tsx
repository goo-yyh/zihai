import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import { I18nProvider } from "@/components/i18n-provider";
import { SiteHeader } from "@/components/site-header";
import { getTranslations } from "@/lib/i18n-server";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  const description = t(SITE_DESCRIPTION);
  const title = `${SITE_NAME} — ${t("Share your AI products")}`;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: title, template: `%s — ${SITE_NAME}` },
    description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getTranslations();
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <I18nProvider locale={locale}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <Toaster richColors position="bottom-right" />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
