import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

const LoginPage = async () => {
  if (await getCurrentUser()) redirect('/');

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">Tendio</p>
      <h1 className="mt-1 mb-8 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Zaloguj się do dema
      </h1>
      <LoginForm />
    </main>
  );
};

export default LoginPage;
