import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
}

export function AgentCard({
  id,
  name,
  description,
  price,
  tags,
}: AgentCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="font-mono text-xl">{name}</CardTitle>
          <Badge variant="outline" className="font-mono">
            {price}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="font-mono text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full font-mono">View Details</Button>
      </CardFooter>
    </Card>
  );
}
