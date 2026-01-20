import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { WorkspaceContext } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockWorkspaces: WorkspaceContext[] = [
  { id: 'ws_1', name: 'Default Workspace', plan: 'pro' },
  { id: 'ws_2', name: 'Development', plan: 'free' },
  { id: 'ws_3', name: 'Production', plan: 'enterprise' },
];

export function WorkspaceSwitcherModal({
  open,
  onOpenChange,
}: WorkspaceSwitcherModalProps) {
  const { workspace, setWorkspace } = useApp();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleSwitchWorkspace = (ws: WorkspaceContext) => {
    setWorkspace(ws);
    onOpenChange(false);
    toast({
      title: 'Workspace switched',
      description: `Switched to ${ws.name}`,
    });
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a workspace name',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    // Simulate API call
    setTimeout(() => {
      const newWorkspace: WorkspaceContext = {
        id: `ws_${Date.now()}`,
        name: newWorkspaceName.trim(),
        plan: 'free',
      };
      mockWorkspaces.push(newWorkspace);
      setWorkspace(newWorkspace);
      setNewWorkspaceName('');
      setCreating(false);
      onOpenChange(false);
      toast({
        title: 'Success',
        description: `Created workspace "${newWorkspace.name}"`,
      });
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Switch Workspace</DialogTitle>
          <DialogDescription>
            Select a workspace or create a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Workspaces</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md">
              {mockWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitchWorkspace(ws)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    workspace.id === ws.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{ws.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{ws.plan}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="newWorkspace">Create New Workspace</Label>
            <div className="flex gap-2">
              <Input
                id="newWorkspace"
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    handleCreateWorkspace();
                  }
                }}
                disabled={creating}
              />
              <Button
                onClick={handleCreateWorkspace}
                disabled={creating || !newWorkspaceName.trim()}
                size="icon"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
