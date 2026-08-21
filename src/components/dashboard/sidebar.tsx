import {
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  ListChecks,
  Mailbox,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";

import { isFeatureEnabled } from "@/lib/features";
import { getTranslations } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const userItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "My projects", icon: FileClock },
  { href: "/settings/profile", label: "Profile", icon: Settings },
];

const adminItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/projects", label: "Projects", icon: ClipboardCheck },
  { href: "/admin/iterations", label: "Iterations", icon: ListChecks },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: Mailbox },
  { href: "/admin/audit", label: "Audit log", icon: FileClock },
];

export async function Sidebar({
  admin = false,
  className,
}: {
  admin?: boolean;
  className?: string;
}) {
  const { t } = await getTranslations();
  const items = (admin ? adminItems : userItems).filter(
    (item) =>
      item.href !== "/admin/iterations" || isFeatureEnabled("iterations"),
  );
  return (
    <aside
      className={cn("w-full lg:sticky lg:top-20 lg:h-fit lg:w-56", className)}
    >
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm"
            >
              <Icon className="size-4" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
