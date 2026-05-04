/**
 * src/lib/use-form-draft.ts — AD1.0
 *
 * Auto-saves form state to localStorage so a PIN-session expiry mid-edit doesn't
 * lose the user's work. PRD §9.5.1.
 *
 * Usage:
 *   const { hasDraft, draft, restoreDraft, discardDraft, clearDraft } =
 *     useFormDraft<FormType>('task_FT-001', formState);
 *
 *   // On submit success:
 *   clearDraft();
 *
 *   // On render, if hasDraft:
 *   <DraftRestorePrompt savedAt={...} onRestore={() => setForm(restoreDraft())} onDiscard={discardDraft} />
 */

"use client";

import { useEffect, useRef, useState } from "react";

const KEY_PREFIX = "fms_admin_draft_";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const DEBOUNCE_MS = 500;

interface DraftRecord<T> {
  savedAt: string;
  data: T;
}

export interface UseFormDraftReturn<T> {
  hasDraft: boolean;
  draft: T | null;
  draftSavedAt: string | null;
  restoreDraft: () => T | null;
  discardDraft: () => void;
  clearDraft: () => void;
}

export function useFormDraft<T>(
  formId: string,
  currentValue: T
): UseFormDraftReturn<T> {
  const key = KEY_PREFIX + formId;
  const [hasDraft, setHasDraft] = useState(false);
  const [draft, setDraft] = useState<T | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  // On mount, check for existing draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const rec = JSON.parse(raw) as DraftRecord<T>;
      const ageMs = Date.now() - new Date(rec.savedAt).getTime();
      if (ageMs > MAX_AGE_MS) {
        window.localStorage.removeItem(key);
        return;
      }
      setHasDraft(true);
      setDraft(rec.data);
      setDraftSavedAt(rec.savedAt);
    } catch {
      window.localStorage.removeItem(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On every change, debounced-write to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialMount.current) {
      initialMount.current = false;
      return; // don't write on first render
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const rec: DraftRecord<T> = {
          savedAt: new Date().toISOString(),
          data: currentValue,
        };
        window.localStorage.setItem(key, JSON.stringify(rec));
      } catch {
        // localStorage may be full or disabled — silent fail is acceptable
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [key, currentValue]);

  const restoreDraft = (): T | null => {
    setHasDraft(false);
    return draft;
  };
  const discardDraft = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    setHasDraft(false);
    setDraft(null);
    setDraftSavedAt(null);
  };
  const clearDraft = discardDraft;

  return { hasDraft, draft, draftSavedAt, restoreDraft, discardDraft, clearDraft };
}

/**
 * Sweeps localStorage for any expired (>24h old) draft entries. Called from
 * <AdminShell> on mount.
 */
export function purgeExpiredFormDrafts(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const rec = JSON.parse(raw) as DraftRecord<unknown>;
      if (now - new Date(rec.savedAt).getTime() > MAX_AGE_MS) {
        toRemove.push(key);
      }
    } catch {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) window.localStorage.removeItem(key);
}
