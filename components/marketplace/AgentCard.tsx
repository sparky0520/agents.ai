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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  price: string;
  tags: string[];
  isSelected?: boolean;
  onToggleSelect?: (checked: boolean) => void;
}

export function AgentCard({
  id,
  name,
  description,
  price,
  tags,
  isSelected,
  onToggleSelect,
}: AgentCardProps) {
  return (
    <Card
      className={`flex h-full flex-col justify-between border-border bg-card transition-all ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {onToggleSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(c) => onToggleSelect(c as boolean)}
                className=""
              />
            )}
            <CardTitle className="font-mono text-xl">{name}</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono whitespace-nowrap">
            {price}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 text-muted-foreground pt-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {(tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="font-mono text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full font-mono" asChild>
          <Link href={`/agent/${id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
