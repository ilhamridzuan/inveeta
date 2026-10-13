import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Globe,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { WizardStep1Input } from '@inveeta/shared';

interface Step1Props {
  initialData: Partial<WizardStep1Input>;
  onSaveAndNext: (data: WizardStep1Input) => Promise<void>;
  isSaving: boolean;
  isExistingPublished?: boolean;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export const Step1BasicInfo: React.FC<Step1Props> = ({
  initialData,
  onSaveAndNext,
  isSaving,
  isExistingPublished = false,
}) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [slug, setSlug] = useState(initialData.slug || '');
  const [isSlugTouched, setIsSlugTouched] = useState(Boolean(initialData.slug));
  const [timeZone, setTimeZone] = useState<'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'>(
    initialData.timeZone || 'Asia/Jakarta'
  );
  const [eventDate, setEventDate] = useState(
    initialData.eventDate ? initialData.eventDate.slice(0, 16) : ''
  );
  const [rsvpDeadline, setRsvpDeadline] = useState(
    initialData.rsvpDeadline ? initialData.rsvpDeadline.slice(0, 16) : ''
  );

  // Slug Availability State
  const [slugStatus, setSlugStatus] = useState<
    'idle' | 'checking' | 'available' | 'unavailable' | 'current'
  >('idle');
  const [slugMessage, setSlugMessage] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate slug dari title jika belum disentuh manual
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugTouched && !isExistingPublished) {
      const generated = generateSlug(val);
      setSlug(generated);
    }
  };

  // Debounced Slug Availability Check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      setSlugMessage('Slug minimal 3 karakter');
      return;
    }

    if (initialData.slug && slug === initialData.slug) {
      setSlugStatus('current');
      setSlugMessage('Tautan saat ini untuk acara ini');
      return;
    }

    setSlugStatus('checking');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.api.v1.public.events[':slug'].check.$get({
          param: { slug },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data.isAvailable) {
            setSlugStatus('available');
            setSlugMessage('Tautan tersedia untuk digunakan');
          } else {
            setSlugStatus('unavailable');
            setSlugMessage(
              json.data.reason || 'Tautan ini sudah digunakan oleh acara lain'
            );
          }
        } else {
          setSlugStatus('unavailable');
          setSlugMessage('Tidak dapat memverifikasi slug');
        }
      } catch {
        setSlugStatus('unavailable');
        setSlugMessage('Gagal menghubungi server verifikasi');
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [slug, initialData.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus === 'unavailable') return;

    await onSaveAndNext({
      title,
      slug,
      timeZone,
      eventDate: eventDate ? new Date(eventDate).toISOString() : null,
      rsvpDeadline: rsvpDeadline ? new Date(rsvpDeadline).toISOString() : null,
    });
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Sparkles className="h-4 w-4" />
          <span>Langkah 1 dari 5</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-serif">
          Informasi Dasar Acara & Tautan URL
        </CardTitle>
        <CardDescription>
          Tentukan nama acara pernikahan, usulan tautan web (slug), zona waktu, dan batas konfirmasi kehadiran RSVP tamu.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Judul Acara */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Nama Acara Pernikahan <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: The Wedding of Rama & Shinta"
              required
              minLength={3}
              maxLength={100}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Nama utama yang akan tampil pada banner pembuka dan tajuk undangan.
            </p>
          </div>

          {/* Usulan Slug & Live Availability */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="slug" className="text-sm font-semibold">
                Tautan Undangan (Slug URL) <span className="text-destructive">*</span>
              </Label>
              {isExistingPublished && (
                <Badge variant="warning" className="text-[11px]">
                  Terkunci (Sudah Dipublikasikan)
                </Badge>
              )}
            </div>

            <div className="relative flex rounded-lg shadow-2xs">
              <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-input bg-secondary text-xs text-muted-foreground font-mono">
                inveeta.com/
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setIsSlugTouched(true);
                  setSlug(generateSlug(e.target.value));
                }}
                placeholder="rama-shinta"
                required
                minLength={3}
                maxLength={50}
                disabled={isSaving || isExistingPublished}
                className="rounded-l-none font-mono text-sm"
              />
            </div>

            {/* Slug Feedback Indicator */}
            <div className="flex items-center gap-2 pt-1">
              {slugStatus === 'checking' && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memeriksa ketersediaan tautan...</span>
                </div>
              )}
              {slugStatus === 'available' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{slugMessage}</span>
                </div>
              )}
              {slugStatus === 'current' && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Globe className="h-3.5 w-3.5" />
                  <span>{slugMessage}</span>
                </div>
              )}
              {slugStatus === 'unavailable' && (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>{slugMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Zona Waktu IANA */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Zona Waktu Wilayah Acara <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'Asia/Jakarta', label: 'WIB', region: 'Waktu Indonesia Barat (Jakarta)' },
                { id: 'Asia/Makassar', label: 'WITA', region: 'Waktu Indonesia Tengah (Makassar)' },
                { id: 'Asia/Jayapura', label: 'WIT', region: 'Waktu Indonesia Timur (Jayapura)' },
              ].map((tz) => (
                <button
                  type="button"
                  key={tz.id}
                  onClick={() =>
                    setTimeZone(tz.id as 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura')
                  }
                  className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                    timeZone === tz.id
                      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                      : 'border-border/80 bg-card hover:bg-secondary/40 text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm">{tz.label}</span>
                    {timeZone === tz.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {tz.region}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Memastikan kalender dan countdown hitung mundur waktu pernikahan akurat di perangkat tamu.
            </p>
          </div>

          {/* Tanggal Acara & Batas RSVP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate" className="text-sm font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Tanggal Utama Acara</span>
              </Label>
              <Input
                id="eventDate"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Tanggal referensi untuk countdown dan banner acara.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rsvpDeadline" className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Batas Waktu Konfirmasi RSVP</span>
              </Label>
              <Input
                id="rsvpDeadline"
                type="datetime-local"
                value={rsvpDeadline}
                onChange={(e) => setRsvpDeadline(e.target.value)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Setelah batas waktu ini terlewat, tamu tidak lagi dapat mengubah respons RSVP.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-secondary/30 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <span>
              Perubahan pada langkah ini akan otomatis tersimpan sebagai draft. Tautan URL permanen baru dikunci saat Anda mempublikasikannya di Langkah 5.
            </span>
          </div>
        </CardContent>

        <div className="flex items-center justify-end p-6 border-t border-border/60">
          <Button
            type="submit"
            disabled={isSaving || slugStatus === 'unavailable' || slugStatus === 'checking'}
            className="shadow-xs font-semibold gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan Draft...</span>
              </>
            ) : (
              <>
                <span>Lanjut ke Sesi Acara</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
