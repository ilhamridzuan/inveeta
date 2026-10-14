import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDeleteGuestMutation } from '../api/useGuests';
import type { ManageGuestItemDTO } from '@inveeta/shared';

interface DeleteGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  guest: ManageGuestItemDTO | null;
}

export const DeleteGuestDialog: React.FC<DeleteGuestDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  guest,
}) => {
  const deleteMutation = useDeleteGuestMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!guest) return;
    setErrorMessage(null);

    try {
      await deleteMutation.mutateAsync({
        eventId,
        guestId: guest.id,
      });
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menghapus data tamu'
      );
    }
  };

  if (!guest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-xl font-serif text-destructive">
              Hapus Tamu Undangan
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            Apakah Anda yakin ingin menghapus data tamu{' '}
            <strong className="text-foreground">{guest.name}</strong>? Tindakan ini
            akan menghapus seluruh alokasi sesi, status RSVP, dan token undangan
            terkait secara permanen.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Hapus Tamu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
