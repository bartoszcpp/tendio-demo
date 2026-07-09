import 'server-only';

import { prisma } from '@/lib/prisma';
import { scoreTender } from '@/lib/scoring';

export type MappedTender = {
  externalId: string;
  title: string;
  description: string | null;
  cpvCodes: string;
  region: string | null;
  publicationDate: Date | null;
  url: string;
  source: string;
};

export type PersistResult = { fetched: number; added: number };

export const persistTenders = async (items: MappedTender[]): Promise<PersistResult> => {
  const unique = Array.from(
    new Map(items.filter((item) => item.externalId).map((item) => [item.externalId, item])).values(),
  );

  if (unique.length === 0) return { fetched: 0, added: 0 };

  const existing = await prisma.tender.findMany({
    where: { externalId: { in: unique.map(({ externalId }) => externalId) } },
    select: { externalId: true },
  });
  const existingIds = new Set(existing.map(({ externalId }) => externalId));

  const fresh = unique.filter(({ externalId }) => !existingIds.has(externalId));

  if (fresh.length > 0) {
    const profile = await prisma.profile.findFirst();

    await prisma.tender.createMany({
      data: fresh.map((item) => ({
        ...item,
        score: profile ? scoreTender(item, profile).score : 0,
      })),
    });
  }

  return { fetched: unique.length, added: fresh.length };
};
