import { db, type Category, type Kind } from '../db';
import type { Table } from 'dexie';

export interface BrowseItem {
  id: string;
  name: string;
  icon?: string;
  categoryId: string;
  ext?: string;
}

/** Scanning more than this to answer one query costs more than it is worth. */
const SCAN_BUDGET = 12000;

interface Scannable {
  id: string;
  name: string;
  categoryId: string;
  icon?: string;
  ext?: string;
}

/**
 * Substring search with a hard ceiling.
 *
 * A full scan of a 161k-row table takes seconds, so the scan gives up after
 * SCAN_BUDGET rows. It uses one sequential cursor pass with `until` rather than
 * offset paging, because `offset` re-walks the index from the start on every chunk.
 */
async function scan<T extends Scannable>(table: Table<T, string>, needle: string, limit: number): Promise<T[]> {
  const wanted = needle.toLowerCase();
  const found: T[] = [];
  let scanned = 0;

  await table
    .orderBy('name')
    .until(() => found.length >= limit || scanned >= SCAN_BUDGET)
    .each((row) => {
      scanned += 1;
      if (row.name.toLowerCase().includes(wanted)) found.push(row);
    });

  return found.slice(0, limit);
}

const asItem = (row: Scannable): BrowseItem => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  categoryId: row.categoryId,
  ext: row.ext,
});

/**
 * Reads one page straight out of IndexedDB. The catalogue can hold tens of
 * thousands of rows, so nothing here materialises a whole table.
 */
export async function loadBrowsePage(
  kind: Kind,
  category: string | null,
  query: string,
  limit: number
): Promise<BrowseItem[]> {
  const needle = query.trim();

  if (kind === 'live') {
    const rows = needle
      ? await scan(db.live, needle, limit)
      : await (category ? db.live.where('categoryId').equals(category) : db.live.orderBy('name')).limit(limit).toArray();
    return rows.map(asItem);
  }

  if (kind === 'movie') {
    const rows = needle
      ? await scan(db.movies, needle, limit)
      : await (category
          ? db.movies.where('categoryId').equals(category)
          : db.movies.orderBy('name')
        )
          .limit(limit)
          .toArray();
    return rows.map(asItem);
  }

  const rows = needle
    ? await scan(db.series, needle, limit)
    : await (category ? db.series.where('categoryId').equals(category) : db.series.orderBy('name')).limit(limit).toArray();
  return rows.map(asItem);
}

export async function loadCategories(kind: Kind): Promise<Category[]> {
  const rows = await db.categories.where('kind').equals(kind).toArray();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
