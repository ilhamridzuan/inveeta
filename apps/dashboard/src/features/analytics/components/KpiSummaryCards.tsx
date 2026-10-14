import {
  Users,
  UserCheck,
  UserX,
  Clock,
  MessageSquare,
  Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { EventDashboardMetricsDTO } from '@inveeta/shared';

interface KpiSummaryCardsProps {
  metrics?: EventDashboardMetricsDTO;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  lastEventAt?: Date | null;
}

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({
  metrics,
  isLoading,
  isRealtimeConnected,
  lastEventAt,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4 space-y-2 border-border/80 shadow-2xs">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-7 w-14 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </Card>
        ))}
      </div>
    );
  }

  const totalGuests = metrics?.totalGuestsInvited || 0;
  const totalPax = metrics?.totalPaxAllocated || 0;
  const attendingPax = metrics?.rsvpSummary.totalActualPax || 0;
  const attendingCount = metrics?.rsvpSummary.attendingCount || 0;
  const declinedCount = metrics?.rsvpSummary.declinedCount || 0;
  const pendingCount = metrics?.rsvpSummary.pendingCount || 0;
  const totalWishes = metrics?.totalWishesReceived || 0;

  return (
    <div className="space-y-3">
      {/* Realtime Status Indicator Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {isRealtimeConnected ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Realtime KPI Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              Menyambungkan Realtime SSE...
            </span>
          )}
          {lastEventAt && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              (Update terakhir: {lastEventAt.toLocaleTimeString('id-ID')})
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* 1. Total Tamu */}
        <Card className="border-border/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Total Tamu
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {totalGuests}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Nama tamu diundang
          </p>
        </Card>

        {/* 2. Total Kuota Pax */}
        <Card className="border-border/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Kuota Pax
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {totalPax}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Kapasitas dialokasikan
          </p>
        </Card>

        {/* 3. Pax Hadir */}
        <Card className="border-border/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pax Hadir
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {attendingPax}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Dari {attendingCount} konfirmasi
          </p>
        </Card>

        {/* 4. Tidak Hadir */}
        <Card className="border-border/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-destructive">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Tidak Hadir
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
              <UserX className="h-3.5 w-3.5 text-destructive" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-destructive">
            {declinedCount}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Menolak undangan
          </p>
        </Card>

        {/* 5. Belum Konfirmasi */}
        <Card className="border-border/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Pending
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Belum konfirmasi RSVP
          </p>
        </Card>

        {/* 6. Total Ucapan */}
        <Card className="border-border/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-primary">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Buku Ucapan
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {totalWishes}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Doa & pesan diterima
          </p>
        </Card>
      </div>
    </div>
  );
};
