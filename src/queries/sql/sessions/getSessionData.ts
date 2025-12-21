import { PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getSessionData';

export async function getSessionData(...args: [websiteId: string, sessionId: string]) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
  });
}

async function relationalQuery(websiteId: string, sessionId: string) {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    select
        website_id as "websiteId",
        session_id as "sessionId",
        data_key as "dataKey",
        data_type as "dataType",
        replace(string_value, '.0000', '') as "stringValue",
        number_value as "numberValue",
        date_value as "dateValue",
        created_at as "createdAt"
    from session_data
    where website_id = {{websiteId::uuid}}
      and session_id = {{sessionId::uuid}}
    order by data_key asc
    `,
    { websiteId, sessionId },
    FUNCTION_NAME,
  );
}
