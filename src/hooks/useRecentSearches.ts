// Hook to store and retrieve last 3 searches in localStorage

export interface RecentSearch {
  from: string;
  to: string;
  fromFull: string;
  toFull: string;
  distance?: number;
  timestamp: number;
}

const KEY = "easyoutstation_recent_searches";
const MAX = 3;

export function saveRecentSearch(search: Omit<RecentSearch, "timestamp">) {
  try {
    const existing = getRecentSearches();
    // Remove duplicate same route
    const filtered = existing.filter(
      (s) => !(s.from === search.from && s.to === search.to)
    );
    const updated = [{ ...search, timestamp: Date.now() }, ...filtered].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
