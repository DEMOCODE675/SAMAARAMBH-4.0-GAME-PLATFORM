import { db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Offline and network synchronization queue helper
// Stores answers in localStorage when network drops and retries with exponential resilience
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

// Submits answer using a deterministic document ID to guarantee idempotency and zero duplicates
export async function submitAnswerRecord(answerRecord) {
  const qId = answerRecord.questionId || 'unknown_q';
  const pin = answerRecord.pin || answerRecord.playerPin || 'anonymous';
  const docId = `${qId}_${pin}`;
  const answerRef = doc(db, 'events', 'samarambh', 'answers', docId);

  try {
    await setDoc(answerRef, {
      ...answerRecord,
      timestamp: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Direct answer submission deferred, storing in offline buffer:", err.message);
    saveToOfflineQueue(answerRecord);
    return false;
  }
}

// Background sync worker that flushes queued items once connection returns
export async function flushOfflineQueue(customSubmitFn) {
  const queue = getOfflineQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      if (typeof customSubmitFn === 'function') {
        await customSubmitFn(item);
      } else {
        const qId = item.questionId || 'unknown_q';
        const pin = item.pin || item.playerPin || 'anonymous';
        const docId = `${qId}_${pin}`;
        const answerRef = doc(db, 'events', 'samarambh', 'answers', docId);

        await setDoc(answerRef, {
          ...item,
          timestamp: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Failed to sync queued answer, retaining in retry buffer:", err);
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
  } catch (err) {
    console.warn("Failed to update queue storage:", err);
  }
}
