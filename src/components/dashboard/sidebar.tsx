import {
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const userItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "My projects", icon: FileClock },
  { href: "/settings/profile", label: "Profile", icon: Settings },
  { href: "/settings/security", label: "Security", icon: LockKeyhole },
];

const adminItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/projects", label: "Projects", icon: ClipboardCheck },
  { href: "/admin/iterations", label: "Iterations", icon: ListChecks },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: FileClock },
];

export function Sidebar({ admin = false, className }: { admin?: boolean; className?: string }) {
  const items = admin ? adminItems : userItems;
  return (
    <aside className={cn("w-full lg:w-56", className)}>
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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
