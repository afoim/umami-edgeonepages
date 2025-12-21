import { DATA_TYPE } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { flattenJSON, getStringValue } from '@/lib/data';
import { PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { DynamicData } from '@/lib/types';

export interface SaveSessionDataArgs {
  websiteId: string;
  sessionId: string;
  sessionData: DynamicData;
  distinctId?: string;
  createdAt?: Date;
}

export async function saveSessionData(data: SaveSessionDataArgs) {
  return runQuery({
    [PRISMA]: () => relationalQuery(data),
  });
}

export async function relationalQuery({
  websiteId,
  sessionId,
  sessionData,
  distinctId,
  createdAt,
}: SaveSessionDataArgs) {
  const { client } = prisma;

  const jsonKeys = flattenJSON(sessionData);

  const flattenedData = jsonKeys.map(a => ({
    id: uuid(),
    websiteId,
    sessionId,
    dataKey: a.key,
    stringValue: getStringValue(a.value, a.dataType),
    numberValue: a.dataType === DATA_TYPE.number ? a.value : null,
    dateValue: a.dataType === DATA_TYPE.date ? new Date(a.value) : null,
    dataType: a.dataType,
    distinctId,
    createdAt,
  }));

  const existing = await client.sessionData.findMany({
    where: {
      sessionId,
    },
    select: {
      id: true,
      sessionId: true,
      dataKey: true,
    },
  });

  for (const data of flattenedData) {
    const { sessionId, dataKey, ...props } = data;
    const record = existing.find(e => e.sessionId === sessionId && e.dataKey === dataKey);

    if (record) {
      await client.sessionData.update({
        where: {
          id: record.id,
        },
        data: {
          ...props,
        },
      });
    } else {
      await client.sessionData.create({
        data,
      });
    }
  }
}
