import { DEFAULT_RESET_DATE } from '@/lib/constants';
import { PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

export async function getWebsiteDateRange(...args: [websiteId: string]) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
  });
}

async function relationalQuery(websiteId: string) {
  const { rawQuery, parseFilters } = prisma;
  const { queryParams } = parseFilters({
    startDate: new Date(DEFAULT_RESET_DATE),
    websiteId,
  });

  const result = await rawQuery(
    `
    select
      min(created_at) as "startDate",
      max(created_at) as "endDate"
    from website_event
    where website_id = {{websiteId::uuid}}
      and created_at >= {{startDate}}
    `,
    queryParams,
  );

  return result[0] ?? null;
}
