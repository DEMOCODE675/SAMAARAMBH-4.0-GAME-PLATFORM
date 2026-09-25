import { useEffect, useMemo, useRef } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  limit,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { replayStrokeDocs } from '../utils/skribblEngine';

// Live stroke feed for Skribbl viewers (mobile guessers + projector).
// Single listener on an append-only collection, single-field where + orderBy +
// limit — no composite indexes required (auto single-field indexes cover this).
// The initial snapshot emission replays every existing batch so late joiners get
// the full canvas, then deltas stream in real time.
export default function useSkribblStrokes(roundId) {
  const segmentsRef = useRef([]);
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);

  // Reset when the round changes.
  useEffect(() => {
    segmentsRef.current = [];
    dirtyRef.current = true;
    versionRef.current += 1;
  }, [roundId]);

  useEffect(() => {
    if (!roundId) return undefined;

    // No orderBy: equality on roundId alone hits an automatic single-field
    // index, keeping the project free of composite indexes. Ordering is
    // restored client-side in replayStrokeDocs via the `seq` counter.
    const strokesRef = collection(db, 'events', 'samarambh', 'skribblStrokes');
    const q = query(
      strokesRef,
      where('roundId', '==', roundId),
      limit(2000)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const docs = [];
        snap.forEach((docSnap) => {
          docs.push({ id: docSnap.id, ...docSnap.data() });
        });
        segmentsRef.current = replayStrokeDocs(docs);
        dirtyRef.current = true;
        versionRef.current += 1;
      },
      (err) => {
        console.warn('Skribbl strokes listener error:', err.message);
      }
    );

    return () => unsubscribe();
  }, [roundId]);

  // Canvas redraw loop — batches dirty flags into one replay + draw per frame.
  const frame = useMemo(
    () => ({
      getSegments: () => segmentsRef.current,
      isDirty: () => dirtyRef.current,
      clearDirty: () => {
        dirtyRef.current = false;
      },
      getVersion: () => versionRef.current
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return frame;
}
