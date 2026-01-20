import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from './CopyButton';
import { CodeSnippet } from './CodeSnippet';
import { LoadingSkeleton } from './LoadingSkeleton';
import { Server, Wrench, Code } from 'lucide-react';
import type { McpSdkContract } from '@/types';
import { paymentsService } from '@/services/payments';

interface McpSdkContractExplorerProps {
  intentId: string;
  className?: string;
}

export function McpSdkContractExplorer({ intentId, className }: McpSdkContractExplorerProps) {
  const [contract, setContract] = useState<McpSdkContract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContract();
  }, [intentId]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const data = await paymentsService.getContract(intentId);
      setContract(data);
    } catch (error) {
      console.error('Failed to load contract:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="card" count={1} className={className} />;
  }

  if (!contract) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No contract data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">MCP / SDK Contract Explorer</CardTitle>
        <CardDescription>View backend API calls, MCP tools, and SDK methods</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Server className="h-3 w-3" />
              API Call
            </TabsTrigger>
            <TabsTrigger value="mcp" className="flex items-center gap-2">
              <Wrench className="h-3 w-3" />
              MCP Tool
            </TabsTrigger>
            <TabsTrigger value="sdk" className="flex items-center gap-2">
              <Code className="h-3 w-3" />
              SDK Method
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="mt-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Method</p>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {contract.backendApiCall.method}
                </code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Endpoint</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded flex-1">
                    {contract.backendApiCall.endpoint}
                  </code>
                  <CopyButton value={contract.backendApiCall.endpoint} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Payload</p>
                <CodeSnippet
                  code={JSON.stringify(contract.backendApiCall.payload, null, 2)}
                  language="json"
                />
              </div>
              {contract.backendApiCall.headers && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Headers</p>
                  <CodeSnippet
                    code={JSON.stringify(contract.backendApiCall.headers, null, 2)}
                    language="json"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mcp" className="mt-4">
            {contract.mcpToolInvoked ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tool Name</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {contract.mcpToolInvoked.toolName}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tool ID</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {contract.mcpToolInvoked.toolId}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Input</p>
                  <CodeSnippet
                    code={JSON.stringify(contract.mcpToolInvoked.input, null, 2)}
                    language="json"
                  />
                </div>
                {contract.mcpToolInvoked.output && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Output</p>
                    <CodeSnippet
                      code={JSON.stringify(contract.mcpToolInvoked.output, null, 2)}
                      language="json"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No MCP tool invocation recorded
              </div>
            )}
          </TabsContent>

          <TabsContent value="sdk" className="mt-4">
            {contract.sdkMethodCalled ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Method</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {contract.sdkMethodCalled.method}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Parameters</p>
                  <CodeSnippet
                    code={JSON.stringify(contract.sdkMethodCalled.params, null, 2)}
                    language="json"
                  />
                </div>
                {contract.sdkMethodCalled.result && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Result</p>
                    <CodeSnippet
                      code={JSON.stringify(contract.sdkMethodCalled.result, null, 2)}
                      language="json"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No SDK method call recorded
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
