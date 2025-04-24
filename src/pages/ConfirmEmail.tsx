import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Get the token and type from URL
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || !type) {
          throw new Error('Missing confirmation token or type');
        }

        // Verify the email
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

        if (error) {
          throw error;
        }

        // Wait a bit before redirecting
        setTimeout(() => {
          navigate('/login?verified=true');
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'An error occurred during email confirmation');
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="glass-card p-8 rounded-xl neon-border max-w-md w-full text-center">
          {isLoading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-thinkforge-purple mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Confirming your email...</h2>
              <p className="text-foreground/70">Please wait while we verify your email address.</p>
            </>
          ) : error ? (
            <>
              <h2 className="text-xl font-semibold mb-2 text-red-500">Confirmation Failed</h2>
              <p className="text-foreground/70 mb-4">{error}</p>
              <p className="text-sm">
                Please try signing up again or contact support if the problem persists.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2 text-green-500">Email Confirmed!</h2>
              <p className="text-foreground/70">
                Your email has been successfully verified. Redirecting you to login...
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ConfirmEmail; 