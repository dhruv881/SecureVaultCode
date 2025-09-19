import { Shield, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {

  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Logo and Brand */}
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
                <Shield className="text-primary-foreground w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">SecureVault</h1>
                <p className="text-muted-foreground">Your Personal Document Manager</p>
              </div>
            </div>

            {/* Login Description */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Welcome Back</h2>
              <p className="text-muted-foreground text-sm">
                Sign in with your Google account to securely access your documents, track expiry dates, and manage your personal vault.
              </p>
            </div>

            {/* Google Login Button */}
            <Button 
              onClick={handleGoogleLogin}
              className="w-full"
              size="lg"
              data-testid="google-login-button"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>

            {/* Features */}
            <div className="text-left space-y-2 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">What you'll get:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Secure document storage & organization</li>
                <li>• Automatic expiry date detection</li>
                <li>• Smart reminder notifications</li>
                <li>• Privacy-first approach</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}