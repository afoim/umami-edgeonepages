import { notImplemented, PRISMA, runQuery } from '@/lib/db';
import type { QueryFilters } from '@/lib/types';

export function getEventUsage(...args: [websiteIds: string[], filters: QueryFilters]) {
  return runQuery({
    [PRISMA]: notImplemented,
  });
}
