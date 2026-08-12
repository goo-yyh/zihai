import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center"><span className="rounded-2xl bg-muted p-4"><SearchX className="size-7 text-primary" /></span><h1 className="mt-5 text-4xl font-black tracking-tight">Nothing shipped here</h1><p className="mt-3 text-muted-foreground">This page does not exist, or the content is not publicly approved.</p><Button asChild className="mt-6"><Link href="/">Explore products</Link></Button></div>;
}
