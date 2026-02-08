"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, FileCode, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function PublishAgentForm() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [price, setPrice] = useState("0.10 XLM");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REQUIRED_FILES = [
    "agent.yaml",
    "input_schema.json",
    "output_schema.json",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setError(null);
    }
  };

  const validateFiles = (fileList: FileList) => {
    const fileNames = Array.from(fileList).map((f) => f.name);
    const missing = REQUIRED_FILES.filter((req) => !fileNames.includes(req));
    // Check for python script separately? No, backend just needs "a script".
    // Ideally we check for .py file but let's just ensure the strict 3 schemas/configs + 1 script.

    if (missing.length > 0) {
      return `Missing required files: ${missing.join(", ")}`;
    }

    if (fileList.length < 4) {
      return "You must upload at least 4 files (agent.yaml, schemas, and a python script).";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files) return;

    const validationError = validateFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file); // Key doesn't matter too much if backend iterates, but let's be consistent
      });
      formData.append("price", price);
      formData.append("tags", tags);

      const response = await fetch("/api/agents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish agent");
      }

      const data = await response.json();
      router.push(`/?newAgent=${data.agentId}`); // Redirect to home or agent page
      // Ideally we'd have an agent details page like /agent/[id]
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Publish New Agent</CardTitle>
        <CardDescription>
          Upload your agent package to list it on the marketplace.
          <br />
          Required files: <code>agent.yaml</code>,{" "}
          <code>input_schema.json</code>, <code>output_schema.json</code>, and
          your python script.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Agent Package (Select 4 files)
            </label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
              <Input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".yaml,.json,.py"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to select files or drag and drop
                </span>
              </label>
            </div>
            {files && (
              <div className="space-y-1 mt-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Selected files:
                </p>
                {Array.from(files).map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-sm">
                    <FileCode className="h-4 w-4 text-primary" /> {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price</label>
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 0.10 XLM"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tags (comma separated)
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Search, Reddit, Analysis"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!files || isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish Agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
