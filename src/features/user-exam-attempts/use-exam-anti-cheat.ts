'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ExamAntiCheatOptions = {
  enabled: boolean;
  onClipboardBlocked?: () => void;
  onScreenshotAttempt?: () => void;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || target.isContentEditable;
}

function clearClipboardBestEffort() {
  window.setTimeout(() => {
    void navigator.clipboard?.writeText?.('').catch(() => undefined);
  }, 0);
}

/**
 * Soft anti-cheat / screenshot deterrence for in-browser exams.
 * OS screenshots cannot be fully blocked; this maximizes chance content is blank when captured.
 */
export function useExamAntiCheat({
  enabled,
  onClipboardBlocked,
  onScreenshotAttempt,
}: ExamAntiCheatOptions) {
  const [privacyShield, setPrivacyShield] = useState(false);
  const holdUntilRef = useRef(0);
  const releaseTimerRef = useRef<number | null>(null);
  const warnScreenshotRef = useRef(onScreenshotAttempt);
  const warnClipboardRef = useRef(onClipboardBlocked);

  useEffect(() => {
    warnScreenshotRef.current = onScreenshotAttempt;
    warnClipboardRef.current = onClipboardBlocked;
  }, [onClipboardBlocked, onScreenshotAttempt]);

  const raiseShield = useCallback((opts?: { warn?: boolean; holdMs?: number }) => {
    const holdMs = opts?.holdMs ?? 1600;
    const until = Date.now() + holdMs;
    holdUntilRef.current = Math.max(holdUntilRef.current, until);
    setPrivacyShield(true);
    if (opts?.warn) {
      warnScreenshotRef.current?.();
    }
    clearClipboardBestEffort();

    if (releaseTimerRef.current != null) {
      window.clearTimeout(releaseTimerRef.current);
    }
    const delay = Math.max(0, holdUntilRef.current - Date.now());
    releaseTimerRef.current = window.setTimeout(() => {
      if (Date.now() >= holdUntilRef.current && !document.hidden && document.hasFocus()) {
        setPrivacyShield(false);
      }
      releaseTimerRef.current = null;
    }, delay);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPrivacyShield(false);
      holdUntilRef.current = 0;
      if (releaseTimerRef.current != null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      return;
    }

    const blockClipboard = (event: Event) => {
      event.preventDefault();
      warnClipboardRef.current?.();
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const code = event.code;
      const mod = event.ctrlKey || event.metaKey;
      const typing = isTypingTarget(event.target);

      // Pre-emptive: macOS often swallows Digit3/4/5 — shield as soon as Cmd+Shift held
      if (event.metaKey && event.shiftKey && !event.altKey) {
        raiseShield({ warn: false, holdMs: 2200 });
      }

      const isScreenshotCombo =
        code === 'PrintScreen' ||
        key === 'printscreen' ||
        (event.metaKey &&
          event.shiftKey &&
          (code === 'Digit3' ||
            code === 'Digit4' ||
            code === 'Digit5' ||
            key === '3' ||
            key === '4' ||
            key === '5')) ||
        // Win+Shift+S
        (event.shiftKey &&
          (code === 'KeyS' || key === 's') &&
          (event.getModifierState?.('OS') || event.getModifierState?.('Meta')));

      if (isScreenshotCombo) {
        event.preventDefault();
        event.stopPropagation();
        raiseShield({ warn: true, holdMs: 2500 });
        return;
      }

      if (mod && key === 'a' && typing) {
        return;
      }

      if (mod && ['c', 'x', 'v', 'a', 'p', 's', 'u'].includes(key)) {
        event.preventDefault();
        warnClipboardRef.current?.();
        return;
      }

      if (event.key === 'F12' || (mod && event.shiftKey && ['i', 'j', 'c'].includes(key))) {
        event.preventDefault();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta' || event.key === 'Shift' || event.key === 'Control') {
        if (Date.now() < holdUntilRef.current + 400) {
          raiseShield({ warn: false, holdMs: 1400 });
        }
      }
    };

    // blur / visibilitychange: không che chống-chụp — đã khóa bài khi rời cửa sổ/app
    const onFocus = () => {
      if (Date.now() >= holdUntilRef.current && !document.hidden) {
        setPrivacyShield(false);
      }
    };

    // Inject print-hide style once
    const styleId = 'igeo-exam-anti-print';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @media print {
          body * { visibility: hidden !important; }
          body::after {
            content: 'Exam content cannot be printed.';
            visibility: visible !important;
            position: fixed;
            inset: 0;
            display: grid;
            place-items: center;
            font-size: 18px;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }

    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);
    document.addEventListener('paste', blockClipboard, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('copy', blockClipboard, true);
      document.removeEventListener('cut', blockClipboard, true);
      document.removeEventListener('paste', blockClipboard, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('focus', onFocus);
      if (releaseTimerRef.current != null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      document.getElementById(styleId)?.remove();
    };
  }, [enabled, raiseShield]);

  return { privacyShield };
}
