import { db, type Category, type Kind } from '../db';

export interface BrowseItem {
  id: string;
  name: string;
  icon?: string;
  categoryId: string;
  ext?: string;
}

const matches = (name: string, needle: string) => !needle || name.toLowerCase().includes(needle);

/**
 * Reads one page straight out of IndexedDB.
 *
 * The catalogue can hold tens of thousands of rows, so nothing here is allowed to
 * materialise the whole table: queries are index-backed where a category is chosen,
 * and always bounded by `limit`.
 */
export async function loadBrowsePage(
  kind: Kind,
  category: string | null,
  query: string,
  limit: number
): Promise<BrowseItem[]> {
  const needle = query.trim().toLowerCase();

  if (kind === 'live') {
    const rows = await (category ? db.live.where('categoryId').equals(category) : db.live.orderBy('name'))
      .filter((row) => matches(row.name, needle))
      .limit(limit)
      .toArray();
    return rows.map((row) => ({ id: row.id, name: row.name, icon: row.icon, categoryId: row.categoryId }));
  }

  if (kind === 'movie') {
    const rows = await (category ? db.movies.where('categoryId').equals(category) : db.movies.orderBy('name'))
      .filter((row) => matches(row.name, needle))
      .limit(limit)
      .toArray();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      categoryId: row.categoryId,
      ext: row.ext,
    }));
  }

  const rows = await (category ? db.series.where('categoryId').equals(category) : db.series.orderBy('name'))
    .filter((row) => matches(row.name, needle))
    .limit(limit)
    .toArray();
  return rows.map((row) => ({ id: row.id, name: row.name, icon: row.icon, categoryId: row.categoryId }));
}

export async function loadCategories(kind: Kind): Promise<Category[]> {
  const rows = await db.categories.where('kind').equals(kind).toArray();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
