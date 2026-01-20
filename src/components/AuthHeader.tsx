import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { setGlobalPrivyUserId } from '@/lib/api-client';

export function AuthHeader() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const navigate = useNavigate();
  const location = useLocation();

  // Set global Privy user ID for API client
  useEffect(() => {
    if (user?.id) {
      setGlobalPrivyUserId(user.id);
    } else {
      setGlobalPrivyUserId(null);
    }
  }, [user?.id]);

  // Don't show on login page or landing page
  if (location.pathname === '/login' || location.pathname === '/') {
    return null;
  }

  const handleSignUp = () => {
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!ready) {
    return null;
  }

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      <div className="flex items-center gap-2">
        {authenticated ? (
          <>
            <span className="text-sm text-muted-foreground mr-2">
              {user?.email || user?.wallet?.address?.slice(0, 6) + '...'}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={handleLogin}>
              Log In
            </Button>
            <Button size="sm" onClick={handleSignUp} className="bg-purple-600 hover:bg-purple-700">
              Sign Up
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
