import { Header } from "@/components/marketplace/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Star,
  Shield,
  Zap,
  Terminal,
  Lock,
  Settings,
} from "lucide-react"; // Added icons
import Link from "next/link";
import { Agent } from "@/types/agent";

// Mock data fetch
function getAgent(id: string): Agent | undefined {
  const agents: Record<string, Agent> = {
    "1": {
      id: "1",
      // Flattened properties for backward compatibility/UI ease
      price: "0.05 ETH",
      tags: ["Lead Gen", "Reddit", "Marketing"],
      rating: 4.8,
      reviews: 124,
      author: "DevCorp",
      // Schema properties
      agent_config: {
        name: "Reddit Scout Agent",
        description:
          "Finds potential customers or leads on Reddit based on intent analysis.",
        version: "0.1.0",
      },
      auth_requirements: {
        environment_variables: [
          {
            key: "REDDIT_CLIENT_ID",
            type: "string",
            required: true,
            description: "Reddit App Client ID",
          },
          {
            key: "REDDIT_CLIENT_SECRET",
            type: "string",
            required: true,
            description: "Reddit App Client Secret",
          },
          {
            key: "REDDIT_USER_AGENT",
            type: "string",
            required: false,
            default: "python:agents-ai-python:v0.1.0 (by /u/developer)",
            description: "User agent string for Reddit API identification",
          },
        ],
      },
      user_inputs: {
        query: {
          type: "string",
          description:
            "The search term to find relevant threads (e.g., 'japanese learning app')",
          required: true,
        },
        target_subreddits: {
          type: "array<string>",
          description:
            "List of subreddits to scrape (e.g., ['LearnJapanese', 'languagelearning'])",
          required: true,
        },
        max_users: {
          type: "integer",
          description: "Maximum number of candidates to find before stopping",
          default: 5,
        },
        min_intent_score: {
          type: "float",
          description:
            "Minimum intent score (0.0 to 1.0) required to include a candidate",
          default: 0.7,
        },
      },
    },
  };
  return agents[id];
}

export default function AgentPage({ params }: { params: { id: string } }) {
  const agent = getAgent(params.id);

  // Fallback for prototype if id not 1
  const data = agent || getAgent("1");

  if (!data) {
    return <div>Agent not found</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Agent Details */}
            <div className="md:col-span-2 space-y-8">
              {/* Header Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h1 className="font-mono text-4xl font-bold tracking-tight">
                    {data.agent_config.name}
                  </h1>
                  <Badge variant="outline" className="font-mono text-xs">
                    v{data.agent_config.version}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {data.rating} ({data.reviews} reviews)
                  </span>
                  <span>•</span>
                  <span>By {data.author}</span>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                  {data.agent_config.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* User Inputs Section */}
              <div className="space-y-4 pt-4">
                <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Configuration Inputs
                </h3>
                <div className="grid gap-4">
                  {Object.entries(data.user_inputs).map(([key, input]) => (
                    <Card key={key} className="bg-card/50">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="font-mono text-sm font-medium">
                            {key}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {input.type}
                            </Badge>
                            {input.required && (
                              <Badge className="text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <CardDescription className="text-sm">
                          {input.description}
                        </CardDescription>
                        {input.default !== undefined && (
                          <div className="mt-2 text-xs text-muted-foreground font-mono">
                            Default: {JSON.stringify(input.default)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Requirements Section */}
              <div className="space-y-4 pt-4">
                <h3 className="font-mono text-xl font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5" /> Requirements & Permissions
                </h3>
                <Card className="border-l-4 border-l-primary/50">
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This agent requires the following environment variables to
                      function correctly. You will be prompted to provide these
                      securely upon deployment.
                    </p>
                    <div className="space-y-3">
                      {data.auth_requirements.environment_variables.map(
                        (env) => (
                          <div
                            key={env.key}
                            className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                          >
                            <Terminal className="h-4 w-4 mt-1 text-primary" />
                            <div className="space-y-1">
                              <div className="font-mono text-sm font-medium flex items-center gap-2">
                                {env.key}
                                {env.required && (
                                  <span className="text-xs text-destructive">
                                    *
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {env.description}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right Column: Pricing & Action */}
            <div className="space-y-6">
              <Card className="w-full sticky top-24">
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-2 text-center">
                    <span className="text-sm text-muted-foreground">
                      License Price
                    </span>
                    <div className="font-mono text-3xl font-bold text-primary">
                      {data.price}
                    </div>
                  </div>
                  <Button className="w-full font-mono text-lg py-6" size="lg">
                    Buy License
                  </Button>
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" /> Verified secure execution
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3" /> Instant deployment
                    </div>
                    <p className="text-center text-xs text-muted-foreground pt-2">
                      Protected by escrow smart contract.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
