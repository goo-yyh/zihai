"use client";

import { LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { type FocusEvent, useState } from "react";

import { Avatar } from "@/components/ui/avatar";

export function AccountMenu({
  image,
  label,
  dashboardLabel,
  settingsLabel,
  showMenu,
}: {
  image?: string | null;
  label: string;
  dashboardLabel: string;
  settingsLabel: string;
  showMenu: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suppressUntilMouseLeaves, setSuppressUntilMouseLeaves] =
    useState(false);

  function openMenu() {
    if (showMenu && !suppressUntilMouseLeaves) setIsOpen(true);
  }

  function closeMenu() {
    setIsOpen(false);
  }

  function dismissUntilPointerLeaves() {
    setIsOpen(false);
    setSuppressUntilMouseLeaves(true);
  }

  function handleMouseLeave() {
    setIsOpen(false);
    setSuppressUntilMouseLeaves(false);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (
      !(nextTarget instanceof Node) ||
      !event.currentTarget.contains(nextTarget)
    ) {
      closeMenu();
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={handleMouseLeave}
      onFocus={openMenu}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeMenu();
      }}
    >
      <Link
        href="/dashboard"
        className="flex size-8 overflow-hidden rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={dashboardLabel}
        onClick={dismissUntilPointerLeaves}
      >
        <Avatar src={image} alt={label} size={32} />
      </Link>
      {showMenu && isOpen ? (
        <div className="absolute right-0 top-full z-50 w-44 pt-2">
          <div
            className="rounded-xl border bg-background p-1.5 shadow-lg"
            aria-label={label}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              onClick={dismissUntilPointerLeaves}
            >
              <LayoutDashboard className="size-4" />
              {dashboardLabel}
            </Link>
            <Link
              href="/settings/profile"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              onClick={dismissUntilPointerLeaves}
            >
              <Settings className="size-4" />
              {settingsLabel}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
