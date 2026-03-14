import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const { user, loading, isPasswordRecovery, signIn, signUp, sendPasswordReset, updatePassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Clock className="h-8 w-8 animate-spin text-primary" /></div>;
  if (user && !isPasswordRecovery) return <Navigate to="/dashboard" replace />;

  const activeMode = isPasswordRecovery ? 'reset' : mode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (activeMode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else if (activeMode === 'signup') {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setSuccessMessage(`Check your email — we sent a confirmation link to ${email}`);
    } else if (activeMode === 'forgot') {
      const { error } = await sendPasswordReset(email);
      if (error) setError(error.message);
      else setSuccessMessage(`Check your email — we sent a password reset link to ${email}`);
    } else if (activeMode === 'reset') {
      const { error } = await updatePassword(password);
      if (error) setError(error.message);
      else setSuccessMessage('Password updated! Redirecting...');
    }
    setSubmitting(false);
  };

  const titles: Record<Mode, string> = {
    login: 'Sign In',
    signup: 'Create Account',
    forgot: 'Reset Password',
    reset: 'Set New Password',
  };

  const descriptions: Record<Mode, string> = {
    login: 'Enter your credentials to continue',
    signup: 'Start tracking your time today',
    forgot: 'Enter your email and we\'ll send a reset link',
    reset: 'Choose a new password for your account',
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-slide-in">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Clock className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Billable</h1>
          </div>
          <p className="text-sm text-muted-foreground">Track time, bill clients, get paid</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{titles[activeMode]}</CardTitle>
            <CardDescription>{descriptions[activeMode]}</CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage ? (
              <div className="rounded-lg bg-accent p-4 text-center">
                <p className="text-sm text-accent-foreground">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                {activeMode !== 'reset' && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                  </div>
                )}
                {activeMode !== 'forgot' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">{activeMode === 'reset' ? 'New Password' : 'Password'}</Label>
                    <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
                  </div>
                )}
                {activeMode === 'login' && (
                  <div className="text-right">
                    <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => { setMode('forgot'); setError(''); }}>
                      Forgot password?
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Loading...' : activeMode === 'login' ? 'Sign In' : activeMode === 'signup' ? 'Create Account' : activeMode === 'forgot' ? 'Send Reset Link' : 'Update Password'}
                </Button>
              </form>
            )}
            {!isPasswordRecovery && (
              <div className="mt-4 text-center space-y-2">
                {activeMode === 'login' && (
                  <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                    onClick={() => { setMode('signup'); setError(''); setSuccessMessage(''); }}>
                    Don't have an account? Sign up
                  </button>
                )}
                {(activeMode === 'signup' || activeMode === 'forgot') && (
                  <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                    onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); }}>
                    Back to sign in
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
