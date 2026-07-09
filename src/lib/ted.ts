import 'server-only';

import { prisma } from '@/lib/prisma';
import { persistTenders, type MappedTender, type PersistResult } from '@/lib/tenders';

const TED_API = 'https://api.ted.europa.eu/v3/notices/search';
export const TED_PAGE_SIZE = 50;
const LOOKBACK_DAYS = 60;
const INGEST_STATE_ID = 'default';
const SOURCE = 'ted';

type Multilingual = Record<string, string | string[] | undefined>;

type TedNotice = {
  'publication-number'?: string;
  'notice-title'?: Multilingual;
  'classification-cpv'?: string[];
  'publication-date'?: string;
  'buyer-name'?: Multilingual;
  'place-of-performance'?: string[];
  links?: { html?: Record<string, string> };
};

type TedResponse = { notices?: TedNotice[]; totalNoticeCount?: number };

export type TedPageResult = PersistResult & { page: number; nextPage: number; total: number };

const NUTS_TO_VOIVODESHIP: Record<string, string> = {
  PL21: 'małopolskie',
  PL22: 'śląskie',
  PL41: 'wielkopolskie',
  PL42: 'zachodniopomorskie',
  PL43: 'lubuskie',
  PL51: 'dolnośląskie',
  PL52: 'opolskie',
  PL61: 'kujawsko-pomorskie',
  PL62: 'warmińsko-mazurskie',
  PL63: 'pomorskie',
  PL71: 'łódzkie',
  PL72: 'świętokrzyskie',
  PL81: 'lubelskie',
  PL82: 'podkarpackie',
  PL84: 'podlaskie',
  PL91: 'mazowieckie',
  PL92: 'mazowieckie',
};

const toDateParam = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '');

const parseTedDate = (value?: string): Date | null => {
  if (!value) return null;
  const normalized = value.replace(/^(\d{4}-\d{2}-\d{2})([+-]\d{2}:\d{2})$/, '$1T00:00:00$2');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pickLang = (field?: Multilingual): string | null => {
  if (!field) return null;
  const value = field.pol ?? field.eng ?? Object.values(field)[0];
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() || null;
};

const extractRegion = (codes?: string[]): string | null => {
  const nuts = codes?.find((code) => /^PL\d{2}/.test(code));
  return nuts ? (NUTS_TO_VOIVODESHIP[nuts.slice(0, 4)] ?? null) : null;
};

const buildQuery = (cpvCodes: string[]): string => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - LOOKBACK_DAYS);
  const dateFilter = `publication-date>=${toDateParam(from)} AND publication-date<=${toDateParam(to)}`;

  if (cpvCodes.length === 0) return `buyer-country=POL AND ${dateFilter}`;

  const cpvFilter = cpvCodes.map((code) => `classification-cpv=${code}`).join(' OR ');
  return `(${cpvFilter}) AND ${dateFilter}`;
};

export const fetchTedNotices = async (page = 1): Promise<TedResponse> => {
  const profile = await prisma.profile.findFirst();
  const cpvCodes = (profile?.cpvCodes.match(/\d{8}/g) ?? []).slice(0, 12);

  const response = await fetch(TED_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      query: buildQuery(cpvCodes),
      fields: [
        'publication-number',
        'notice-title',
        'classification-cpv',
        'publication-date',
        'buyer-name',
        'place-of-performance',
        'links',
      ],
      page,
      limit: TED_PAGE_SIZE,
      scope: 'ACTIVE',
      paginationMode: 'PAGE_NUMBER',
    }),
  });

  if (!response.ok) throw new Error(`TED API error: ${response.status}`);
  return response.json();
};

const mapNotice = (notice: TedNotice & { 'publication-number': string }): MappedTender => {
  const number = notice['publication-number'];
  const cpvCodes = Array.from(new Set(notice['classification-cpv'] ?? [])).join(', ');
  const links = notice.links?.html;

  return {
    externalId: `TED:${number}`,
    title: pickLang(notice['notice-title']) ?? 'Ogłoszenie bez tytułu',
    description: pickLang(notice['buyer-name']),
    cpvCodes,
    region: extractRegion(notice['place-of-performance']),
    publicationDate: parseTedDate(notice['publication-date']),
    url: links?.POL ?? links?.ENG ?? `https://ted.europa.eu/pl/notice/-/detail/${number}`,
    source: SOURCE,
  };
};

export const ingestTedNotices = async (notices: TedNotice[]): Promise<PersistResult> =>
  persistTenders(
    notices
      .filter((notice): notice is TedNotice & { 'publication-number': string } =>
        Boolean(notice['publication-number']),
      )
      .map(mapNotice),
  );

export const ingestTedNextPage = async (): Promise<TedPageResult> => {
  const state = await prisma.ingestState.upsert({
    where: { id: INGEST_STATE_ID },
    create: { id: INGEST_STATE_ID },
    update: {},
  });

  const page = state.tedPage;
  const { notices = [], totalNoticeCount = 0 } = await fetchTedNotices(page);
  const result = await ingestTedNotices(notices);
  const nextPage = notices.length < TED_PAGE_SIZE || page * TED_PAGE_SIZE >= 15000 ? 1 : page + 1;

  await prisma.ingestState.update({
    where: { id: INGEST_STATE_ID },
    data: { tedPage: nextPage },
  });

  return { ...result, page, nextPage, total: totalNoticeCount };
};
