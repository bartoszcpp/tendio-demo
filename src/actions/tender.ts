'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const EZAMOWIENIA_API = 'https://ezamowienia.gov.pl/mo-board/api/v1/notice';
const NOTICE_PAGE_SIZE = 30;
const LOOKBACK_DAYS = 30;

type EzamowieniaNotice = {
  noticeNumber?: string;
  orderObject?: string;
  cpvCode?: string | null;
  publicationDate?: string | null;
  tenderId?: string | null;
  organizationName?: string | null;
  organizationCity?: string | null;
};

export type SyncResult = { fetched: number; added: number };

const toDateParam = (date: Date) => date.toISOString().slice(0, 10);

const buildTenderUrl = (tenderId?: string | null) =>
  tenderId
    ? `https://ezamowienia.gov.pl/mp-client/search/list/${tenderId}`
    : 'https://ezamowienia.gov.pl';

const fetchNotices = async (): Promise<EzamowieniaNotice[]> => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - LOOKBACK_DAYS);

  const params = new URLSearchParams({
    noticeType: 'ContractNotice',
    pageSize: String(NOTICE_PAGE_SIZE),
    PublicationDateFrom: toDateParam(from),
    PublicationDateTo: toDateParam(to),
  });

  const response = await fetch(`${EZAMOWIENIA_API}?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`e-Zamówienia API error: ${response.status}`);

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const syncTenders = async (): Promise<SyncResult> => {
  const notices = await fetchNotices();

  const unique = Array.from(
    new Map(
      notices
        .filter((notice): notice is EzamowieniaNotice & { noticeNumber: string } =>
          Boolean(notice.noticeNumber),
        )
        .map((notice) => [notice.noticeNumber, notice] as const),
    ).values(),
  );

  if (unique.length === 0) {
    revalidatePath('/');
    return { fetched: 0, added: 0 };
  }

  const existing = await prisma.tender.findMany({
    where: { externalId: { in: unique.map(({ noticeNumber }) => noticeNumber) } },
    select: { externalId: true },
  });
  const existingIds = new Set(existing.map(({ externalId }) => externalId));

  const fresh = unique.filter(({ noticeNumber }) => !existingIds.has(noticeNumber));

  if (fresh.length > 0) {
    await prisma.tender.createMany({
      data: fresh.map((notice) => ({
        externalId: notice.noticeNumber,
        title: notice.orderObject?.trim() || 'Ogłoszenie bez tytułu',
        description:
          [notice.organizationName, notice.organizationCity].filter(Boolean).join(', ') || null,
        cpvCodes: notice.cpvCode ?? '',
        publicationDate: notice.publicationDate ? new Date(notice.publicationDate) : null,
        url: buildTenderUrl(notice.tenderId),
      })),
    });
  }

  revalidatePath('/');
  return { fetched: unique.length, added: fresh.length };
};
