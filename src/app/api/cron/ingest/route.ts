import { revalidatePath } from 'next/cache';
import { ingestNextPage } from '@/lib/ingest';
import { ingestTedNextPage } from '@/lib/ted';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 });

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [ezamowienia, ted] = await Promise.all([ingestNextPage(), ingestTedNextPage()]);
  revalidatePath('/');

  return Response.json({ ok: true, ezamowienia, ted });
};
