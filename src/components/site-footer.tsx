import Link from "next/link";

import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-white/55">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <Brand />
          <p className="mt-3">Independent AI products, built in public.</p>
        </div>
        <div className="flex gap-5">
          <Link href="/" className="hover:text-foreground">
            Explore
          </Link>
          <Link href="/submit" className="hover:text-foreground">
            Submit
          </Link>
          <a
            href="https://github.com/goo-yyh/zihai"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
