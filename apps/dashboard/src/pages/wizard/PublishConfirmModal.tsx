import React from 'react';
import { AlertTriangle, Lock, Globe, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isPublishing: boolean;
  slug: string;
  title: string;
}

export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isPublishing,
  slug,
  title,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isPublishing && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 sm:mx-0">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-serif">
            Konfirmasi Publikasi Acara
          </DialogTitle>
          <DialogDescription className="text-left leading-relaxed">
            Harap baca peringatan penting berikut sebelum merilis undangan ke publik:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Warning Slug Lock */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Penguncian Tautan Permanen (Slug Immutability)</span>
            </div>
            <p className="leading-relaxed">
              Setelah tombol publikasi ditekan, tautan URL di bawah akan <strong>dikunci permanen di tingkat basis data</strong> dan tidak dapat diubah lagi untuk menjaga validasi kode QR fisik dan tautan tamu:
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-white/80 dark:bg-black/40 px-3 py-2 border border-amber-300/50 font-mono text-xs font-bold text-foreground">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>inveeta.com/{slug}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">{title}</div>
            <p>
              Tamu yang mengakses tautan ini dapat melihat informasi acara, lokasi, profil calon mempelai, serta mengirim konfirmasi kehadiran RSVP secara realtime.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPublishing}
          >
            Periksa Kembali
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={onConfirm}
            disabled={isPublishing}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mempublikasikan...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Ya, Kunci & Publikasikan</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
