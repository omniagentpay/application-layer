import { PageHeader } from '@/components/PageHeader';
import { CodeSnippet } from '@/components/CodeSnippet';
import { JsonViewer } from '@/components/JsonViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { mcpService, mcpConfig, requiredEnvVars } from '@/services/mcp';
import type { McpToolResult } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { workspacesService, type ApiKeyListItem } from '@/services/workspaces';
import { CopyButton } from '@/components/CopyButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DevelopersPage() {
  const { workspace } = useApp();
  const { toast } = useToast();
  const [toolResults, setToolResults] = useState<Record<string, McpToolResult | null>>({});
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  // Load API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, [workspace.id]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      setApiKeyError(null);
      const keys = await workspacesService.getApiKeys(workspace.id);
      setApiKeys(keys);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load API keys';
      setApiKeyError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      setGeneratingKey(true);
      setApiKeyError(null);
      const result = await workspacesService.generateApiKey(workspace.id);
      setGeneratedApiKey(result.key);
      setApiKeyDialogOpen(true);
      await loadApiKeys();
      toast({
        title: 'Success',
        description: 'API key generated successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate API key';
      setApiKeyError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRunTool = async (toolName: string) => {
    setRunningTool(toolName);
    const result = await mcpService.executeTool(toolName, {
      wallet_id: 'wallet_1',
      limit: 5,
      amount: 100,
      source_chain: 'ethereum',
      dest_chain: 'polygon',
    });
    setToolResults((prev) => ({ ...prev, [toolName]: result }));
    setRunningTool(null);
  };

  const tools = ['check_balance', 'simulate', 'pay', 'history', 'bridge', 'unified_balance'];

  return (
    <div>
      <PageHeader
        title="Developers"
        description="MCP integration and API tools"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Keys</CardTitle>
            <CardDescription>Manage API keys for programmatic access to OmniAgentPay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {apiKeyError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{apiKeyError}</AlertDescription>
              </Alert>
            )}
            <Button 
              variant="outline" 
              onClick={handleGenerateApiKey}
              disabled={generatingKey}
            >
              {generatingKey ? 'Generating...' : 'Generate New API Key'}
            </Button>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading API keys...</p>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-2">
                <Label>Existing API Keys</Label>
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{key.name || 'Unnamed Key'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{key.key}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {new Date(key.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No API keys generated yet.</p>
            )}
          </CardContent>
        </Card>

        {/* MCP Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claude Desktop MCP Config</CardTitle>
            <CardDescription>Add to your claude_desktop_config.json</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeSnippet
              code={JSON.stringify(mcpConfig, null, 2)}
              language="json"
              title="claude_desktop_config.json"
            />
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requiredEnvVars.map((envVar) => (
                <div key={envVar.name} className="border rounded-lg p-3">
                  <code className="text-sm font-mono text-primary">{envVar.name}</code>
                  <p className="text-xs text-muted-foreground mt-1">{envVar.description}</p>
                  {envVar.default && (
                    <p className="text-xs mt-1">Default: <code>{envVar.default}</code></p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tool Tester */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tool Tester</CardTitle>
            <CardDescription>Test MCP tools and view responses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-6">
              {tools.map((tool) => (
                <Button
                  key={tool}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunTool(tool)}
                  disabled={runningTool === tool}
                >
                  {runningTool === tool && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  {tool}
                </Button>
              ))}
            </div>

            {Object.entries(toolResults).map(([tool, result]) => (
              result && (
                <div key={tool} className="border rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <code className="font-mono text-sm">{tool}</code>
                    {result.success ? (
                      <Badge className="bg-success/10 text-success">
                        <CheckCircle className="h-3 w-3 mr-1" /> Success
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive/10 text-destructive">
                        <XCircle className="h-3 w-3 mr-1" /> Failed
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{result.duration}ms</span>
                  </div>
                  <JsonViewer data={result.data || result.error} />
                </div>
              )
            ))}
          </CardContent>
        </Card>
      </div>

      {/* API Key Display Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Your new API key has been generated. Make sure to copy it now as you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <code className="flex-1 text-sm font-mono break-all">
                {generatedApiKey}
              </code>
              {generatedApiKey && <CopyButton value={generatedApiKey} />}
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Store this key securely. It will not be shown again.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setApiKeyDialogOpen(false)}>I've copied the key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
