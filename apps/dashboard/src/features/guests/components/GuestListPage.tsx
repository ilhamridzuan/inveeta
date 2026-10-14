import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Check,
  Copy,
  Edit,
  Trash2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageCircle,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveEvent } from '@/hooks/useActiveEvent';
import { EventSelector } from '@/components/EventSelector';
import {
  useGuestsQuery,
  useEventDetailQuery,
  type GuestFilters,
} from '../api/useGuests';
import { GuestFormModal } from './GuestFormModal';
import { ManualOverrideModal } from './ManualOverrideModal';
import { DeleteGuestDialog } from './DeleteGuestDialog';
import { WaTemplateEditorModal, getGuestWaLink } from '@/features/whatsapp';
import { ExportButtons } from '@/features/analytics';
import type { ManageGuestItemDTO } from '@inveeta/shared';

function getCategoryBadgeClass(category: string): string {
  const cat = category.toLowerCase();
  if (cat === 'vip') {
    return 'border-purple-200/60 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300';
  }
  if (cat === 'keluarga' || cat === 'family') {
    return 'border-sky-200/60 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
  }
  return 'border-transparent bg-secondary text-secondary-foreground';
}

function renderRsvpStatusBadge(guest: ManageGuestItemDTO) {
  const hasAttending = guest.rsvps.some((r) => r.status === 'attending');
  const hasDeclined = guest.rsvps.some((r) => r.status === 'declined');
  const totalActualPax = guest.rsvps.reduce(
    (sum, r) => sum + (r.status === 'attending' ? r.actualPax : 0),
    0
  );

  let statusBadge: React.ReactNode;
  if (hasAttending) {
    statusBadge = <Badge variant="success">● Hadir ({totalActualPax} pax)</Badge>;
  } else if (hasDeclined) {
    statusBadge = <Badge variant="destructive">✕ Tidak Hadir</Badge>;
  } else {
    statusBadge = <Badge variant="warning">○ Belum Konfirmasi</Badge>;
  }

  const isOverridden = guest.rsvps.some((r) => r.isManualOverride);

  return (
    <div className="space-y-1">
      {statusBadge}
      {isOverridden && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <Lock className="h-3 w-3" />
          <span>Override Host</span>
        </div>
      )}
    </div>
  );
}

export const GuestListPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeEventId, myEvents, activeEvent } = useActiveEvent();

  // 1. Fetch event detail (for sessions list)
  const { data: eventDetail } = useEventDetailQuery(activeEventId);

  // 2. Filters state
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'declined' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const filters: GuestFilters = useMemo(() => {
    return {
      search: searchInput.trim() || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      rsvpStatus: statusFilter !== 'all' ? statusFilter : undefined,
      page: currentPage,
      limit: pageSize,
    };
  }, [searchInput, categoryFilter, statusFilter, currentPage, pageSize]);

  // 3. Fetch guests list
  const {
    data: guestsData,
    isLoading: isLoadingGuests,
    isFetching: isFetchingGuests,
    error: guestsError,
  } = useGuestsQuery(activeEventId, filters);

  // 4. Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<ManageGuestItemDTO | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [guestToOverride, setGuestToOverride] = useState<ManageGuestItemDTO | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<ManageGuestItemDTO | null>(null);

  const [isWaTemplateModalOpen, setIsWaTemplateModalOpen] = useState(false);
  const [isGeneratingWa, setIsGeneratingWa] = useState<string | null>(null);

  // Copy feedback state
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  const handleCopyLink = async (guest: ManageGuestItemDTO) => {
    try {
      await navigator.clipboard.writeText(guest.invitationUrl);
      setCopiedGuestId(guest.id);
      setTimeout(() => setCopiedGuestId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSendWhatsApp = async (guest: ManageGuestItemDTO) => {
    if (!activeEventId || !guest.phoneNumber) return;
    setIsGeneratingWa(guest.id);
    try {
      const waData = await getGuestWaLink(activeEventId, guest.id);
      window.open(waData.encodedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback direct wa.me link
      const cleanPhone = guest.phoneNumber.replace(/\D/g, '');
      const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Kepada Yth. ${guest.name},\n\nKami mengundang Anda untuk hadir di acara kami. Silakan buka tautan undangan berikut: ${guest.invitationUrl}`
      )}`;
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsGeneratingWa(null);
    }
  };

  const handleOpenCreateModal = () => {
    setGuestToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (guest: ManageGuestItemDTO) => {
    setGuestToEdit(guest);
    setIsFormModalOpen(true);
  };

  const handleOpenOverrideModal = (guest: ManageGuestItemDTO) => {
    setGuestToOverride(guest);
    setIsOverrideModalOpen(true);
  };

  const handleOpenDeleteDialog = (guest: ManageGuestItemDTO) => {
    setGuestToDelete(guest);
    setIsDeleteDialogOpen(true);
  };

  const handleEventSwitch = (newEventId: string) => {
    setCurrentPage(1);
    navigate(`/events/${newEventId}/guests`);
  };

  // Available sessions for allocation
  const availableSessions = useMemo(() => {
    if (!eventDetail?.sessions) return [];
    return eventDetail.sessions.map((s) => ({
      id: s.id,
      title: s.title,
      startTime: s.startTime,
      locationName: s.locationName,
    }));
  }, [eventDetail]);

  const renderTableContent = () => {
    if (isLoadingGuests) {
      return (
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          ))}
        </div>
      );
    }

    if (guestsError) {
      return (
        <div className="p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive/80" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            Gagal Memuat Data Tamu
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {guestsError instanceof Error ? guestsError.message : 'Silakan coba beberapa saat lagi.'}
          </p>
        </div>
      );
    }

    if (!guestsData || guestsData.items.length === 0) {
      const isFiltered = Boolean(searchInput || statusFilter !== 'all' || categoryFilter !== 'all');
      return (
        <div className="p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-foreground font-serif">
            Belum Ada Tamu Ditemukan
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {isFiltered
              ? 'Tidak ada tamu yang cocok dengan filter pencarian yang Anda pilih.'
              : 'Mulai daftarkan tamu undangan pertama Anda untuk acara ini.'}
          </p>
          {!isFiltered && (
            <div className="mt-4">
              <Button onClick={handleOpenCreateModal} size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Tamu Pertama
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border/80 bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3.5">Nama & Kontak Tamu</th>
              <th className="px-4 py-3.5">Kategori</th>
              <th className="px-4 py-3.5">Sesi Alokasi</th>
              <th className="px-4 py-3.5 text-center">Kuota Pax</th>
              <th className="px-4 py-3.5">Status RSVP</th>
              <th className="px-4 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {guestsData.items.map((guest) => {
              const initials =
                guest.name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('') || 'G';

              const categoryVariant = getCategoryBadgeClass(guest.category);

              return (
                <tr key={guest.id} className="transition-colors hover:bg-secondary/20">
                  {/* Guest Name & Phone */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                        {initials}
                      </div>
                      <div>
                        <div className="font-medium text-foreground line-clamp-1">
                          {guest.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {guest.phoneNumber ? (
                            <span className="font-mono">{guest.phoneNumber}</span>
                          ) : (
                            <span className="italic text-muted-foreground/60">Tanpa nomor WA</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Badge variant="outline" className={`font-medium ${categoryVariant}`}>
                      {guest.category}
                    </Badge>
                  </td>

                  {/* Sessions */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {guest.allocatedSessions.length > 0 ? (
                        guest.allocatedSessions.map((alloc) => (
                          <span
                            key={alloc.sessionId}
                            className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] text-foreground font-medium"
                          >
                            {alloc.sessionTitle}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">
                          Belum ada sesi
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Max Pax */}
                  <td className="px-4 py-3.5 text-center font-semibold text-foreground">
                    {guest.maxPax}
                  </td>

                  {/* RSVP Status */}
                  <td className="px-4 py-3.5">
                    {renderRsvpStatusBadge(guest)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      {/* Copy Link Button */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleCopyLink(guest)}
                        title="Salin tautan undangan personal"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        {copiedGuestId === guest.id ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      {/* WhatsApp Link button */}
                      {guest.phoneNumber && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSendWhatsApp(guest)}
                          disabled={isGeneratingWa === guest.id}
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="Kirim pesan WhatsApp"
                        >
                          {isGeneratingWa === guest.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                          ) : (
                            <MessageCircle className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      {/* Manual Override Button */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenOverrideModal(guest)}
                        title="Manual override kehadiran RSVP"
                        className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>

                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEditModal(guest)}
                        title="Edit data tamu"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenDeleteDialog(guest)}
                        title="Hapus tamu"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Event Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Manajemen Tamu</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-serif">
            Daftar Tamu Undangan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur kuota pax, alokasikan sesi acara, dan lakukan konfirmasi kehadiran tamu secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <EventSelector
            events={myEvents}
            activeEventId={activeEventId}
            onSelectEvent={handleEventSwitch}
          />

          <Button
            onClick={handleOpenCreateModal}
            disabled={!activeEventId}
            size="default"
            className="shadow-xs font-semibold gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Tamu</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsWaTemplateModalOpen(true)}
            disabled={!activeEventId}
            size="default"
            className="shadow-xs gap-1.5 hidden sm:inline-flex"
            title="Kelola Template Pesan WhatsApp"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Template WA</span>
          </Button>

          {activeEventId && (
            <ExportButtons eventId={activeEventId} size="default" />
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/80 shadow-2xs p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau nomor WhatsApp tamu..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background/50 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Tabs */}
            <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-card text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('attending');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === 'attending'
                    ? 'bg-card text-emerald-600 font-semibold shadow-2xs dark:text-emerald-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Hadir
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('declined');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === 'declined'
                    ? 'bg-card text-destructive font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tidak Hadir
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('pending');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === 'pending'
                    ? 'bg-card text-amber-600 font-semibold shadow-2xs dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={categoryFilter}
                aria-label="Filter Kategori"
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Semua Kategori</option>
                <option value="vip">VIP</option>
                <option value="keluarga">Keluarga</option>
                <option value="reguler">Reguler</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Guest Table Card */}
      <Card className="border-border/80 shadow-2xs overflow-hidden">
        {renderTableContent()}

        {/* Pagination Bar */}
        {guestsData && guestsData.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-4 py-3 text-xs text-muted-foreground">
            <div>
              Menampilkan{' '}
              <strong className="text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              -{' '}
              <strong className="text-foreground">
                {Math.min(currentPage * pageSize, guestsData.total)}
              </strong>{' '}
              dari <strong className="text-foreground">{guestsData.total}</strong> tamu
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isFetchingGuests}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Sebelumnya
              </Button>

              <span className="px-2 font-medium text-foreground">
                Hal {currentPage} dari {guestsData.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(guestsData.totalPages, p + 1))}
                disabled={currentPage >= guestsData.totalPages || isFetchingGuests}
                className="h-8 px-2 text-xs"
              >
                Berikutnya
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals & Dialogs */}
      {activeEventId && (
        <>
          <GuestFormModal
            open={isFormModalOpen}
            onOpenChange={setIsFormModalOpen}
            eventId={activeEventId}
            guestToEdit={guestToEdit}
            availableSessions={availableSessions}
          />

          <ManualOverrideModal
            open={isOverrideModalOpen}
            onOpenChange={setIsOverrideModalOpen}
            eventId={activeEventId}
            guest={guestToOverride}
          />

          <DeleteGuestDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            eventId={activeEventId}
            guest={guestToDelete}
          />

          <WaTemplateEditorModal
            open={isWaTemplateModalOpen}
            onOpenChange={setIsWaTemplateModalOpen}
            eventId={activeEventId}
            eventTitle={activeEvent?.title}
            eventSlug={activeEvent?.slug}
            eventDate={activeEvent?.eventDate}
          />
        </>
      )}
    </div>
  );
};
