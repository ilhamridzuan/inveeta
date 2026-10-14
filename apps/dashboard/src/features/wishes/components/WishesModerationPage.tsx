import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useManageWishesQuery,
  useToggleWishVisibilityMutation,
  type WishFilters,
} from '../api/useWishes';
import { DeleteWishDialog } from './DeleteWishDialog';
import type { ManageWishItemDTO } from '@inveeta/shared';

export const WishesModerationPage: React.FC = () => {
  const { eventId: routeEventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();

  // 1. Fetch host's events list if route doesn't specify
  const { data: myEvents } = useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const res = await apiClient.api.v1.manage.events.mine.$get();
      if (!res.ok) throw new Error('Gagal mengambil daftar acara');
      const json = await res.json();
      return json.data;
    },
  });

  const activeEventId = useMemo(() => {
    if (routeEventId) return routeEventId;
    if (myEvents && myEvents.length > 0) return myEvents[0]?.id;
    return undefined;
  }, [routeEventId, myEvents]);

  // 2. Filters state
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const filters: WishFilters = useMemo(() => {
    return {
      status: statusFilter,
      page: currentPage,
      limit: pageSize,
    };
  }, [statusFilter, currentPage, pageSize]);

  // 3. Fetch wishes
  const {
    data: wishesData,
    isLoading: isLoadingWishes,
    isFetching: isFetchingWishes,
    error: wishesError,
  } = useManageWishesQuery(activeEventId, filters);

  const toggleMutation = useToggleWishVisibilityMutation();

  // 4. Modal state for delete
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [wishToDelete, setWishToDelete] = useState<ManageWishItemDTO | null>(null);

  const handleToggleVisibility = async (wish: ManageWishItemDTO) => {
    if (!activeEventId) return;
    try {
      await toggleMutation.mutateAsync({
        eventId: activeEventId,
        wishId: wish.id,
        isHidden: !wish.isHidden,
      });
    } catch (err) {
      console.error('Gagal mengubah visibilitas ucapan:', err);
    }
  };

  const handleOpenDeleteDialog = (wish: ManageWishItemDTO) => {
    setWishToDelete(wish);
    setIsDeleteDialogOpen(true);
  };

  const handleEventSwitch = (newEventId: string) => {
    setCurrentPage(1);
    navigate(`/events/${newEventId}/wishes`);
  };

  const activeEvent = myEvents?.find((e) => e.id === activeEventId);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Buku Ucapan & Doa</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-serif">
            Moderasi Buku Ucapan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola ucapan dan doa yang masuk dari tamu undangan. Anda dapat menyembunyikan pesan yang tidak pantas atau menghapusnya.
          </p>
        </div>

        {myEvents && myEvents.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden md:inline">
              Acara:
            </span>
            <select
              className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={activeEventId || ''}
              onChange={(e) => handleEventSwitch(e.target.value)}
            >
              {myEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.slug})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter Tabs Bar */}
      <Card className="border-border/80 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-lg border border-border/80 bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`rounded-md px-3.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua Ucapan
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('visible');
                setCurrentPage(1);
              }}
              className={`rounded-md px-3.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'visible'
                  ? 'bg-card text-emerald-600 font-semibold shadow-2xs dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ditampilkan (Aktif)
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('hidden');
                setCurrentPage(1);
              }}
              className={`rounded-md px-3.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === 'hidden'
                  ? 'bg-card text-amber-600 font-semibold shadow-2xs dark:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Disembunyikan (Hidden)
            </button>
          </div>

          {activeEvent && (
            <div className="text-xs text-muted-foreground">
              Acara: <strong className="text-foreground">{activeEvent.title}</strong>
            </div>
          )}
        </div>
      </Card>

      {/* Table Card */}
      <Card className="border-border/80 shadow-2xs overflow-hidden">
        {isLoadingWishes ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
                <div className="space-y-2 flex-1 max-w-sm">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-48 rounded-md" />
                </div>
                <Skeleton className="h-4 w-64 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            ))}
          </div>
        ) : wishesError ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive/80" />
            <h3 className="mt-3 text-base font-semibold text-foreground">
              Gagal Memuat Ucapan Tamu
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {wishesError instanceof Error ? wishesError.message : 'Silakan coba beberapa saat lagi.'}
            </p>
          </div>
        ) : !wishesData || wishesData.items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-foreground font-serif">
              Belum Ada Ucapan Masuk
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              {statusFilter !== 'all'
                ? 'Tidak ada ucapan yang cocok dengan filter status yang dipilih.'
                : 'Ucapan dan doa dari para tamu undangan yang telah mengisi form akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/80 bg-secondary/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5">Nama & Hubungan</th>
                  <th className="px-4 py-3.5">Pesan Ucapan & Doa</th>
                  <th className="px-4 py-3.5">Waktu Kirim</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {wishesData.items.map((wish) => {
                  const initials = wish.senderName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join('') || 'U';

                  return (
                    <tr
                      key={wish.id}
                      className={`transition-colors hover:bg-secondary/20 ${
                        wish.isHidden ? 'bg-muted/30 opacity-75' : ''
                      }`}
                    >
                      {/* Sender Name & Relation */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground mt-0.5">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {wish.senderName}
                            </div>
                            {wish.senderRelation ? (
                              <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                                {wish.senderRelation}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic">
                                Tamu Undangan
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Message Content */}
                      <td className="px-4 py-3.5 align-top max-w-md">
                        <p className="text-xs text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
                          {wish.message}
                        </p>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 align-top text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {new Date(wish.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        {wish.isHidden ? (
                          <Badge variant="warning" className="gap-1 text-[11px]">
                            <EyeOff className="h-3 w-3" />
                            Disembunyikan
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1 text-[11px]">
                            <CheckCircle2 className="h-3 w-3" />
                            Ditampilkan
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Toggle Soft Moderation Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVisibility(wish)}
                            disabled={toggleMutation.isPending}
                            title={
                              wish.isHidden
                                ? 'Tampilkan kembali ucapan ini di web publik'
                                : 'Sembunyikan ucapan ini dari web publik'
                            }
                            className="h-8 gap-1.5 text-xs font-medium"
                          >
                            {wish.isHidden ? (
                              <>
                                <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Tampilkan</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                                <span>Sembunyikan</span>
                              </>
                            )}
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenDeleteDialog(wish)}
                            title="Hapus ucapan permanen"
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
        )}

        {/* Pagination Bar */}
        {wishesData && wishesData.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/80 px-4 py-3 text-xs text-muted-foreground">
            <div>
              Menampilkan{' '}
              <strong className="text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </strong>{' '}
              -{' '}
              <strong className="text-foreground">
                {Math.min(currentPage * pageSize, wishesData.total)}
              </strong>{' '}
              dari <strong className="text-foreground">{wishesData.total}</strong> ucapan
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isFetchingWishes}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Sebelumnya
              </Button>

              <span className="px-2 font-medium text-foreground">
                Hal {currentPage} dari {wishesData.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(wishesData.totalPages, p + 1))}
                disabled={currentPage >= wishesData.totalPages || isFetchingWishes}
                className="h-8 px-2 text-xs"
              >
                Berikutnya
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Wish Dialog */}
      {activeEventId && (
        <DeleteWishDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          eventId={activeEventId}
          wish={wishToDelete}
        />
      )}
    </div>
  );
};
