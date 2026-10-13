import React, { useState, useRef } from 'react';
import {
  Gift,
  CreditCard,
  Plus,
  Trash2,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Music,
  QrCode,
  Sparkles,
} from 'lucide-react';
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
import { compressImage } from '@/utils/imageCompressor';
import { uploadMediaFile } from '@/services/mediaUpload';
import type {
  WizardStep4Input,
  WizardBankAccountItem,
  WizardGalleryPhotoItem,
} from '@inveeta/shared';

interface Step4Props {
  eventId: string;
  initialData: Partial<WizardStep4Input>;
  onSaveAndNext: (data: WizardStep4Input) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

interface LocalBankAccountItem extends WizardBankAccountItem {
  _clientId: string;
}

export const Step4GiftsMedia: React.FC<Step4Props> = ({
  eventId,
  initialData,
  onSaveAndNext,
  onBack,
  isSaving,
}) => {
  const [bankAccounts, setBankAccounts] = useState<LocalBankAccountItem[]>(() => {
    const raw = initialData.bankAccounts || [
      {
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountHolder: 'Rama Wijaya',
        sortOrder: 0,
      },
    ];
    return raw.map((item, idx) => ({
      ...item,
      _clientId: `bank_${idx}_${Date.now()}`,
    }));
  });
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(
    initialData.qrisImageUrl || null
  );
  const [giftAddress, setGiftAddress] = useState<string>(
    initialData.giftAddress || ''
  );
  const [giftRecipientName, setGiftRecipientName] = useState<string>(
    initialData.giftRecipientName || ''
  );
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(
    initialData.coverPhotoUrl || null
  );
  const [bgMusicUrl, setBgMusicUrl] = useState<string>(
    initialData.bgMusicUrl || ''
  );
  const [galleryPhotos, setGalleryPhotos] = useState<WizardGalleryPhotoItem[]>(
    initialData.galleryPhotos || []
  );

  // Upload status states
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverCompressInfo, setCoverCompressInfo] = useState<string | null>(null);
  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const qrisInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Bank Accounts Handler
  const handleAddBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        _clientId: `bank_${Date.now()}_${crypto.randomUUID()}`,
        bankName: 'Mandiri',
        accountNumber: '',
        accountHolder: '',
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRemoveBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  const handleUpdateBankAccount = (
    index: number,
    field: keyof WizardBankAccountItem,
    value: string
  ) => {
    const updated = [...bankAccounts];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setBankAccounts(updated);
  };

  // Cover Photo Upload (with Canvas WebP compressor)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!eventId) {
      setUploadError(
        'ID acara belum dibuat. Harap isi dan simpan Informasi Dasar di Langkah 1 terlebih dahulu.'
      );
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    setIsUploadingCover(true);
    setUploadError(null);
    setCoverCompressInfo(null);

    try {
      // 1. Kompresi gambar via Canvas API
      const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.85 });
      const origKb = Math.round(compressed.originalSize / 1024);
      const newKb = Math.round(compressed.fileSize / 1024);
      setCoverCompressInfo(`${origKb} KB → ${newKb} KB (Hemat ${compressed.compressionRatio}%)`);

      // 2. Upload R2 via Presigned Flow (Jebakan 3: Content-Type identik)
      const res = await uploadMediaFile({
        eventId,
        blobOrFile: compressed.blob,
        fileName: compressed.fileName,
        mediaType: 'photo',
        mimeType: compressed.mimeType,
        slotIdentifier: 'cover',
      });

      setCoverPhotoUrl(res.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal mengunggah foto cover'
      );
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // QRIS Image Upload
  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!eventId) {
      setUploadError(
        'ID acara belum dibuat. Harap isi dan simpan Informasi Dasar di Langkah 1 terlebih dahulu.'
      );
      if (qrisInputRef.current) qrisInputRef.current.value = '';
      return;
    }

    setIsUploadingQris(true);
    setUploadError(null);

    try {
      const compressed = await compressImage(file, { maxWidth: 1000, quality: 0.85 });
      const res = await uploadMediaFile({
        eventId,
        blobOrFile: compressed.blob,
        fileName: compressed.fileName,
        mediaType: 'qris',
        mimeType: compressed.mimeType,
        slotIdentifier: 'qris',
      });

      setQrisImageUrl(res.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal mengunggah gambar QRIS'
      );
    } finally {
      setIsUploadingQris(false);
      if (qrisInputRef.current) qrisInputRef.current.value = '';
    }
  };

  // Gallery Photos Upload (batch compressor)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    if (fileList.length === 0) return;

    if (!eventId) {
      setUploadError(
        'ID acara belum dibuat. Harap isi dan simpan Informasi Dasar di Langkah 1 terlebih dahulu.'
      );
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      return;
    }

    setIsUploadingGallery(true);
    setUploadError(null);

    try {
      const validFiles = fileList.filter((file) => file.type.startsWith('image/'));
      const startIndex = galleryPhotos.length;
      const newPhotos: WizardGalleryPhotoItem[] = await Promise.all(
        validFiles.map(async (file, i) => {
          const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.85 });
          const res = await uploadMediaFile({
            eventId,
            blobOrFile: compressed.blob,
            fileName: compressed.fileName,
            mediaType: 'photo',
            mimeType: compressed.mimeType,
            slotIdentifier: `gallery_${Date.now()}_${i}`,
            sortOrder: startIndex + i,
          });

          return {
            fileUrl: res.publicUrl,
            slotIdentifier: res.slotIdentifier || null,
            sortOrder: startIndex + i,
          };
        })
      );

      setGalleryPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal mengunggah foto galeri'
      );
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    setGalleryPhotos(galleryPhotos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAndNext({
      bankAccounts: bankAccounts.map(({ _clientId, ...item }) => item),
      qrisImageUrl: qrisImageUrl || null,
      giftAddress: giftAddress || null,
      giftRecipientName: giftRecipientName || null,
      coverPhotoUrl: coverPhotoUrl || null,
      bgMusicUrl: bgMusicUrl || null,
      galleryPhotos,
    });
  };

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
          <Gift className="h-4 w-4" />
          <span>Langkah 4 dari 5</span>
        </div>
        <CardTitle className="text-xl sm:text-2xl font-serif">
          Amplop Digital, Kado Fisik & Media Foto
        </CardTitle>
        <CardDescription>
          Atur rekening transfer hadiah digital, gambar QRIS, foto cover terkompresi Canvas, dan galeri foto kenangan pernikahan.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-8">
          {uploadError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
              {uploadError}
            </div>
          )}

          {/* Section Rekening Bank & E-Wallet */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Rekening Bank & E-Wallet (Amplop Digital)
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBankAccount}
                disabled={isSaving}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Rekening</span>
              </Button>
            </div>

            <div className="space-y-3">
              {bankAccounts.map((bank, idx) => (
                <div
                  key={bank._clientId}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-xl border border-border/70 bg-secondary/30 items-center"
                >
                  <div className="sm:col-span-3">
                    <Label className="text-[11px] text-muted-foreground">Bank / E-Wallet</Label>
                    <Input
                      value={bank.bankName}
                      onChange={(e) =>
                        handleUpdateBankAccount(idx, 'bankName', e.target.value)
                      }
                      placeholder="BCA / Mandiri / GoPay"
                      className="text-xs h-9 mt-1"
                      required
                      disabled={isSaving}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Label className="text-[11px] text-muted-foreground">No. Rekening</Label>
                    <Input
                      value={bank.accountNumber}
                      onChange={(e) =>
                        handleUpdateBankAccount(idx, 'accountNumber', e.target.value)
                      }
                      placeholder="Nomor rekening"
                      className="text-xs font-mono h-9 mt-1"
                      required
                      disabled={isSaving}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Label className="text-[11px] text-muted-foreground">Nama Penerima</Label>
                    <Input
                      value={bank.accountHolder}
                      onChange={(e) =>
                        handleUpdateBankAccount(idx, 'accountHolder', e.target.value)
                      }
                      placeholder="Nama di rekening"
                      className="text-xs h-9 mt-1"
                      required
                      disabled={isSaving}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveBankAccount(idx)}
                      disabled={isSaving || bankAccounts.length <= 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section QRIS & Kado Fisik */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload QRIS */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <QrCode className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Gambar QRIS (Opsional)
                </h4>
              </div>

              {qrisImageUrl ? (
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-xl border border-border overflow-hidden bg-white p-1">
                    <img
                      src={qrisImageUrl}
                      alt="QRIS Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-2">
                    <Badge variant="success" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>QRIS Terunggah</span>
                    </Badge>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => qrisInputRef.current?.click()}
                        disabled={isUploadingQris || isSaving}
                      >
                        Ganti Gambar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => qrisInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/40 transition text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <QrCode className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs font-semibold text-foreground">
                    Unggah Kode QRIS
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Format WebP/PNG otomatis dikompresi
                  </span>
                </button>
              )}

              <input
                ref={qrisInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrisUpload}
                className="hidden"
                disabled={isUploadingQris || isSaving}
              />
            </div>

            {/* Alamat Pengiriman Kado Fisik */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
                <Gift className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Alamat Pengiriman Kado Fisik
                </h4>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="giftRecipient" className="text-xs font-semibold">
                  Nama Penerima Paket
                </Label>
                <Input
                  id="giftRecipient"
                  value={giftRecipientName}
                  onChange={(e) => setGiftRecipientName(e.target.value)}
                  placeholder="Contoh: Shinta Dewi (0812xxxx)"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="giftAddress" className="text-xs font-semibold">
                  Alamat Domisili Lengkap
                </Label>
                <Input
                  id="giftAddress"
                  value={giftAddress}
                  onChange={(e) => setGiftAddress(e.target.value)}
                  placeholder="Jl. Mawar No. 12, Kel. Menteng, Jakarta Pusat"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Section Cover Foto Undangan (Canvas Compressor) */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Foto Sampul Utama (Cover Foto)
                </h4>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono">
                Maks 1920px &bull; WebP 85%
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-1">
                {coverPhotoUrl ? (
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border shadow-xs">
                    <img
                      src={coverPhotoUrl}
                      alt="Cover Foto"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-secondary/20 text-muted-foreground p-4 text-center">
                    <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                    <span className="text-xs">Belum ada cover foto</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Foto cover akan otomatis diproses oleh <strong>Canvas WebP Compressor</strong> sebelum diunggah ke storage Cloudflare R2 untuk menjaga waktu loading secepat kilat (&le; 600 KB).
                </p>

                {coverCompressInfo && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Hasil Kompresi: {coverCompressInfo}</span>
                  </div>
                )}

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={isUploadingCover || isSaving}
                    className="gap-2 text-xs"
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengompresi & Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Pilih & Unggah Foto Sampul</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
              disabled={isUploadingCover || isSaving}
            />
          </div>

          {/* Section Galeri Foto */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm text-foreground">
                  Galeri Foto Kenangan ({galleryPhotos.length} Foto)
                </h4>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploadingGallery || isSaving}
                className="gap-1.5"
              >
                {isUploadingGallery ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Foto Galeri</span>
                  </>
                )}
              </Button>
            </div>

            {galleryPhotos.length === 0 ? (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/40 transition text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-foreground">
                  Belum ada foto di galeri
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  Klik untuk memilih beberapa foto sekaligus (otomatis dikompresi ke WebP)
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryPhotos.map((photo, idx) => (
                  <div
                    key={photo.slotIdentifier || photo.fileUrl}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-black/5"
                  >
                    <img
                      src={photo.fileUrl}
                      alt={`Galeri #${idx + 1}`}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryPhoto(idx)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition hover:bg-destructive"
                      title="Hapus foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
              className="hidden"
              disabled={isUploadingGallery || isSaving}
            />
          </div>

          {/* Section Musik Latar (BGM) */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Music className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm text-foreground">
                Musik Latar Belakang (BGM URL)
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bgMusicUrl" className="text-xs font-semibold">
                Tautan File Musik (MP3 / Audio URL)
              </Label>
              <Input
                id="bgMusicUrl"
                type="url"
                value={bgMusicUrl}
                onChange={(e) => setBgMusicUrl(e.target.value)}
                placeholder="https://pub-r2.inveeta.com/audio/wedding-song.mp3"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Musik akan diputar dengan sopan saat tamu menekan tombol "Buka Undangan" (mematuhi browser autoplay policy).
              </p>
            </div>
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
            disabled={isSaving || isUploadingCover || isUploadingGallery}
            className="shadow-xs font-semibold gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <span>Lanjut ke Pilihan Template</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
