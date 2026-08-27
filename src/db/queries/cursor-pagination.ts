import "server-only";

import { and, eq, gt, lt, or, sql, type SQLWrapper } from "drizzle-orm";

import {
  createCursorPage,
  type CursorPage,
  type PageCursor,
} from "@/lib/pagination";

type TimestampCursorRow = {
  id: string;
  cursorSortValue: string;
};

export function exactTimestamp(column: SQLWrapper) {
  return sql<string>`to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

export function timestampCursorCondition(
  sortColumn: SQLWrapper,
  idColumn: SQLWrapper,
  cursor: PageCursor | null,
) {
  if (!cursor) return undefined;

  // PostgreSQL stores microseconds while JavaScript Date only preserves
  // milliseconds. Compare the exact database timestamp string in PostgreSQL
  // so the boundary row cannot reappear or disappear between pages.
  const sortValue = sql`${cursor.sortValue}::timestamptz`;
  if (cursor.direction === "previous") {
    return or(
      gt(sortColumn, sortValue),
      and(eq(sortColumn, sortValue), gt(idColumn, cursor.id)),
    );
  }

  return or(
    lt(sortColumn, sortValue),
    and(eq(sortColumn, sortValue), lt(idColumn, cursor.id)),
  );
}

export function createTimestampCursorPage<T extends TimestampCursorRow>(
  rows: T[],
  pageSize: number,
  cursor: PageCursor | null,
): CursorPage<Omit<T, "cursorSortValue">> {
  const page = createCursorPage(
    rows,
    pageSize,
    cursor,
    (row) => row.cursorSortValue,
  );

  return {
    ...page,
    items: page.items.map(({ cursorSortValue, ...item }) => {
      void cursorSortValue;
      return item;
    }),
  };
}
