import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, LogIn } from 'lucide-react';

export default function Login() {
  const { isAuthenticated, signIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pos', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">KASIR 37</CardTitle>
            <CardDescription>Silakan login untuk mengakses aplikasi</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={signIn} 
            className="w-full" 
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Login dengan Netlify Identity
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
