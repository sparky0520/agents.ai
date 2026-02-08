"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import {
  escrowContract,
  Job,
  JobStatus,
} from "@/lib/contracts/escrow-contract";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { stroopsToXlm } from "@/lib/stellar-client";
import Link from "next/link";

export default function JobsPage() {
  const { walletAddress, isConnected } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && walletAddress) {
      loadJobs();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, walletAddress]);

  const loadJobs = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const jobIds = await escrowContract.getJobsByHirer(walletAddress);

      const jobDetails = await Promise.all(
        jobIds.map((id) => escrowContract.getJob(id)),
      );

      setJobs(jobDetails);
    } catch (err: any) {
      console.error("Error loading jobs:", err);
      setError(err.message || "Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case JobStatus.Pending:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
          >
            <Clock className="mr-1 h-3 w-3" /> Pending
          </Badge>
        );
      case JobStatus.Completed:
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20"
          >
            <CheckCircle className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case JobStatus.Cancelled:
        return (
          <Badge
            variant="outline"
            className="bg-gray-500/10 text-gray-600 border-gray-500/20"
          >
            <XCircle className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      case JobStatus.Disputed:
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-500/20"
          >
            <AlertCircle className="mr-1 h-3 w-3" /> Disputed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-6 py-4">
            <Link href="/" className="font-mono text-lg font-bold">
              ← Back to Marketplace
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-6 py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Wallet Required</CardTitle>
              <CardDescription>
                Please connect your wallet to view your job history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button className="w-full">Go to Marketplace</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-mono text-lg font-bold">
            ← Back to Marketplace
          </Link>
          <Button
            onClick={loadJobs}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-mono mb-2">My Jobs</h1>
          <p className="text-muted-foreground">
            View your blockchain-secured agent execution history
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-destructive font-bold mb-2">
                <AlertCircle className="h-5 w-5" />
                Error Loading Jobs
              </div>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No jobs found</p>
              <Link href="/">
                <Button>Hire Your First Agent</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card
                key={Number(job.id)}
                className="hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-mono text-base flex items-center gap-2">
                        Job #{Number(job.id)}
                        {getStatusBadge(job.status)}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {job.agent_id}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">
                        {stroopsToXlm(Number(job.amount))} XLM
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(job.created_at)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid Grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Agent Owner
                      </div>
                      <div className="truncate text-xs">
                        {job.agent_owner.slice(0, 8)}...
                        {job.agent_owner.slice(-6)}
                      </div>
                    </div>
                    {job.completed_at && (
                      <div>
                        <div className="text-muted-foreground text-xs">
                          Completed At
                        </div>
                        <div className="text-xs">
                          {formatDate(job.completed_at)}
                        </div>
                      </div>
                    )}
                  </div>

                  {job.status === JobStatus.Pending && (
                    <div className="mt-4 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-sm">
                      <strong>Pending:</strong> Job is in progress or awaiting
                      completion.
                    </div>
                  )}

                  {job.status === JobStatus.Completed && (
                    <div className="mt-4 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-sm">
                      <strong>Completed:</strong> Payment released to agent
                      owner.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
