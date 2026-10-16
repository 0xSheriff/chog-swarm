/**
 * packages/physics/src/layout-loader.ts
 *
 * Loads /docs/pinball/table-layout.json at runtime without hardcoded dimensions.
 */

import { TableLayout } from './types';
import staticLayout from '@/docs/pinball/table-layout.json';

let cachedLayout: TableLayout = staticLayout as TableLayout;

export async function loadTableLayout(): Promise<TableLayout> {
  // If in browser, attempt fetching the latest dynamic version from /docs/pinball/table-layout.json
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/docs/pinball/table-layout.json');
      if (res.ok) {
        cachedLayout = (await res.json()) as TableLayout;
      }
    } catch {
      // Fallback to static layout
    }
  }

  return cachedLayout;
}
