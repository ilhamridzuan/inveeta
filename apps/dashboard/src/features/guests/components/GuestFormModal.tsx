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
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  useCreateGuestMutation,
  useUpdateGuestMutation,
} from '../api/useGuests';
import type { ManageGuestItemDTO } from '@inveeta/shared';

export interface AvailableSessionOption {
  id: string;
  title: string;
  startTime?: string | Date;
  locationName?: string;
}

interface GuestFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  guestToEdit?: ManageGuestItemDTO | null;
  availableSessions: AvailableSessionOption[];
}

export const GuestFormModal: React.FC<GuestFormModalProps> = ({
  open,
  onOpenChange,
  eventId,
  guestToEdit,
  availableSessions,
}) => {
  const isEditing = Boolean(guestToEdit);
  const createMutation = useCreateGuestMutation();
  const updateMutation = useUpdateGuestMutation();

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState<'VIP' | 'Keluarga' | 'Reguler'>('Reguler');
  const [maxPax, setMaxPax] = useState<number>(2);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync form when modal opens or guestToEdit changes
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      if (guestToEdit) {
        setName(guestToEdit.name);
        setPhoneNumber(guestToEdit.phoneNumber || '');
        const cat = guestToEdit.category;
        if (cat === 'VIP') setCategory('VIP');
        else if (cat === 'Keluarga') setCategory('Keluarga');
        else setCategory('Reguler');

        setMaxPax(guestToEdit.maxPax);
        setSelectedSessionIds(
          guestToEdit.allocatedSessions.map((s) => s.sessionId)
        );
      } else {
        setName('');
        setPhoneNumber('');
        setCategory('Reguler');
        setMaxPax(2);
        // Default to all available sessions for a new guest
        setSelectedSessionIds(availableSessions.map((s) => s.id));
      }
    }
  }, [open, guestToEdit, availableSessions]);

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setErrorMessage('Nama tamu minimal 2 karakter');
      return;
    }

    if (selectedSessionIds.length === 0) {
      setErrorMessage('Pilih minimal satu sesi acara untuk tamu ini');
      return;
    }

    const trimmedPhone = phoneNumber.trim() || undefined;

    try {
      if (isEditing && guestToEdit) {
        await updateMutation.mutateAsync({
          eventId,
          guestId: guestToEdit.id,
          input: {
            name: trimmedName,
            phoneNumber: trimmedPhone,
            category,
            maxPax,
            allocatedSessionIds: selectedSessionIds,
          },
        });
      } else {
        await createMutation.mutateAsync({
          eventId,
          input: {
            name: trimmedName,
            phoneNumber: trimmedPhone,
            category,
            maxPax,
            allocatedSessionIds: selectedSessionIds,
          },
        });
      }

      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data tamu'
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">
            {isEditing ? 'Perbarui Data Tamu' : 'Tambah Tamu Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Ubah informasi tamu, kuota pax, atau alokasi sesi undangan.'
              : 'Daftarkan nama tamu, nomor WhatsApp, kuota pax, dan alokasi sesi acara.'}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Guest Name */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">
              Nama Lengkap Tamu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="guest-name"
              placeholder="Contoh: Bpk. Muhammad Irfan & Partner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          {/* WhatsApp Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="guest-phone">
              Nomor WhatsApp <span className="text-muted-foreground text-xs">(Opsional)</span>
            </Label>
            <Input
              id="guest-phone"
              type="tel"
              placeholder="08123456789 atau +628123456789"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Format Indonesia: 08xxx atau +628xxx (digunakan untuk pengiriman tautan WhatsApp)
            </p>
          </div>

          {/* Category & Pax Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="guest-category">Kategori Tamu</Label>
              <select
                id="guest-category"
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'VIP' | 'Keluarga' | 'Reguler')}
                disabled={isPending}
              >
                <option value="VIP">VIP</option>
                <option value="Keluarga">Keluarga</option>
                <option value="Reguler">Reguler</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guest-max-pax">Kuota Max Pax</Label>
              <Input
                id="guest-max-pax"
                type="number"
                min={1}
                max={20}
                value={maxPax}
                onChange={(e) => setMaxPax(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Allocated Sessions Checkboxes */}
          <div className="space-y-2 pt-1">
            <Label>
              Alokasi Sesi Acara <span className="text-destructive">*</span>
            </Label>
            {availableSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Belum ada sesi acara yang terdaftar di acara ini.
              </p>
            ) : (
              <div className="space-y-2 rounded-xl border border-border/80 bg-secondary/30 p-3">
                {availableSessions.map((session) => {
                  const isChecked = selectedSessionIds.includes(session.id);
                  return (
                    <label
                      key={session.id}
                      className="flex items-center gap-3 cursor-pointer rounded-lg p-2 transition-colors hover:bg-secondary/60"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSession(session.id)}
                        disabled={isPending}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {session.title}
                        </span>
                        {session.locationName && (
                          <span className="text-xs text-muted-foreground">
                            {session.locationName}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Tamu hanya akan melihat sesi yang dicentang saat mengakses undangan personal.
            </p>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Simpan Perubahan' : 'Tambah Tamu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
