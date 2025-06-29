export function extractUserId(input: string | null): string | null {
  if (!input) return null;
  const match = input.match(/^<@!?(\d+)>$/);
  return match ? match[1] : input.trim();
}
