export async function saveThenSubmitProject(
  saveProject: () => Promise<boolean>,
  submitProject: () => Promise<void>,
) {
  const saved = await saveProject();
  if (!saved) return false;

  await submitProject();
  return true;
}

export type ProjectQrCodeRefresh = {
  projectId: string;
  expectedUrl: string | null;
} | null;

export function resolveProjectQrCodePresence(
  projectId: string | undefined,
  serverHasQrCode: boolean,
  pendingRefresh: ProjectQrCodeRefresh,
) {
  if (projectId && pendingRefresh?.projectId === projectId) {
    return pendingRefresh.expectedUrl !== null;
  }
  return serverHasQrCode;
}

export function isProjectQrCodeRefreshCommitted(
  projectId: string,
  serverQrCodeUrl: string | null,
  pendingRefresh: ProjectQrCodeRefresh,
) {
  return (
    pendingRefresh?.projectId === projectId &&
    pendingRefresh.expectedUrl === serverQrCodeUrl
  );
}

export function isReviewActionBusy(submitting: boolean, saving: boolean) {
  return submitting || saving;
}
