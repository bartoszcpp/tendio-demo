'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { fetchNotices, ingestNotices } from '@/lib/ingest';
import { fetchTedNotices, ingestTedNotices } from '@/lib/ted';
import { type PersistResult } from '@/lib/tenders';

export type SyncResult = PersistResult;

export const syncTenders = async (): Promise<SyncResult> => {
  const username = await getCurrentUser();
  if (!username) throw new Error('Musisz być zalogowany.');

  const result = await ingestNotices(await fetchNotices(1));

  revalidatePath('/');
  return result;
};

export const syncTed = async (): Promise<SyncResult> => {
  const username = await getCurrentUser();
  if (!username) throw new Error('Musisz być zalogowany.');

  const { notices = [] } = await fetchTedNotices(1);
  const result = await ingestTedNotices(notices);

  revalidatePath('/');
  return result;
};
