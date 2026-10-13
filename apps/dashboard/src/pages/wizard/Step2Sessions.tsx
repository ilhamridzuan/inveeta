import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Layers,
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
import type { WizardStep2Input, WizardSessionItem } from '@inveeta/shared';

interface Step2Props {
  initialData: Partial<WizardStep2Input>;
  onSaveAndNext: (data: WizardStep2Input) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

export const Step2Sessions: React.FC<Step2Props> = ({
  initialData,
  onSaveAndNext,
  onBack,
  isSaving,
}) => {
  const [sessions, setSessions] = useState<WizardSessionItem[]>(
    initialData.sessions && initialData.sessions.length > 0
      ? initialData.sessions
      : [
          {
            title: 'Akad Nikah',
            startTime: new Date(Date.now() + 86400000 * 30).toISOString(),
            endTime: new Date(Date.now() + 86400000 * 30 + 7200000).toISOString(),
            locationName: 'Masjid Agung Al-Azhar',
            address: 'Jl. Sisingamangaraja, Kebayoran Baru, Jakarta Selatan',
            googleMapsUrl: 'https://maps.google.com',
            isPublic: true,
            sortOrder: 0,
          },
          {
            title: 'Resepsi Pernikahan',
            startTime: new Date(Date.now() + 86400000 * 30 + 10800000).toISOString(),
            endTime: new Date(Date.now() + 86400000 * 30 + 21600000).toISOString(),
            locationName: 'Grand Ballroom Hotel Mulia',
            address: 'Jl. Asia Afrika Senayan, Jakarta Pusat',
            googleMapsUrl: 'https://maps.google.com',
            isPublic: true,
            sortOrder: 1,
          },
        ]
  );

  const handleAddSession = () => {
    const newSession: WizardSessionItem = {
      title: 'Resepsi Sesi 2',
      startTime: new Date(Date.now() + 86400000 * 30 + 25200000).toISOString(),
      endTime: new Date(Date.now() + 86400000 * 30 + 36000000).toISOString(),
      locationName: 'Grand Ballroom Hotel Mulia',
      address: 'Jl. Asia Afrika Senayan, Jakarta Pusat',
      googleMapsUrl: 'https://maps.google.com',
      isPublic: false,
      sortOrder: sessions.length,
    };
    setSessions([...sessions, newSession]);
  };

  const handleRemoveSession = (index: number) => {
    if (sessions.length <= 1) return;
    const updated = sessions.filter((_, i) => i !== index);
    setSessions(updated);
  };

  const handleUpdateSession = (
    index: number,
    field: keyof WizardSessionItem,
    value: unknown
  ) => {
    const updated = [...sessions];
    updated[index] = {
      ...updated[index],
      [field]: value,
    } as WizardSessionItem;
    setSessions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessions.length === 0) return;
    await onSaveAndNext({ sessions });
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Layers className="h-4 w-4" />
          <span>Langkah 2 dari 5</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-serif">
          Sesi Acara & Lokasi Pernikahan
        </CardTitle>
        <CardDescription>
          Atur rangkaian jadwal acara (seperti Akad Nikah, Resepsi Siang, atau Resepsi Malam) beserta alamat dan tautan Google Maps.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            {sessions.map((session, idx) => (
              <div
                key={session.id || idx}
                className="relative rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                      {idx + 1}
                    </span>
                    <h4 className="font-semibold text-base text-foreground">
                      {session.title || `Sesi Acara #${idx + 1}`}
                    </h4>
                  </div>
                  {sessions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSession(idx)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      <span>Hapus Sesi</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`session-title-${idx}`} className="text-xs font-semibold">
                      Nama Sesi <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`session-title-${idx}`}
                      value={session.title}
                      onChange={(e) =>
                        handleUpdateSession(idx, 'title', e.target.value)
                      }
                      placeholder="Contoh: Akad Nikah / Pemberkatan"
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`session-location-${idx}`} className="text-xs font-semibold">
                      Nama Tempat / Gedung <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`session-location-${idx}`}
                      value={session.locationName}
                      onChange={(e) =>
                        handleUpdateSession(idx, 'locationName', e.target.value)
                      }
                      placeholder="Contoh: Masjid Agung Al-Azhar"
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`session-start-${idx}`} className="text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Waktu Mulai</span>
                    </Label>
                    <Input
                      id={`session-start-${idx}`}
                      type="datetime-local"
                      value={
                        session.startTime ? session.startTime.slice(0, 16) : ''
                      }
                      onChange={(e) =>
                        handleUpdateSession(
                          idx,
                          'startTime',
                          new Date(e.target.value).toISOString()
                        )
                      }
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`session-end-${idx}`} className="text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span>Waktu Selesai</span>
                    </Label>
                    <Input
                      id={`session-end-${idx}`}
                      type="datetime-local"
                      value={
                        session.endTime ? session.endTime.slice(0, 16) : ''
                      }
                      onChange={(e) =>
                        handleUpdateSession(
                          idx,
                          'endTime',
                          new Date(e.target.value).toISOString()
                        )
                      }
                      required
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`session-address-${idx}`} className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Alamat Lengkap Tempat Acara</span>
                  </Label>
                  <Input
                    id={`session-address-${idx}`}
                    value={session.address}
                    onChange={(e) =>
                      handleUpdateSession(idx, 'address', e.target.value)
                    }
                    placeholder="Jl. Nama Jalan No. XX, Kelurahan, Kecamatan, Kota"
                    required
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`session-maps-${idx}`} className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-primary" />
                    <span>Tautan Google Maps Lokasi (Opsional)</span>
                  </Label>
                  <Input
                    id={`session-maps-${idx}`}
                    type="url"
                    value={session.googleMapsUrl || ''}
                    onChange={(e) =>
                      handleUpdateSession(idx, 'googleMapsUrl', e.target.value)
                    }
                    placeholder="https://maps.google.com/..."
                    disabled={isSaving}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id={`session-public-${idx}`}
                    type="checkbox"
                    checked={session.isPublic ?? false}
                    onChange={(e) =>
                      handleUpdateSession(idx, 'isPublic', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    disabled={isSaving}
                  />
                  <Label htmlFor={`session-public-${idx}`} className="text-xs cursor-pointer font-normal text-muted-foreground">
                    Sesi terbuka secara publik untuk semua tamu umum (bukan sesi VIP/Tertutup)
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleAddSession}
            disabled={isSaving}
            className="w-full border-dashed gap-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Sesi Acara Lainnya</span>
          </Button>
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
            disabled={isSaving || sessions.length === 0}
            className="shadow-xs font-semibold gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <span>Lanjut ke Biodata & Kisah Cinta</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
