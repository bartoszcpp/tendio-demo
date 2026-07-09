import 'server-only';

import { prisma } from '@/lib/prisma';
import { scoreTender } from '@/lib/scoring';

const EZAMOWIENIA_API = 'https://ezamowienia.gov.pl/mo-board/api/v1/notice';
export const NOTICE_PAGE_SIZE = 100;
const LOOKBACK_DAYS = 60;
const INGEST_STATE_ID = 'default';

type EzamowieniaNotice = {
  noticeNumber?: string;
  orderObject?: string;
  cpvCode?: string | null;
  publicationDate?: string | null;
  tenderId?: string | null;
  organizationName?: string | null;
  organizationCity?: string | null;
  htmlBody?: string | null;
};

export type IngestResult = { fetched: number; added: number };
export type IngestPageResult = IngestResult & { page: number; nextPage: number };

const toDateParam = (date: Date) => date.toISOString().slice(0, 10);

const buildTenderUrl = (tenderId?: string | null) =>
  tenderId
    ? `https://ezamowienia.gov.pl/mp-client/search/list/${tenderId}`
    : 'https://ezamowienia.gov.pl';

const extractRegion = (htmlBody?: string | null) => {
  const match = htmlBody?.match(/Województwo:\s*<span[^>]*>([^<]+)<\/span>/i);
  return match ? match[1].trim() : null;
};

export const fetchNotices = async (pageNumber = 1): Promise<EzamowieniaNotice[]> => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - LOOKBACK_DAYS);

  const params = new URLSearchParams({
    noticeType: 'ContractNotice',
    pageSize: String(NOTICE_PAGE_SIZE),
    pageNumber: String(pageNumber),
    PublicationDateFrom: toDateParam(from),
    PublicationDateTo: toDateParam(to),
  });

  const response = await fetch(`${EZAMOWIENIA_API}?${params}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`e-Zamówienia API error: ${response.status}`);

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const ingestNotices = async (notices: EzamowieniaNotice[]): Promise<IngestResult> => {
  const unique = Array.from(
    new Map(
      notices
        .filter((notice): notice is EzamowieniaNotice & { noticeNumber: string } =>
          Boolean(notice.noticeNumber),
        )
        .map((notice) => [notice.noticeNumber, notice] as const),
    ).values(),
  );

  if (unique.length === 0) return { fetched: 0, added: 0 };

  const existing = await prisma.tender.findMany({
    where: { externalId: { in: unique.map(({ noticeNumber }) => noticeNumber) } },
    select: { externalId: true },
  });
  const existingIds = new Set(existing.map(({ externalId }) => externalId));

  const fresh = unique.filter(({ noticeNumber }) => !existingIds.has(noticeNumber));

  if (fresh.length > 0) {
    const profile = await prisma.profile.findFirst();

    await prisma.tender.createMany({
      data: fresh.map((notice) => {
        const title = notice.orderObject?.trim() || 'Ogłoszenie bez tytułu';
        const description =
          [notice.organizationName, notice.organizationCity].filter(Boolean).join(', ') || null;
        const cpvCodes = notice.cpvCode ?? '';
        const region = extractRegion(notice.htmlBody);
        const score = profile
          ? scoreTender({ title, description, cpvCodes, region }, profile).score
          : 0;

        return {
          externalId: notice.noticeNumber,
          title,
          description,
          cpvCodes,
          region,
          publicationDate: notice.publicationDate ? new Date(notice.publicationDate) : null,
          url: buildTenderUrl(notice.tenderId),
          score,
        };
      }),
    });
  }

  return { fetched: unique.length, added: fresh.length };
};

export const ingestNextPage = async (): Promise<IngestPageResult> => {
  const state = await prisma.ingestState.upsert({
    where: { id: INGEST_STATE_ID },
    create: { id: INGEST_STATE_ID },
    update: {},
  });

  const page = state.page;
  const { fetched, added } = await ingestNotices(await fetchNotices(page));
  const nextPage = fetched < NOTICE_PAGE_SIZE ? 1 : page + 1;

  await prisma.ingestState.update({
    where: { id: INGEST_STATE_ID },
    data: { page: nextPage },
  });

  return { page, nextPage, fetched, added };
};
