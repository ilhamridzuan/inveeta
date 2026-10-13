import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Check,
  Calendar,
  Layers,
  Heart,
  Gift,
  Palette,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Step1BasicInfo } from './Step1BasicInfo';
import { Step2Sessions } from './Step2Sessions';
import { Step3BiodataStory } from './Step3BiodataStory';
import { Step4GiftsMedia } from './Step4GiftsMedia';
import { Step5TemplatePublish } from './Step5TemplatePublish';
import type {
  WizardStep1Input,
  WizardStep2Input,
  WizardStep3Input,
  WizardStep4Input,
  WizardStep5Input,
  VisualCustomization,
} from '@inveeta/shared';

interface HostEventDetail {
  id: string;
  slug: string;
  title: string;
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  eventDate: string | null;
  rsvpDeadline: string | null;
  brideName: string | null;
  brideNickname: string | null;
  brideParents: string | null;
  groomName: string | null;
  groomNickname: string | null;
  groomParents: string | null;
  quoteText: string | null;
  quoteSource: string | null;
  loveStory: Array<{ year: string; story: string; photoUrl?: string | null }> | null;
  coverPhotoUrl: string | null;
  bgMusicUrl: string | null;
  templateId: string;
  visualCustomization: VisualCustomization | null;
  isPublished: boolean;
  sessions: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    locationName: string;
    address: string;
    googleMapsUrl: string | null;
    wazeUrl: string | null;
    isPublic: boolean;
    sortOrder: number;
  }>;
  giftDetails: {
    bankAccounts: Array<{
      id?: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
      sortOrder?: number;
    }>;
    qrisImageUrl: string | null;
    giftAddress: string | null;
    giftRecipientName: string | null;
  } | null;
  media: Array<{
    id: string;
    fileUrl: string;
    mediaType: string;
    slotIdentifier: string | null;
    sortOrder: number;
  }>;
}

export const WizardContainer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventIdParam = searchParams.get('id');

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeEventId, setActiveEventId] = useState<string | null>(eventIdParam);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState(false);

  // Ambil data acara jika activeEventId ada
  const {
    data: eventData,
    isLoading: isLoadingEvent,
    refetch: refetchEvent,
  } = useQuery({
    queryKey: ['event-detail', activeEventId],
    queryFn: async () => {
      if (!activeEventId) return null;
      const res = await apiClient.api.v1.manage.events[':id'].$get({
        param: { id: activeEventId },
      });
      if (!res.ok) throw new Error('Gagal mengambil data detail acara');
      const json = await res.json();
      return json.data as unknown as HostEventDetail;
    },
    enabled: Boolean(activeEventId),
  });

  // Sinkronisasi activeEventId dari URL
  useEffect(() => {
    if (eventIdParam && eventIdParam !== activeEventId) {
      setActiveEventId(eventIdParam);
    }
  }, [eventIdParam, activeEventId]);

  const stepsConfig = [
    { num: 1, label: 'Info Dasar', icon: Calendar },
    { num: 2, label: 'Sesi Acara', icon: Layers },
    { num: 3, label: 'Biodata & Kisah', icon: Heart },
    { num: 4, label: 'Hadiah & Media', icon: Gift },
    { num: 5, label: 'Tema & Publikasi', icon: Palette },
  ];

  // Handler Simpan Step 1
  const handleSaveStep1 = async (data: WizardStep1Input) => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      let currentId = activeEventId;

      // Jika draft belum ada di database, buat draft baru terlebih dahulu
      if (!currentId) {
        const createRes = await apiClient.api.v1.manage.events.draft.$post({
          json: {
            title: data.title,
            slug: data.slug,
            timeZone: data.timeZone,
            eventType: 'wedding',
            templateId: 'minimalist-elegance',
          },
        });

        if (!createRes.ok) {
          const err = (await createRes.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(err?.error?.message || 'Gagal membuat draft baru');
        }

        const createJson = (await createRes.json()) as {
          success: boolean;
          data: { id: string };
        };
        currentId = createJson.data.id;
        setActiveEventId(currentId);
        setSearchParams({ id: currentId });
      }

      // Update data step 1
      if (currentId) {
        const updateRes = await apiClient.api.v1.manage.events[':id']['wizard-step'].$put({
          param: { id: currentId },
          json: {
            step: 1,
            data,
          },
        });

        if (!updateRes.ok) {
          const err = (await updateRes.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(err?.error?.message || 'Gagal menyimpan langkah 1');
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['my-events'] });
      await refetchEvent();
      setSaveSuccessMessage('Informasi dasar berhasil disimpan');
      setCurrentStep(2);
    } catch (err) {
      console.error('Error saving step 1:', err);
      alert(err instanceof Error ? err.message : 'Gagal menyimpan draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Simpan Step 2
  const handleSaveStep2 = async (data: WizardStep2Input) => {
    if (!activeEventId) return;
    setIsSaving(true);
    try {
      const res = await apiClient.api.v1.manage.events[':id']['wizard-step'].$put({
        param: { id: activeEventId },
        json: {
          step: 2,
          data,
        },
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(err?.error?.message || 'Gagal menyimpan sesi acara');
      }

      await refetchEvent();
      setSaveSuccessMessage('Rangkaian sesi acara berhasil disimpan');
      setCurrentStep(3);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan sesi');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Simpan Step 3
  const handleSaveStep3 = async (data: WizardStep3Input) => {
    if (!activeEventId) return;
    setIsSaving(true);
    try {
      const res = await apiClient.api.v1.manage.events[':id']['wizard-step'].$put({
        param: { id: activeEventId },
        json: {
          step: 3,
          data,
        },
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(err?.error?.message || 'Gagal menyimpan biodata pengantin');
      }

      await refetchEvent();
      setSaveSuccessMessage('Profil pengantin & kisah cinta berhasil disimpan');
      setCurrentStep(4);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan biodata');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Simpan Step 4
  const handleSaveStep4 = async (data: WizardStep4Input) => {
    if (!activeEventId) return;
    setIsSaving(true);
    try {
      const res = await apiClient.api.v1.manage.events[':id']['wizard-step'].$put({
        param: { id: activeEventId },
        json: {
          step: 4,
          data,
        },
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(err?.error?.message || 'Gagal menyimpan hadiah & media');
      }

      await refetchEvent();
      setSaveSuccessMessage('Hadiah digital & galeri foto berhasil disimpan');
      setCurrentStep(5);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan data media');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Simpan Step 5 (Pengaturan Template)
  const handleSaveStep5 = async (data: WizardStep5Input) => {
    if (!activeEventId) return;
    setIsSaving(true);
    try {
      const res = await apiClient.api.v1.manage.events[':id']['wizard-step'].$put({
        param: { id: activeEventId },
        json: {
          step: 5,
          data,
        },
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(err?.error?.message || 'Gagal menyimpan pengaturan template');
      }

      await refetchEvent();
      setSaveSuccessMessage('Pengaturan tema template berhasil disimpan');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan template');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Publikasi Acara
  const handlePublishEvent = async () => {
    if (!activeEventId) return;
    setIsPublishing(true);
    try {
      const res = await apiClient.api.v1.manage.events[':id'].publish.$post({
        param: { id: activeEventId },
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(err?.error?.message || 'Gagal mempublikasikan acara');
      }

      await queryClient.invalidateQueries({ queryKey: ['my-events'] });
      await refetchEvent();
      setShowPublishSuccessModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mempublikasikan acara');
    } finally {
      setIsPublishing(false);
    }
  };

  if (activeEventId && isLoadingEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
            <Link to="/dashboard" title="Kembali ke Dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-serif">
              {eventData ? eventData.title : 'Buat Undangan Baru'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeEventId
                ? `ID Acara: ${activeEventId}`
                : 'Formulir interaktif 5 langkah pembuatan acara'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {eventData?.isPublished ? (
            <Badge variant="success">● Publikasi Aktif</Badge>
          ) : (
            <Badge variant="warning">○ Draft Formulir</Badge>
          )}

          {activeEventId && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/dashboard">
                <span>Daftar Acara</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Progress Indicator 1-5 */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {stepsConfig.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.num < currentStep;
            const isActive = step.num === currentStep;
            const canNavigate = Boolean(activeEventId) || step.num === 1;

            return (
              <button
                type="button"
                key={step.num}
                onClick={() => canNavigate && setCurrentStep(step.num)}
                disabled={!canNavigate}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : isCompleted
                    ? 'text-foreground hover:bg-secondary/40'
                    : 'text-muted-foreground opacity-60'
                }`}
              >
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-xs font-bold transition-all shadow-2xs mb-1.5 ${
                    isActive
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-[11px] sm:text-xs line-clamp-1">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Feedback Sukses Simpan */}
      {saveSuccessMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Step Views */}
      {currentStep === 1 && (
        <Step1BasicInfo
          initialData={{
            title: eventData?.title,
            slug: eventData?.slug,
            timeZone: eventData?.timeZone,
            eventDate: eventData?.eventDate,
            rsvpDeadline: eventData?.rsvpDeadline,
          }}
          onSaveAndNext={handleSaveStep1}
          isSaving={isSaving}
          isExistingPublished={eventData?.isPublished}
        />
      )}

      {currentStep === 2 && (
        <Step2Sessions
          initialData={{
            sessions: eventData?.sessions?.map((s) => ({
              id: s.id,
              title: s.title,
              startTime: s.startTime,
              endTime: s.endTime,
              locationName: s.locationName,
              address: s.address,
              googleMapsUrl: s.googleMapsUrl,
              wazeUrl: s.wazeUrl,
              isPublic: s.isPublic,
              sortOrder: s.sortOrder,
            })),
          }}
          onSaveAndNext={handleSaveStep2}
          onBack={() => setCurrentStep(1)}
          isSaving={isSaving}
        />
      )}

      {currentStep === 3 && (
        <Step3BiodataStory
          initialData={{
            brideName: eventData?.brideName || undefined,
            brideNickname: eventData?.brideNickname || undefined,
            brideParents: eventData?.brideParents,
            groomName: eventData?.groomName || undefined,
            groomNickname: eventData?.groomNickname || undefined,
            groomParents: eventData?.groomParents,
            quoteText: eventData?.quoteText,
            quoteSource: eventData?.quoteSource,
            loveStory: eventData?.loveStory || [],
          }}
          onSaveAndNext={handleSaveStep3}
          onBack={() => setCurrentStep(2)}
          isSaving={isSaving}
        />
      )}

      {currentStep === 4 && (
        <Step4GiftsMedia
          eventId={activeEventId || ''}
          initialData={{
            bankAccounts: eventData?.giftDetails?.bankAccounts?.map((b, i) => ({
              id: b.id,
              bankName: b.bankName,
              accountNumber: b.accountNumber,
              accountHolder: b.accountHolder,
              sortOrder: b.sortOrder ?? i,
            })),
            qrisImageUrl: eventData?.giftDetails?.qrisImageUrl,
            giftAddress: eventData?.giftDetails?.giftAddress,
            giftRecipientName: eventData?.giftDetails?.giftRecipientName,
            coverPhotoUrl: eventData?.coverPhotoUrl,
            bgMusicUrl: eventData?.bgMusicUrl,
            galleryPhotos: eventData?.media
              ?.filter((m) => m.mediaType === 'photo')
              .map((m) => ({
                fileUrl: m.fileUrl,
                slotIdentifier: m.slotIdentifier,
                sortOrder: m.sortOrder,
              })),
          }}
          onSaveAndNext={handleSaveStep4}
          onBack={() => setCurrentStep(3)}
          isSaving={isSaving}
        />
      )}

      {currentStep === 5 && (
        <Step5TemplatePublish
          eventId={activeEventId || ''}
          slug={eventData?.slug || ''}
          title={eventData?.title || ''}
          eventDate={eventData?.eventDate}
          brideName={eventData?.brideName}
          groomName={eventData?.groomName}
          coverPhotoUrl={eventData?.coverPhotoUrl}
          isPublished={Boolean(eventData?.isPublished)}
          initialData={{
            templateId: eventData?.templateId,
            visualCustomization: eventData?.visualCustomization || undefined,
          }}
          onSaveTemplate={handleSaveStep5}
          onPublishEvent={handlePublishEvent}
          onBack={() => setCurrentStep(4)}
          isSaving={isSaving}
          isPublishing={isPublishing}
        />
      )}

      {/* Modal Sukses Publikasi */}
      <Dialog
        open={showPublishSuccessModal}
        onOpenChange={setShowPublishSuccessModal}
      >
        <DialogContent className="sm:max-w-md text-center sm:text-left">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 sm:mx-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="text-xl font-serif">
              Selamat! Undangan Berhasil Dipublikasikan
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              Undangan pernikahan Anda kini aktif dan siap disebarkan ke seluruh tamu undangan. Tautan telah dikunci permanen.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
            <span className="text-muted-foreground block mb-1">Tautan Publik Undangan:</span>
            <div className="font-mono font-bold text-primary text-sm flex items-center justify-between">
              <span>inveeta.com/{eventData?.slug}</span>
              <a
                href={`http://localhost:3001/${eventData?.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline hover:text-primary/80 inline-flex items-center gap-1"
              >
                <span>Buka</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPublishSuccessModal(false);
                navigate('/dashboard');
              }}
            >
              Kembali ke Dashboard
            </Button>
            <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <a
                href={`http://localhost:3001/${eventData?.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Lihat Tampilan Tamu</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
