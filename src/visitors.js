const BASE_COUNT = 1000;
const API_URL = 'https://countapi.mileshilliard.com/api/v1';
const KEY = 'mayapur_3d_pilgrims_live';
const SESSION_KEY = 'mayapur_darshan_recorded_v1';
const LOCAL_CACHE_KEY = 'mayapur_darshan_last_count';

// Default initial count (1001 when starting fresh)
let cachedCount = Number(localStorage.getItem(LOCAL_CACHE_KEY)) || (BASE_COUNT + 1);

export function getCachedVisitorCount() {
  return cachedCount;
}

/**
 * Fetch latest global count without incrementing
 */
export async function fetchCurrentCount() {
  try {
    const res = await fetch(`${API_URL}/get/${KEY}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.value === 'number') {
        cachedCount = BASE_COUNT + data.value;
        localStorage.setItem(LOCAL_CACHE_KEY, String(cachedCount));
        return cachedCount;
      }
    }
  } catch (err) {
    console.warn('[visitors] Count fetch error:', err);
  }
  return cachedCount;
}

/**
 * Increment the global counter when user actually enters the game / temple.
 * Deduplicated per browser session so refreshing doesn't artificially spam the counter.
 */
export async function recordGameEntry() {
  const alreadyRecorded = sessionStorage.getItem(SESSION_KEY);
  if (alreadyRecorded) {
    return await fetchCurrentCount();
  }

  try {
    const res = await fetch(`${API_URL}/hit/${KEY}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.value === 'number') {
        sessionStorage.setItem(SESSION_KEY, '1');
        cachedCount = BASE_COUNT + data.value;
        localStorage.setItem(LOCAL_CACHE_KEY, String(cachedCount));
        return cachedCount;
      }
    }
  } catch (err) {
    console.warn('[visitors] Record entry error:', err);
  }

  sessionStorage.setItem(SESSION_KEY, '1');
  return cachedCount;
}
