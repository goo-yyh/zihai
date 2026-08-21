export function selectRandomRecommendations<T>(
  pool: readonly T[],
  count: number,
  random: () => number = Math.random,
) {
  const candidates = [...pool];
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swap]] = [
      candidates[swap],
      candidates[index],
    ];
  }
  return candidates.slice(0, count);
}
