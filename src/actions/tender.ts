'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { fetchNotices, ingestNotices, type IngestResult } from '@/lib/ingest';

export type SyncResult = IngestResult;

export const syncTenders = async (): Promise<SyncResult> => {
  const username = await getCurrentUser();
  if (!username) throw new Error('Musisz być zalogowany.');

  const result = await ingestNotices(await fetchNotices(1));

  revalidatePath('/');
  return result;
};
