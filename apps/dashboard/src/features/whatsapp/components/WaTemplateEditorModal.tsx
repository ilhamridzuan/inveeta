import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  Loader2,
  Check,
  Eye,
  Tag,
} from 'lucide-react';
import {
  useWaTemplateQuery,
  useUpdateWaTemplateMutation,
} from '../api/useWhatsApp';
import { DEFAULT_WA_MESSAGE_TEMPLATE } from '@inveeta/shared';

interface WaTemplateEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle?: string;
  eventSlug?: string;
  eventDate?: string | Date | null;
}

const AVAILABLE_TAGS = [
  { tag: '{nama}', label: 'Nama Tamu', example: 'Bpk. Muhammad Irfan' },
  { tag: '{acara}', label: 'Judul Acara', example: 'Pernikahan Budi & Ani' },
  { tag: '{tanggal}', label: 'Tanggal Acara', example: 'Sabtu, 24 Oktober 2026' },
  { tag: '{link}', label: 'Tautan Undangan', example: 'https://inveeta.com/budi-ani/inv-token' },
];

export const WaTemplateEditorModal: React.FC<WaTemplateEditorModalProps> = ({
  open,
  onOpenChange,
  eventId,
  eventTitle = 'Pernikahan Kami',
  eventSlug = 'wedding-demo',
  eventDate,
}) => {
  const { data: templateData, isLoading: isLoadingTemplate } = useWaTemplateQuery(eventId);
  const updateMutation = useUpdateWaTemplateMutation();

  const [templateText, setTemplateText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when template loads or modal opens
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (templateData) {
        setTemplateText(templateData.templateText);
      } else {
        setTemplateText(DEFAULT_WA_MESSAGE_TEMPLATE);
      }
    }
  }, [open, templateData]);

  const insertTag = (tag: string) => {
    if (!textareaRef.current) {
      setTemplateText((prev) => prev + tag);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = templateText.substring(0, start);
    const textAfter = templateText.substring(end);

    const newText = textBefore + tag + textAfter;
    setTemplateText(newText);

    // Set cursor position after inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleResetDefault = () => {
    setTemplateText(DEFAULT_WA_MESSAGE_TEMPLATE);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmed = templateText.trim();
    if (trimmed.length < 10) {
      setErrorMessage('Template pesan WhatsApp minimal 10 karakter');
      return;
    }

    if (!trimmed.includes('{link}')) {
      setErrorMessage('Template wajib menyertakan tag {link} agar tamu dapat membuka undangan mereka');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        eventId,
        templateText: trimmed,
      });

      setSuccessMessage('Template pesan WhatsApp berhasil disimpan');
      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal menyimpan template WhatsApp'
      );
    }
  };

  // Generate live preview text with simulated variables
  const previewText = React.useMemo(() => {
    let text = templateText;
    const sampleDate = eventDate
      ? new Date(eventDate).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Sabtu, 24 Oktober 2026';

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://inveeta.com';
    const sampleLink = `${origin.replaceAll('app.', '')}/${eventSlug}/sample-token`;

    text = text.replaceAll('{nama}', 'Bpk. Muhammad Irfan & Partner');
    text = text.replaceAll('{acara}', eventTitle);
    text = text.replaceAll('{tanggal}', sampleDate);
    text = text.replaceAll('{link}', sampleLink);
    return text;
  }, [templateText, eventTitle, eventDate, eventSlug]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-serif">
                Template Pesan WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kustomisasi teks pengantar saat membagikan tautan undangan personal ke kontak tamu.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Tag inserters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Sisipkan Tag Variabel Dinamis
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefault}
                className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset ke Default
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => insertTag(t.tag)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 hover:text-primary active:scale-95"
                >
                  <code className="font-mono text-primary font-semibold">{t.tag}</code>
                  <span className="text-muted-foreground text-[11px]">({t.label})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="wa-template-textarea" className="text-xs font-medium text-foreground">
                Isi Format Pesan
              </label>
              <span className="text-[11px] text-muted-foreground">
                {templateText.length} karakter
              </span>
            </div>
            <textarea
              id="wa-template-textarea"
              ref={textareaRef}
              rows={6}
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              disabled={isLoadingTemplate || updateMutation.isPending}
              placeholder="Ketik template pesan di sini..."
              className="w-full rounded-xl border border-input bg-card p-3 font-sans text-sm text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              required
            />
          </div>

          {/* Live Preview Box */}
          <div className="space-y-1.5 rounded-xl border border-border/80 bg-secondary/20 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
              <Eye className="h-3.5 w-3.5 text-emerald-600" />
              <span>Simulasi Tampilan WhatsApp Tamu</span>
            </div>
            <div className="rounded-lg bg-card p-3 shadow-2xs border border-border/60">
              <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90 leading-relaxed break-words">
                {previewText}
              </pre>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoadingTemplate || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Simpan Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
