import { z } from "zod";

export const DEFAULT_ADMIN_PAGE_SIZE = 25;
export const MAX_ADMIN_PAGE_SIZE = 100;

const pageCursorSchema = z.object({
  version: z.literal(1),
  direction: z.enum(["next", "previous"]),
  sortValue: z.iso.datetime({ offset: true }),
  id: z.string().min(1).max(200),
});

export type PageCursor = z.infer<typeof pageCursorSchema>;
export type CursorIdKind = "text" | "uuid";

export type CursorPage<T> = {
  items: T[];
  previousCursor: string | null;
  nextCursor: string | null;
  hasCursor: boolean;
};

export function encodePageCursor(cursor: PageCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodePageCursor(
  value: string | null | undefined,
  idKind: CursorIdKind = "text",
) {
  if (!value || value.length > 1024) return null;

  try {
    const cursor = pageCursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    if (idKind === "uuid" && !z.uuid().safeParse(cursor.id).success) {
      return null;
    }
    return cursor;
  } catch {
    return null;
  }
}

export function normalizePageSize(value = DEFAULT_ADMIN_PAGE_SIZE) {
  return Math.min(Math.max(Math.trunc(value), 1), MAX_ADMIN_PAGE_SIZE);
}

export function createCursorPage<T extends { id: string }>(
  rows: T[],
  pageSize: number,
  cursor: PageCursor | null,
  sortValue: (item: T) => Date | string,
): CursorPage<T> {
  const normalizedPageSize = normalizePageSize(pageSize);
  const hasMoreInQueryDirection = rows.length > normalizedPageSize;
  const visibleRows = rows.slice(0, normalizedPageSize);
  const items =
    cursor?.direction === "previous" ? visibleRows.reverse() : visibleRows;

  const hasPrevious =
    cursor?.direction === "previous"
      ? hasMoreInQueryDirection
      : Boolean(cursor);
  const hasNext =
    cursor?.direction === "previous"
      ? Boolean(cursor)
      : hasMoreInQueryDirection;
  const first = items[0];
  const last = items.at(-1);
  const serializeSortValue = (item: T) => {
    const value = sortValue(item);
    return value instanceof Date ? value.toISOString() : value;
  };

  return {
    items,
    previousCursor:
      hasPrevious && first
        ? encodePageCursor({
            version: 1,
            direction: "previous",
            sortValue: serializeSortValue(first),
            id: first.id,
          })
        : null,
    nextCursor:
      hasNext && last
        ? encodePageCursor({
            version: 1,
            direction: "next",
            sortValue: serializeSortValue(last),
            id: last.id,
          })
        : null,
    hasCursor: Boolean(cursor),
  };
}
