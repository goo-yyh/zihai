export async function saveThenSubmitProject(
  saveProject: () => Promise<boolean>,
  submitProject: () => Promise<void>,
) {
  const saved = await saveProject();
  if (!saved) return false;

  await submitProject();
  return true;
}
