export const LYNX_EXPLORER_REF = 'https://github.com/lynx-family/lynx/tree/develop/explorer';
export const LYNX_RAW_BASE = 'https://raw.githubusercontent.com/lynx-family/lynx/develop/explorer';

export async function fetchExplorerFile(relativePath: string): Promise<string> {
  const url = `${LYNX_RAW_BASE}/${relativePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}
