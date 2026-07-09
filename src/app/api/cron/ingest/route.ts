import { revalidatePath } from 'next/cache';
import { ingestNextPage } from '@/lib/ingest';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const GET = async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 });

  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await ingestNextPage();
  revalidatePath('/');

  return Response.json({ ok: true, ...result });
};
