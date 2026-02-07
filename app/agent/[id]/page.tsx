import { Header } from "@/components/marketplace/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Star, Shield, Zap } from "lucide-react";
import Link from "next/link";

// Mock data fetch
function getAgent(id: string) {
  const agents = {
    "1": {
      id: "1",
      name: "CodeAssistant v1",
      description:
        "Specialized in Python and TypeScript refactoring. Can handle large codebases and maintain consistent style.",
      price: "0.05 ETH",
      tags: ["Coding", "Refactoring", "TypeScript"],
      rating: 4.8,
      reviews: 124,
      author: "DevCorp",
    },
  };
  return agents[id as keyof typeof agents];
}

export default function AgentPage({ params }: { params: { id: string } }) {
  const agent = getAgent(params.id);

  // Fallback for prototype if id not 1
  const data = agent || getAgent("1");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Link>

          <div className="flex flex-col gap-8 md:flex-row md:items-start">
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <h1 className="font-mono text-4xl font-bold">{data?.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {data?.rating} ({data?.reviews} reviews)
                  </span>
                  <span>•</span>
                  <span>By {data?.author}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {data?.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-mono">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="space-y-4 rounded-lg border border-border p-6">
                <h3 className="font-mono text-lg font-semibold">
                  About this Agent
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {data?.description}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" /> Verified secure execution
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" /> Instant deployment
                  </li>
                </ul>
              </div>
            </div>

            <Card className="w-full md:w-[350px]">
              <CardContent className="space-y-6 p-6">
                <div className="space-y-2 text-center">
                  <span className="text-sm text-muted-foreground">
                    License Price
                  </span>
                  <div className="font-mono text-3xl font-bold">
                    {data?.price}
                  </div>
                </div>
                <Button className="w-full font-mono text-lg" size="lg">
                  Buy License
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Protected by escrow smart contract.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
