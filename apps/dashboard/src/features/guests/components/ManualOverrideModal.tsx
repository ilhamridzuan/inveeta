import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { useOverrideRsvpMutation } from '../api/useGuests';
import type { ManageGuestItemDTO } from '@inveeta/shared';

interface ManualOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  guest: ManageGuestItemDTO | null;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  open,
  onOpenChange,
  eventId,
  guest,
}) => {
  const overrideMutation = useOverrideRsvpMutation();

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [status, setStatus] = useState<'attending' | 'declined' | 'pending'>('attending');
  const [actualPax, setActualPax] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [lockGuestForm, setLockGuestForm] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when modal opens or guest changes
  useEffect(() => {
    if (open && guest) {
      setErrorMessage(null);
      const defaultSessionId =
        guest.allocatedSessions[0]?.sessionId || '';
      setSelectedSessionId(defaultSessionId);

      // Cari RSVP yang sudah ada untuk sesi pertama
      const existingRsvp = guest.rsvps.find(
        (r) => r.sessionId === defaultSessionId
      );

      if (existingRsvp) {
        setStatus(existingRsvp.status);
        setActualPax(existingRsvp.status === 'declined' ? 0 : existingRsvp.actualPax || 1);
        setNotes(existingRsvp.overrideNotes || existingRsvp.notes || '');
      } else {
        setStatus('attending');
        setActualPax(Math.min(guest.maxPax, 2));
        setNotes('');
      }

      setLockGuestForm(true);
    }
  }, [open, guest]);

  // When changing session, update fields to that session's existing RSVP
  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (!guest) return;

    const existingRsvp = guest.rsvps.find((r) => r.sessionId === sessionId);
    if (existingRsvp) {
      setStatus(existingRsvp.status);
      setActualPax(existingRsvp.status === 'declined' ? 0 : existingRsvp.actualPax || 1);
      setNotes(existingRsvp.overrideNotes || existingRsvp.notes || '');
    } else {
      setStatus('attending');
      setActualPax(Math.min(guest.maxPax, 2));
      setNotes('');
    }
  };

  const handleStatusChange = (newStatus: 'attending' | 'declined' | 'pending') => {
    setStatus(newStatus);
    if (newStatus === 'declined') {
      setActualPax(0);
    } else if (actualPax === 0 && guest) {
      setActualPax(Math.min(guest.maxPax, 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) return;
    setErrorMessage(null);

    if (!selectedSessionId) {
      setErrorMessage('Pilih sesi acara yang ingin di-override');
      return;
    }

    if (status === 'attending' && actualPax > guest.maxPax) {
      setErrorMessage(`Jumlah actual pax (${actualPax}) tidak boleh melebihi kuota max pax (${guest.maxPax})`);
      return;
    }

    try {
      await overrideMutation.mutateAsync({
        eventId,
        guestId: guest.id,
        input: {
          sessionId: selectedSessionId,
          status,
          actualPax: status === 'declined' ? 0 : actualPax,
          notes: notes.trim() || undefined,
          lockGuestForm,
        },
      });

      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menyimpan override kehadiran'
      );
    }
  };

  if (!guest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-serif">
              Manual Override RSVP
            </DialogTitle>
            <Badge variant="warning" className="text-[10px]">
              Host Control
            </Badge>
          </div>
          <DialogDescription>
            Konfirmasi kehadiran untuk <strong className="text-foreground">{guest.name}</strong> secara langsung atas persetujuan Host.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Session Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="override-session">Pilih Sesi Acara</Label>
            {guest.allocatedSessions.length === 0 ? (
              <p className="text-xs text-destructive">
                Tamu ini belum memiliki alokasi sesi acara.
              </p>
            ) : (
              <select
                id="override-session"
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                value={selectedSessionId}
                onChange={(e) => handleSessionChange(e.target.value)}
                disabled={overrideMutation.isPending}
              >
                {guest.allocatedSessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {session.sessionTitle}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status Selection Buttons */}
          <div className="space-y-1.5">
            <Label>Status Kehadiran</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={status === 'attending' ? 'default' : 'outline'}
                className={
                  status === 'attending'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }
                onClick={() => handleStatusChange('attending')}
                disabled={overrideMutation.isPending}
              >
                Hadir
              </Button>
              <Button
                type="button"
                variant={status === 'declined' ? 'destructive' : 'outline'}
                onClick={() => handleStatusChange('declined')}
                disabled={overrideMutation.isPending}
              >
                Tidak Hadir
              </Button>
              <Button
                type="button"
                variant={status === 'pending' ? 'secondary' : 'outline'}
                onClick={() => handleStatusChange('pending')}
                disabled={overrideMutation.isPending}
              >
                Pending
              </Button>
            </div>
          </div>

          {/* Actual Pax */}
          {status === 'attending' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="actual-pax">Jumlah Tamu Hadir (Actual Pax)</Label>
                <span className="text-xs text-muted-foreground">
                  Batas Max: {guest.maxPax} Pax
                </span>
              </div>
              <Input
                id="actual-pax"
                type="number"
                min={1}
                max={guest.maxPax}
                value={actualPax}
                onChange={(e) =>
                  setActualPax(
                    Math.max(1, Math.min(guest.maxPax, Number(e.target.value) || 1))
                  )
                }
                disabled={overrideMutation.isPending}
              />
            </div>
          )}

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="override-notes">
              Catatan Alasan Override <span className="text-muted-foreground text-xs">(Opsional)</span>
            </Label>
            <Input
              id="override-notes"
              placeholder="Contoh: Dikonfirmasi via telepon keluarga"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={overrideMutation.isPending}
              maxLength={300}
            />
          </div>

          {/* Lock Guest Form Checkbox */}
          <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lockGuestForm}
                onChange={(e) => setLockGuestForm(e.target.checked)}
                disabled={overrideMutation.isPending}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <div className="flex flex-col text-xs leading-relaxed">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Kunci Formulir RSVP Tamu
                </span>
                <span className="text-muted-foreground mt-0.5">
                  Tamu tidak dapat lagi mengubah kehadiran secara mandiri melalui tautan undangan mereka.
                </span>
              </div>
            </label>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={overrideMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={overrideMutation.isPending || guest.allocatedSessions.length === 0}
            >
              {overrideMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simpan Override
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
