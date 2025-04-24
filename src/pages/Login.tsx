import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show success message if email was just verified
    if (searchParams.get('verified') === 'true') {
      toast({
        title: "Email verified successfully!",
        description: "You can now log in to your account.",
        variant: "default",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Login successful",
        description: "Welcome back to ThinkForge!",
      });
      
      // Redirect to chat page after successful login
      navigate('/chat');
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/chat`
        }
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Google login failed",
        description: error.message || "An error occurred during Google login",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-10">
        <div className="w-full max-w-md px-4">
          <div className="glass-card p-8 rounded-xl neon-border animate-fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
              <p className="text-sm text-foreground/70">
                Login to continue your learning journey
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="yourname@example.com"
                    className="pl-10 glass-dark border-foreground/10 focus:border-thinkforge-purple"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-thinkforge-purple hover:text-thinkforge-purple/90"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-foreground/50" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 glass-dark border-foreground/10 focus:border-thinkforge-purple"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-foreground/50 hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-thinkforge-purple hover:bg-thinkforge-purple/90 shine-animation"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>

              <div className="relative flex items-center justify-center mt-6">
                <div className="border-t border-foreground/10 absolute w-full"></div>
                <span className="bg-thinkforge-black px-4 z-10 text-xs text-foreground/50">OR CONTINUE WITH</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  className="glass-dark border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5"
                  onClick={handleGoogleLogin}
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 mr-2" />
                  Google
                </Button>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-foreground/70">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-thinkforge-purple hover:text-thinkforge-purple/90">
                    Sign up
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Login;
