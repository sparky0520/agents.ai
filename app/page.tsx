import { Header } from "@/components/marketplace/Header";
import { SearchBar } from "@/components/marketplace/SearchBar";
import { AgentGrid } from "@/components/marketplace/AgentGrid";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="flex flex-col items-center space-y-4 text-center">
            <h1 className="font-mono text-4xl font-extrabold tracking-tight lg:text-5xl">
              Discover & Hire AI Agents
            </h1>
            <p className="max-w-[700px] text-muted-foreground">
              The premier marketplace for autonomous agents. Verified, secure,
              and ready to deploy.
            </p>
            <div className="pt-4">
              <SearchBar />
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-mono text-2xl font-bold tracking-tight">
              Featured Agents
            </h2>
            <AgentGrid />
          </div>
        </div>
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 AI Agents Marketplace. Built on Starknet.</p>
      </footer>
    </div>
  );
}
