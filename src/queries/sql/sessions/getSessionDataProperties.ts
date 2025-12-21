import { PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getSessionDataProperties';

export async function getSessionDataProperties(
  ...args: [websiteId: string, filters: QueryFilters]
) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
  });
}

async function relationalQuery(websiteId: string, filters: QueryFilters) {
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, joinSessionQuery, cohortQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
  });

  return rawQuery(
    `
    select
        data_key as "propertyName",
        count(distinct session_data.session_id) as "total"
    from website_event 
    ${cohortQuery}
    ${joinSessionQuery}
    join session_data 
        on session_data.session_id = website_event.session_id
          and session_data.website_id = website_event.website_id
    where website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
        ${filterQuery}
    group by 1
    order by 2 desc
    limit 500
    `,
    queryParams,
    FUNCTION_NAME,
  );
}
