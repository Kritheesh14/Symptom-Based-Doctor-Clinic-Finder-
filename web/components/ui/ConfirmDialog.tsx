'use client';
import { useEffect, useRef } from 'react';
import { Button } from './form';

type Props = { open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void };

export function ConfirmDialog({ open, title, message, confirmLabel, danger, loading, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
        <h2 id="dlg-title" className="text-xl">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>Keep it</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
