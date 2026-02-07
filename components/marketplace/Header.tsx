import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-6">
      <Link href="/" className="font-mono text-lg font-bold">
        AGENTS.AI
      </Link>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm">
          Log in
        </Button>
        <Button size="sm">Sign up</Button>
      </div>
    </header>
  );
}
