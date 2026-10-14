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
import { useDeleteWishMutation } from '../api/useWishes';
import type { ManageWishItemDTO } from '@inveeta/shared';

interface DeleteWishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  wish: ManageWishItemDTO | null;
}

export const DeleteWishDialog: React.FC<DeleteWishDialogProps> = ({
  open,
  onOpenChange,
  eventId,
  wish,
}) => {
  const deleteMutation = useDeleteWishMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!wish) return;
    setErrorMessage(null);

    try {
      await deleteMutation.mutateAsync({
        eventId,
        wishId: wish.id,
      });
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menghapus ucapan'
      );
    }
  };

  if (!wish) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-xl font-serif text-destructive">
              Hapus Ucapan
            </DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm leading-relaxed">
            Apakah Anda yakin ingin menghapus ucapan dari{' '}
            <strong className="text-foreground">{wish.senderName}</strong> secara permanen?
            Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs italic text-foreground/80">
          &ldquo;{wish.message}&rdquo;
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="pt-3">
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
            Hapus Ucapan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
