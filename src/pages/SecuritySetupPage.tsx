import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';

const SecuritySetupPage = () => {
  const navigate = useNavigate();
  const [cspConfirmed, setCspConfirmed] = useState(false);
  const [xFrameConfirmed, setXFrameConfirmed] = useState(false);

  const canContinue = cspConfirmed && xFrameConfirmed;

  const handleContinue = () => {
    if (canContinue) {
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Secure your app</h1>
          <p className="text-lg text-muted-foreground">
            A major part of moving to production is ensuring your app is set up to protect users. 
            Confirm you've completed the following essential steps.
          </p>
        </div>

        <div className="space-y-6">
          {/* CSP Setup Card */}
          <Card className="relative border-red-500/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="mb-2">Set up Content Security Policy (CSP)</CardTitle>
                  <CardDescription>
                    Set up your CSP to protect the embedded wallet iframe.
                  </CardDescription>
                </div>
                <div className="ml-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-600">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <a
                  href="https://docs.privy.io/guide/react/security/csp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 underline hover:text-blue-600"
                >
                  CSP guidance
                </a>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="csp-confirm"
                    checked={cspConfirmed}
                    onCheckedChange={(checked) => setCspConfirmed(checked === true)}
                  />
                  <label
                    htmlFor="csp-confirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I have set up a Content Security Policy
                  </label>
                </div>
                {!cspConfirmed && (
                  <p className="text-sm text-red-500">
                    Confirm you have set up a Content Security Policy to continue.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* X-Frame Options Card */}
          <Card className="relative border-red-500/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="mb-2">Set X-Frame options</CardTitle>
                  <CardDescription>
                    Restrict X-Frame options to cut down on cross-site scripting.
                  </CardDescription>
                </div>
                <div className="ml-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-600">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <a
                  href="https://docs.privy.io/guide/react/security/integration-security-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 underline hover:text-blue-600"
                >
                  Integration security guide
                </a>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="xframe-confirm"
                    checked={xFrameConfirmed}
                    onCheckedChange={(checked) => setXFrameConfirmed(checked === true)}
                  />
                  <label
                    htmlFor="xframe-confirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I have followed the integration security guide
                  </label>
                </div>
                {!xFrameConfirmed && (
                  <p className="text-sm text-red-500">
                    Confirm you have followed the integration security guide to continue.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySetupPage;
