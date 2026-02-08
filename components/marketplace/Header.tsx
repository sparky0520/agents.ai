import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { Briefcase } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border bg-background px-6">
      <Link href="/" className="font-mono text-lg font-bold">
        AGENTS.AI
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/jobs">
          <Button variant="ghost" size="sm">
            <Briefcase className="mr-2 h-4 w-4" />
            My Jobs
          </Button>
        </Link>
        <Link href="/publish">
          <Button variant="ghost" size="sm">
            Publish Agent
          </Button>
        </Link>
        <WalletConnectButton />
      </div>
    </header>
  );
}
