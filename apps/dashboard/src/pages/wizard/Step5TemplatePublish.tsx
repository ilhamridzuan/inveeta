import React, { useState } from 'react';
import {
  Palette,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Sparkles,
  Calendar,
  Globe,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PublishConfirmModal } from './PublishConfirmModal';
import type {
  WizardStep5Input,
  VisualCustomization,
} from '@inveeta/shared';

interface Step5Props {
  slug: string;
  title: string;
  eventDate?: string | null;
  brideName?: string | null;
  groomName?: string | null;
  coverPhotoUrl?: string | null;
  isPublished: boolean;
  initialData: Partial<WizardStep5Input>;
  onSaveTemplate: (data: WizardStep5Input) => Promise<void>;
  onPublishEvent: () => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
  isPublishing: boolean;
}

export const Step5TemplatePublish: React.FC<Step5Props> = ({
  slug,
  title,
  eventDate,
  brideName,
  groomName,
  coverPhotoUrl,
  isPublished,
  initialData,
  onSaveTemplate,
  onPublishEvent,
  onBack,
  isSaving,
  isPublishing,
}) => {
  const [templateId, setTemplateId] = useState<string>(
    initialData.templateId || 'minimalist-elegance'
  );

  const [visualCustomization, setVisualCustomization] =
    useState<VisualCustomization>(
      initialData.visualCustomization || {
        primaryColor: '#9B6A56',
        secondaryColor: '#EADDD7',
        fontFamily: 'playfair-inter',
        coverLayout: 'fullscreen-image',
        sectionsOrder: ['cover', 'couple', 'event', 'story', 'gallery', 'gift', 'rsvp'],
        hiddenSections: [],
      }
    );

  const [isModalOpen, setIsModalOpen] = useState(false);

  const templatesList = [
    {
      id: 'minimalist-elegance',
      title: 'Minimalist Elegance',
      subtitle: 'Modern & Editorial Clean',
      description: 'Tata letak putih bersih, tipografi bersahaja, fokus pada esensi foto dan kenyamanan membaca tamu.',
      accent: '#9B6A56',
    },
    {
      id: 'rustic-garden',
      title: 'Rustic Garden',
      subtitle: 'Botanical & Earthy Warm',
      description: 'Aksen dedaunan botani hangat, latar bernuansa terracotta & kayu alami, ideal untuk pernikahan kebun.',
      accent: '#6E8B3D',
    },
    {
      id: 'javanese-heritage',
      title: 'Javanese Heritage',
      subtitle: 'Traditional & Majestic Gold',
      description: 'Sentuhan ornamen ukir klasik, kombinasi warna emas & tembaga anggun untuk pesta adat sakral.',
      accent: '#B8860B',
    },
  ];

  const colorPresets = [
    { name: 'Terracotta Classic', primary: '#9B6A56', secondary: '#EADDD7' },
    { name: 'Sage Garden', primary: '#556B2F', secondary: '#E2E8DC' },
    { name: 'Royal Navy & Champagne', primary: '#1E3A8A', secondary: '#F5EBE0' },
    { name: 'Warm Charcoal & Rose', primary: '#2D3748', secondary: '#FCE7F3' },
  ];

  const handleSelectPreset = (primary: string, secondary: string) => {
    setVisualCustomization({
      ...visualCustomization,
      primaryColor: primary,
      secondaryColor: secondary,
    });
  };

  const handleSaveStep = async () => {
    await onSaveTemplate({
      templateId,
      visualCustomization,
    });
  };

  return (
    <>
      <Card className="border-border/80 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <Palette className="h-4 w-4" />
            <span>Langkah 5 dari 5</span>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-serif">
            Tema Undangan & Publikasi Acara
          </CardTitle>
          <CardDescription>
            Pilih estetika template undangan digital, atur palet warna utama, tinjau ringkasan data, dan publikasikan tautan web Anda.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Section Pilihan Template */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              Pilih Desain Template Undangan
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templatesList.map((tpl) => (
                <button
                  type="button"
                  key={tpl.id}
                  onClick={() => setTemplateId(tpl.id)}
                  className={`relative flex flex-col justify-between text-left p-5 rounded-2xl border cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    templateId === tpl.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary shadow-xs'
                      : 'border-border/80 bg-card hover:bg-secondary/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tpl.accent }}
                      />
                      {templateId === tpl.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <h4 className="font-bold text-base text-foreground">
                      {tpl.title}
                    </h4>
                    <span className="text-xs font-medium text-primary block">
                      {tpl.subtitle}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/60">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ID: {tpl.id}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section Pilihan Palet Warna */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Palette className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-foreground">
                Kustomisasi Palet Warna Aksen
              </h4>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground">Preset Warna Rekomendasi:</span>
              <div className="flex flex-wrap gap-2.5">
                {colorPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => handleSelectPreset(preset.primary, preset.secondary)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-secondary transition"
                  >
                    <div className="flex -space-x-1">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="primaryColor" className="text-xs font-semibold">
                  Warna Primer (Hex)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primaryColorPicker"
                    value={visualCustomization.primaryColor}
                    onChange={(e) =>
                      setVisualCustomization({
                        ...visualCustomization,
                        primaryColor: e.target.value,
                      })
                    }
                    className="h-9 w-9 rounded-lg border border-input cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    id="primaryColor"
                    value={visualCustomization.primaryColor}
                    onChange={(e) =>
                      setVisualCustomization({
                        ...visualCustomization,
                        primaryColor: e.target.value,
                      })
                    }
                    className="flex-1 h-9 rounded-lg border border-input bg-card px-3 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="secondaryColor" className="text-xs font-semibold">
                  Warna Sekunder (Hex)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondaryColorPicker"
                    value={visualCustomization.secondaryColor}
                    onChange={(e) =>
                      setVisualCustomization({
                        ...visualCustomization,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="h-9 w-9 rounded-lg border border-input cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    id="secondaryColor"
                    value={visualCustomization.secondaryColor}
                    onChange={(e) =>
                      setVisualCustomization({
                        ...visualCustomization,
                        secondaryColor: e.target.value,
                      })
                    }
                    className="flex-1 h-9 rounded-lg border border-input bg-card px-3 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Ringkasan Acara Sebelum Publikasi */}
          <div className="rounded-2xl border border-border/80 bg-secondary/30 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <h4 className="font-semibold text-sm text-foreground">
                Ringkasan Informasi Undangan
              </h4>
              {isPublished ? (
                <Badge variant="success">● Publikasi Aktif</Badge>
              ) : (
                <Badge variant="warning">○ Masih Berstatus Draft</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Judul Acara:</span>
                <p className="font-semibold text-foreground">{title}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Tautan Web Undangan:</span>
                <p className="font-mono font-semibold text-primary flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  <span>inveeta.com/{slug}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Pasangan Calon Pengantin:</span>
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {brideName && groomName
                      ? `${brideName} & ${groomName}`
                      : 'Belum dilengkapi'}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Tanggal Acara:</span>
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span className="tabular-nums">
                    {eventDate
                      ? new Date(eventDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Belum diatur'}
                  </span>
                </p>
              </div>
            </div>

            {coverPhotoUrl && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="h-12 w-12 rounded-lg overflow-hidden border border-border">
                  <img
                    src={coverPhotoUrl}
                    alt="Cover Thumbnail"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground block">
                    Foto Sampul R2 Terhubung
                  </span>
                  <span className="text-muted-foreground">
                    Siap untuk tampilan Open Graph media sosial WhatsApp.
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSaving || isPublishing}
            className="gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveStep}
              disabled={isSaving || isPublishing}
              className="w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Pengaturan Template</span>
              )}
            </Button>

            {isPublished ? (
              <Button asChild className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700">
                <a
                  href={`http://localhost:3001/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Buka Undangan Publik</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={isSaving || isPublishing}
                className="w-full sm:w-auto gap-2 font-semibold shadow-xs bg-primary hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                <span>Publikasikan Undangan</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Modal Konfirmasi Publikasi */}
      <PublishConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async () => {
          await onPublishEvent();
          setIsModalOpen(false);
        }}
        isPublishing={isPublishing}
        slug={slug}
        title={title}
      />
    </>
  );
};
