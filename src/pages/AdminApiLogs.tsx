import { useState } from "react";
import { useApiAdminLogs } from "@/hooks/useApiAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

const AdminApiLogs = () => {
  const [page, setPage] = useState(1);
  const { data: logs, isLoading, refetch, isFetching } = useApiAdminLogs(page);

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge className="bg-green-600 text-white font-mono">{status}</Badge>;
    }
    if (status >= 400 && status < 500) {
      return <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-500 font-mono">{status}</Badge>;
    }
    return <Badge variant="destructive" className="font-mono">{status}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            API Audit & Security Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time audit log of all REST API and Edge Function requests
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Endpoint Invocations</CardTitle>
          <CardDescription>
            Audit trail capturing status codes, latency, user identifiers, and execution times
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No API requests logged yet. Edge Function calls will automatically appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {log.endpoint}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status_code)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.duration_ms} ms
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                        {log.user_id ? log.user_id.slice(0, 8) + "..." : "Anonymous"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!logs || logs.length < 30 || isLoading}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApiLogs;
