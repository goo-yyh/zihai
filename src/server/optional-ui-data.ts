import "server-only";

export type OptionalUiDataResult<T> = { ok: true; data: T } | { ok: false };

export async function loadOptionalUiData<T>(
  section: string,
  load: () => Promise<T>,
): Promise<OptionalUiDataResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    console.error(`Unable to load optional UI section: ${section}`, error);
    return { ok: false };
  }
}
