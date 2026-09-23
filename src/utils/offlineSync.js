// Offline and network synchronization queue helper
// Stores answers in IndexedDB/localStorage when network drops and retries with exponential backoff

const QUEUE_STORAGE_KEY = 'techarena_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Failed to read offline queue:", err);
    return [];
  }
}

export function saveToOfflineQueue(item) {
  try {
    const current = getOfflineQueue();
    // Prevent duplicate entries for the exact same player pin and question id
    const deduped = current.filter(q => !(q.pin === item.pin && q.questionId === item.questionId));
    deduped.push({
      ...item,
      queuedAt: Date.now()
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(deduped));
  } catch (err) {
    console.warn("Failed to store item in offline queue:", err);
  }
}

export function removeFromOfflineQueue(indexOrPredicate) {
  try {
    const current = getOfflineQueue();
    const updated = typeof indexOrPredicate === 'function' 
      ? current.filter((item, idx) => !indexOrPredicate(item, idx))
      : current.filter((_, idx) => idx !== indexOrPredicate);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to remove item from offline queue:", err);
  }
}

// Background sync worker that flushes queued items once connection returns
export async function flushOfflineQueue(submitFn) {
  const queue = getOfflineQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await submitFn(item);
    } catch (err) {
      console.warn("Failed to sync queued answer, keeping in retry buffer:", err);
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  } catch (err) {
    console.warn("Failed to update queue storage:", err);
  }
}
