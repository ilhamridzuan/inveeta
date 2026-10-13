import React, { useState } from 'react';
import {
  Heart,
  User,
  Quote,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { WizardStep3Input, WizardLoveStoryItem } from '@inveeta/shared';

interface Step3Props {
  initialData: Partial<WizardStep3Input>;
  onSaveAndNext: (data: WizardStep3Input) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

export const Step3BiodataStory: React.FC<Step3Props> = ({
  initialData,
  onSaveAndNext,
  onBack,
  isSaving,
}) => {
  const [brideName, setBrideName] = useState(initialData.brideName || '');
  const [brideNickname, setBrideNickname] = useState(
    initialData.brideNickname || ''
  );
  const [brideParents, setBrideParents] = useState(
    initialData.brideParents || ''
  );

  const [groomName, setGroomName] = useState(initialData.groomName || '');
  const [groomNickname, setGroomNickname] = useState(
    initialData.groomNickname || ''
  );
  const [groomParents, setGroomParents] = useState(
    initialData.groomParents || ''
  );

  const [quoteText, setQuoteText] = useState(
    initialData.quoteText ||
      'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.'
  );
  const [quoteSource, setQuoteSource] = useState(
    initialData.quoteSource || 'QS. Ar-Rum: 21'
  );

  const [loveStory, setLoveStory] = useState<WizardLoveStoryItem[]>(
    initialData.loveStory && initialData.loveStory.length > 0
      ? initialData.loveStory
      : [
          {
            year: '2021',
            story: 'Pertemuan pertama kami di kampus saat kegiatan seminar nasional.',
          },
          {
            year: '2024',
            story: 'Pertunangan hangat dihadiri keluarga besar tercinta.',
          },
        ]
  );

  const handleAddStory = () => {
    setLoveStory([
      ...loveStory,
      {
        year: `${new Date().getFullYear()}`,
        story: 'Momen berharga lainnya dalam perjalanan cinta kami.',
      },
    ]);
  };

  const handleRemoveStory = (index: number) => {
    setLoveStory(loveStory.filter((_, i) => i !== index));
  };

  const handleUpdateStory = (
    index: number,
    field: keyof WizardLoveStoryItem,
    value: string
  ) => {
    const updated = [...loveStory];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setLoveStory(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndNext({
      brideName,
      brideNickname,
      brideParents: brideParents || null,
      groomName,
      groomNickname,
      groomParents: groomParents || null,
      quoteText: quoteText || null,
      quoteSource: quoteSource || null,
      loveStory,
    });
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Heart className="h-4 w-4" />
          <span>Langkah 3 dari 5</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-serif">
          Biodata Pengantin & Kisah Cinta
        </CardTitle>
        <CardDescription>
          Isi profil kedua calon mempelai, nama orang tua tercinta, kutipan ayat/mutiara, dan linimasa kisah perjalanan cinta.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-8">
          {/* Section Profil Pengantin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mempelai Wanita */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-950/40">
                  <User className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">
                  Profil Mempelai Wanita (Bride)
                </h4>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brideName" className="text-xs font-semibold">
                  Nama Lengkap & Gelar <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="brideName"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                  placeholder="Contoh: Raden Ajeng Shinta Dewi, S.Ked"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brideNickname" className="text-xs font-semibold">
                  Nama Panggilan <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="brideNickname"
                  value={brideNickname}
                  onChange={(e) => setBrideNickname(e.target.value)}
                  placeholder="Contoh: Shinta"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brideParents" className="text-xs font-semibold">
                  Nama Orang Tua (Ayah & Ibu)
                </Label>
                <Input
                  id="brideParents"
                  value={brideParents}
                  onChange={(e) => setBrideParents(e.target.value)}
                  placeholder="Putri dari Bpk. Bambang & Ibu Sri Lestari"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Mempelai Pria */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                  <User className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-sm text-foreground">
                  Profil Mempelai Pria (Groom)
                </h4>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="groomName" className="text-xs font-semibold">
                  Nama Lengkap & Gelar <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="groomName"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                  placeholder="Contoh: Rama Wijaya Kusumah, S.T."
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="groomNickname" className="text-xs font-semibold">
                  Nama Panggilan <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="groomNickname"
                  value={groomNickname}
                  onChange={(e) => setGroomNickname(e.target.value)}
                  placeholder="Contoh: Rama"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="groomParents" className="text-xs font-semibold">
                  Nama Orang Tua (Ayah & Ibu)
                </Label>
                <Input
                  id="groomParents"
                  value={groomParents}
                  onChange={(e) => setGroomParents(e.target.value)}
                  placeholder="Putra dari Bpk. H. Hendra & Ibu Hj. Ratna"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Section Ayat / Kutipan */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Quote className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-foreground">
                Kutipan Doa / Ayat / Kata Mutiara
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quoteText" className="text-xs font-semibold">
                Isi Kutipan
              </Label>
              <textarea
                id="quoteText"
                rows={3}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Tuliskan ayat suci atau kutipan romantis..."
                className="w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quoteSource" className="text-xs font-semibold">
                Sumber Kutipan
              </Label>
              <Input
                id="quoteSource"
                value={quoteSource}
                onChange={(e) => setQuoteSource(e.target.value)}
                placeholder="Contoh: QS. Ar-Rum: 21 / 1 Korintus 13:4-7"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Section Kisah Cinta (Love Story) */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Linimasa Perjalanan Cinta (Love Story)
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStory}
                disabled={isSaving}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Momen</span>
              </Button>
            </div>

            {loveStory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-4">
                Belum ada momen kisah cinta yang ditambahkan.
              </p>
            ) : (
              <div className="space-y-3">
                {loveStory.map((storyItem, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3.5 rounded-xl border border-border/70 bg-secondary/30"
                  >
                    <div className="w-full sm:w-28 shrink-0">
                      <Input
                        value={storyItem.year}
                        onChange={(e) =>
                          handleUpdateStory(idx, 'year', e.target.value)
                        }
                        placeholder="Tahun"
                        className="font-mono text-xs h-9"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="w-full flex-1">
                      <Input
                        value={storyItem.story}
                        onChange={(e) =>
                          handleUpdateStory(idx, 'story', e.target.value)
                        }
                        placeholder="Ceritakan momen singkat ini..."
                        className="text-xs h-9"
                        disabled={isSaving}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveStory(idx)}
                      disabled={isSaving}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex items-center justify-between p-6 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSaving}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Button>

          <Button
            type="submit"
            disabled={isSaving || !brideName || !groomName}
            className="shadow-xs font-semibold gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <span>Lanjut ke Hadiah & Media Foto</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
