import { useState, type ReactNode } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { authClient, useSession } from '~/lib/auth-client';
import { LogoMark, SubmitButton } from './cardy-ui';
import { errorMessage } from './cardy-utils';

type Stage = 'form' | 'otp' | 'verify';

export function AuthDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='gap-5 sm:max-w-sm'>
        {/* Mounting per open resets the stage, errors and secrets. */}
        {open && <AuthForm onDone={() => onOpenChange(false)} onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  );
}

function AuthForm({
  onDone,
  onSuccess,
}: {
  onDone: () => void;
  onSuccess: () => Promise<void>;
}) {
  const session = useSession();
  const signedIn = Boolean(session.data);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [stage, setStage] = useState<Stage>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(session.data?.user.email ?? '');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function attempt(task: () => Promise<void>, fallback: string) {
    setPending(true);
    setError('');
    try {
      await task();
    } catch (cause) {
      setError(errorMessage(cause, fallback));
    } finally {
      setPending(false);
    }
  }
  const sendCode = (verify = false) =>
    attempt(async () => {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: verify ? 'email-verification' : 'sign-in',
      });
      if (result.error) throw new Error(result.error.message ?? 'Could not send a code.');
      setStage(verify ? 'verify' : 'otp');
      toast.success(`Code sent to ${email}`);
    }, 'Could not send a code.');
  const submit = () =>
    attempt(async () => {
      const result =
        stage === 'verify'
          ? await authClient.emailOtp.verifyEmail({ email, otp })
          : stage === 'otp'
            ? await authClient.signIn.emailOtp({ email, otp })
            : mode === 'signup'
              ? await authClient.signUp.email({ email, password, name })
              : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message ?? 'Could not sign in. Try again.');
      await session.refetch();
      await onSuccess();
      onDone();
    }, 'Something went wrong.');

  const title =
    stage !== 'form'
      ? 'Check your email'
      : signedIn
        ? 'Verify your email'
        : mode === 'signup'
          ? 'Create your account'
          : 'Sign in to Cardy';
  const description =
    stage !== 'form'
      ? `Enter the 6-digit code sent to ${email}.`
      : signedIn
        ? 'Required to accept workspace invitations.'
        : mode === 'signup'
          ? 'Free. Takes under a minute.'
          : 'Welcome back.';

  return (
    <>
      <DialogHeader className='items-start gap-3'>
        <LogoMark className='size-8' />
        <div className='flex flex-col gap-1'>
          <DialogTitle className='text-lg font-semibold tracking-tight'>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
      </DialogHeader>

      {stage === 'form' && signedIn ? (
        session.data?.user.emailVerified ? (
          <p className='text-sm text-muted-foreground'>{email} is already verified.</p>
        ) : (
          <SubmitButton isPending={pending} icon={<Mail />} onClick={() => void sendCode(true)}>
            Send code to {email}
          </SubmitButton>
        )
      ) : (
        <form
          className='flex flex-col gap-3'
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {stage !== 'form' ? (
            <Field id='auth-otp' label='Code'>
              <Input
                id='auth-otp'
                autoFocus
                inputMode='numeric'
                autoComplete='one-time-code'
                required
                minLength={6}
                maxLength={6}
                pattern='[0-9]{6}'
                placeholder='000000'
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                className='h-11 text-center font-mono text-lg tracking-[0.5em] md:text-lg'
              />
            </Field>
          ) : (
            <>
              {mode === 'signup' && (
                <Field id='auth-name' label='Name'>
                  <Input
                    id='auth-name'
                    autoFocus
                    required
                    maxLength={100}
                    autoComplete='name'
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
              )}
              <Field id='auth-email' label='Email'>
                <Input
                  id='auth-email'
                  type='email'
                  required
                  autoComplete='email'
                  placeholder='you@company.com'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field
                id='auth-password'
                label='Password'
                aside={
                  mode === 'signin' && (
                    <a href='/forgot-password' className='text-xs text-muted-foreground hover:text-foreground'>
                      Forgot?
                    </a>
                  )
                }
              >
                <Input
                  id='auth-password'
                  type='password'
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
            </>
          )}
          {error && (
            <p role='alert' className='text-[13px] text-destructive'>
              {error}
            </p>
          )}
          <SubmitButton type='submit' isPending={pending} className='mt-1'>
            {stage === 'verify'
              ? 'Verify email'
              : stage === 'otp' || mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </SubmitButton>
          {stage === 'form' ? (
            <Button
              type='button'
              variant='outline'
              disabled={pending || !email.includes('@')}
              onClick={() => void sendCode()}
            >
              <Mail />
              Email me a sign-in code
            </Button>
          ) : (
            <Button type='button' variant='ghost' disabled={pending} onClick={() => setStage('form')}>
              Back
            </Button>
          )}
        </form>
      )}

      {stage === 'form' && !signedIn && (
        <p className='text-center text-[13px] text-muted-foreground'>
          {mode === 'signup' ? 'Have an account?' : 'New to Cardy?'}{' '}
          <button
            type='button'
            className='font-medium text-primary hover:underline'
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError('');
            }}
          >
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      )}
    </>
  );
}

function Field({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <Label htmlFor={id} className='text-[13px]'>
          {label}
        </Label>
        {aside}
      </div>
      {children}
    </div>
  );
}
