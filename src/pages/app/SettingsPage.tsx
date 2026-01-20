import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { workspacesService } from '@/services/workspaces';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AtSign, Loader2, CheckCircle2 } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ensureUserInSupabase } from '@/lib/supabase';
import { getUserByPrivyId, updateUsername, checkUsernameAvailability } from '@/services/supabase/users';

export default function SettingsPage() {
  const { workspace, setWorkspace } = useApp();
  const { toast } = useToast();
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState(workspace.name);

  useEffect(() => {
    if (authenticated && user) {
      loadUserData();
    }
  }, [authenticated, user, wallets]);

  const loadUserData = async () => {
    try {
      const privyUserId = user?.id;
      if (!privyUserId) return;

      const email = user?.email?.address || user?.google?.email || undefined;
      const walletAddress = user?.wallet?.address || wallets?.[0]?.address || undefined;

      const userId = await ensureUserInSupabase(privyUserId, email, walletAddress);
      if (!userId) return;

      setSupabaseUserId(userId);

      const userData = await getUserByPrivyId(privyUserId);
      if (userData) {
        setCurrentUsername(userData.username || null);
        setUsername(userData.username || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleUsernameChange = async (value: string) => {
    const normalizedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(normalizedValue);
    setUsernameError('');

    if (normalizedValue.length > 0) {
      if (normalizedValue.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        return;
      }
      if (normalizedValue.length > 20) {
        setUsernameError('Username must be less than 20 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedValue)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
        return;
      }

      // Check availability if username changed
      if (normalizedValue !== currentUsername && supabaseUserId) {
        setCheckingUsername(true);
        const isAvailable = await checkUsernameAvailability(normalizedValue, supabaseUserId);
        setCheckingUsername(false);

        if (!isAvailable) {
          setUsernameError('Username is already taken');
        }
      }
    }
  };

  const handleSaveUsername = async () => {
    if (!supabaseUserId || !username.trim()) {
      setUsernameError('Please enter a username');
      return;
    }

    if (usernameError || username === currentUsername) {
      return;
    }

    if (!user?.wallet?.address && !wallets?.[0]?.address) {
      setUsernameError('Please connect your wallet first');
      return;
    }

    setSavingUsername(true);
    setUsernameError('');

    try {
      const walletAddress = user?.wallet?.address || wallets?.[0]?.address || '';
      const result = await updateUsername(supabaseUserId, username, walletAddress);

      if (!result.success) {
        setUsernameError(result.error || 'Failed to update username');
        return;
      }

      setCurrentUsername(username);
      toast({
        title: 'Success',
        description: `Username @${username} saved successfully!`,
      });
    } catch (error) {
      console.error('Error saving username:', error);
      setUsernameError('Failed to save username. Please try again.');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      setDeleting(true);
      setError(null);
      await workspacesService.deleteWorkspace(workspace.id);
      toast({
        title: 'Success',
        description: 'Workspace deleted successfully',
      });
      // Reset to default workspace after deletion
      setWorkspace({
        id: 'ws_1',
        name: 'Default Workspace',
        plan: 'pro',
      });
      setDeleteDialogOpen(false);
      // Optionally redirect to a different page
      window.location.href = '/';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete workspace';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your workspace settings" />

      <div className="max-w-2xl space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="yourusername"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className="pl-10"
                  maxLength={20}
                  disabled={savingUsername}
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {username && !usernameError && !checkingUsername && username !== currentUsername && (
                  <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your username will be displayed as @{username || 'username'} and linked to your wallet address permanently.
              </p>
            </div>
            {currentUsername && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Username</p>
                <p className="text-sm font-medium">@{currentUsername}</p>
              </div>
            )}
            <Button
              onClick={handleSaveUsername}
              disabled={
                !username.trim() ||
                username === currentUsername ||
                !!usernameError ||
                savingUsername ||
                checkingUsername
              }
            >
              {savingUsername ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Username'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Workspace ID</Label>
              <Input value={workspace.id} disabled />
            </div>
            <Button
              onClick={() => {
                setWorkspace({ ...workspace, name: workspaceName });
                toast({
                  title: 'Success',
                  description: 'Workspace name updated',
                });
              }}
            >
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete this workspace and all associated data. This action cannot be undone.
            </p>
            <Button 
              variant="destructive" 
              onClick={() => setDeleteDialogOpen(true)}
              disabled={workspace.id === 'ws_1'}
            >
              Delete Workspace
            </Button>
            {workspace.id === 'ws_1' && (
              <p className="text-xs text-muted-foreground mt-2">
                The default workspace cannot be deleted.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the workspace
              <strong> {workspace.name}</strong> and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All payment intents</li>
                <li>All transactions</li>
                <li>All wallets</li>
                <li>All API keys</li>
                <li>All guard configurations</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
