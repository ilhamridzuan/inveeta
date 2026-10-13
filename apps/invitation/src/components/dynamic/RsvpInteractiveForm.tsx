'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PersonalizedGuestContextDTO, RsvpStatus } from '@inveeta/shared';
import { getGuestContext, submitRsvp } from '@/lib/api-client';
import { CheckCircle2, XCircle, AlertCircle, Send, Lock } from 'lucide-react';

interface RsvpInteractiveFormProps {
  readonly slug: string;
  readonly token: string;
  readonly eventId: string;
  readonly initialContext?: PersonalizedGuestContextDTO | null;
}

interface SessionFormState {
  status: RsvpStatus;
  actualPax: number;
}

/**
 * RsvpInteractiveForm (TDD §4.3.E, §7.4 & AGENTS.md Jebakan 1).
 * Mengizinkan tamu memilih kehadiran untuk seluruh sesi yang dialokasikan,
 * memvalidasi batas kuota actualPax <= maxPax, mengunci form jika isRsvpLocked,
 * dan mengirim mutasi atomik batch ke server dengan efek canvas-confetti.
 */
export function RsvpInteractiveForm({
  slug,
  token,
  eventId,
  initialContext,
}: Readonly<RsvpInteractiveFormProps>) {
  const [context, setContext] = useState<PersonalizedGuestContextDTO | null>(
    initialContext || null
  );
  const [loading, setLoading] = useState(!initialContext);
  const [sessionsState, setSessionsState] = useState<
    Record<string, SessionFormState>
  >({});
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (initialContext) return;
      setLoading(true);
      try {
        const data = await getGuestContext(slug, token);
        if (isMounted && data) {
          setContext(data);
        }
      } catch {
        // Abaikan error jaringan
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [slug, token, initialContext]);

  // Inisialisasi state sesi dari context
  useEffect(() => {
    if (!context) return;

    const initialMap: Record<string, SessionFormState> = {};
    for (const session of context.allocatedSessions) {
      if (session.currentRsvp) {
        initialMap[session.sessionId] = {
          status: session.currentRsvp.status,
          actualPax: session.currentRsvp.actualPax,
        };
      } else {
        initialMap[session.sessionId] = {
          status: 'attending',
          actualPax: Math.min(1, context.guest.maxPax),
        };
      }
    }
    setSessionsState(initialMap);
  }, [context]);

  const handleStatusChange = (sessionId: string, status: RsvpStatus) => {
    if (!context) return;
    setSessionsState((prev) => ({
      ...prev,
      [sessionId]: {
        status,
        actualPax:
          status === 'attending'
            ? Math.max(1, prev[sessionId]?.actualPax || 1)
            : 0,
      },
    }));
  };

  const handlePaxChange = (sessionId: string, pax: number) => {
    if (!context) return;
    const clampedPax = Math.min(Math.max(1, pax), context.guest.maxPax);
    setSessionsState((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        actualPax: clampedPax,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSubmitSuccess(false);

    try {
      const payloadSessions = context.allocatedSessions.map((session) => {
        const current = sessionsState[session.sessionId] || {
          status: 'attending',
          actualPax: 1,
        };
        return {
          eventSessionId: session.sessionId,
          status: current.status as 'attending' | 'declined',
          actualPax: current.status === 'attending' ? current.actualPax : 0,
        };
      });

      const res = await submitRsvp({
        eventId,
        guestId: context.guest.id,
        sessions: payloadSessions,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Gagal menyimpan konfirmasi.');
        return;
      }

      setSubmitSuccess(true);

      // Trigger animasi canvas-confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      setErrorMessage('Terjadi kendala saat mengirimkan RSVP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto my-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded mx-auto" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="max-w-xl mx-auto my-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl text-center space-y-2 text-sm text-gray-600">
        <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
        <p className="font-medium text-gray-800">
          Formulir Kehadiran Personal
        </p>
        <p className="font-light">
          Untuk mengonfirmasi kehadiran, pastikan Anda membuka tautan undangan
          khusus yang dikirimkan kepada Anda.
        </p>
      </div>
    );
  }

  const { guest, allocatedSessions, isRsvpLocked, lockReason } = context;

  return (
    <section className="py-16 px-6 max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Konfirmasi Kehadiran
        </h2>
        <p className="text-3xl font-serif text-gray-900 tracking-tight">
          Reservasi Tempat (RSVP)
        </p>
        <p className="text-xs text-gray-500">
          Maksimal alokasi kehadiran untuk Anda:{' '}
          <span className="font-semibold text-gray-800">
            {guest.maxPax} Orang
          </span>
        </p>
      </div>

      {isRsvpLocked && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Batas waktu konfirmasi telah berakhir atau dikunci oleh penyelenggara
            ({lockReason === 'DEADLINE_PASSED' ? 'Waktu Habis' : 'Host Lock'}).
          </span>
        </div>
      )}

      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            Terima kasih! Konfirmasi kehadiran Anda telah berhasil diperbarui.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {allocatedSessions.map((session) => {
            const current = sessionsState[session.sessionId] || {
              status: 'attending',
              actualPax: 1,
            };
            const isManualLocked = Boolean(session.currentRsvp?.isManualOverride);
            const isDisabled = isRsvpLocked || isManualLocked;

            return (
              <div
                key={session.sessionId}
                className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div>
                  <h3 className="font-medium text-gray-900 text-sm">
                    {session.sessionTitle}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {session.locationName}
                  </p>
                </div>

                {/* Status Selection: Hadir / Tidak Hadir */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() =>
                      handleStatusChange(session.sessionId, 'attending')
                    }
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
                      current.status === 'attending'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                        : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                    } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hadir</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() =>
                      handleStatusChange(session.sessionId, 'declined')
                    }
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium border transition-colors ${
                      current.status === 'declined'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold'
                        : 'bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-100/60'
                    } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tidak Hadir</span>
                  </button>
                </div>

                {/* Actual Pax Selector (Only if Hadir) */}
                {current.status === 'attending' && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      Jumlah Kehadiran (Pax):
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Pilih jumlah kehadiran pax"
                        disabled={isDisabled}
                        value={current.actualPax}
                        onChange={(e) =>
                          handlePaxChange(
                            session.sessionId,
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="rounded-lg border border-gray-300 py-1 px-2.5 bg-white text-xs text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-60"
                      >
                        {Array.from(
                          { length: guest.maxPax },
                          (_, i) => i + 1
                        ).map((num) => (
                          <option key={num} value={num}>
                            {num} Orang
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes Input */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="rsvp-notes"
            className="block text-xs font-medium text-gray-700"
          >
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            id="rsvp-notes"
            disabled={isRsvpLocked}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tuliskan ucapan atau catatan untuk mempelai..."
            className="w-full text-xs rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={isRsvpLocked || isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span>Menyimpan...</span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Simpan Konfirmasi Kehadiran</span>
            </>
          )}
        </button>
      </form>
    </section>
  );
}
