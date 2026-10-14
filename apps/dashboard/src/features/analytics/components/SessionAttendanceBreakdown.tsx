import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users } from 'lucide-react';
import type { SessionMetricBreakdown } from '@inveeta/shared';

interface SessionAttendanceBreakdownProps {
  sessions?: SessionMetricBreakdown[];
  isLoading: boolean;
}

export const SessionAttendanceBreakdown: React.FC<SessionAttendanceBreakdownProps> = ({
  sessions = [],
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="border-border/80 p-5 shadow-2xs space-y-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-border/80 p-6 text-center shadow-2xs">
        <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <h4 className="mt-2 text-sm font-semibold text-foreground">
          Belum Ada Sesi Acara
        </h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sesi acara dapat ditambahkan melalui menu formulir wizard acara.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 p-5 shadow-2xs space-y-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground font-serif">
            Distribusi Kehadiran per Sesi Acara
          </h3>
          <p className="text-xs text-muted-foreground">
            Perbandingan kapasitas kuota teralokasi dan konfirmasi kehadiran tiap sesi (Akad / Resepsi).
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {sessions.length} Sesi Terdaftar
        </Badge>
      </div>

      <div className="space-y-5">
        {sessions.map((session) => {
          const totalAllocated = session.allocatedPax || 0;
          const confirmed = session.confirmedPax || 0;
          const declined = session.declinedPax || 0;
          const pending = session.pendingPax || 0;

          const percentageConfirmed =
            totalAllocated > 0
              ? Math.min(100, Math.round((confirmed / totalAllocated) * 100))
              : 0;

          return (
            <div
              key={session.sessionId}
              className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3 transition-colors hover:bg-secondary/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">
                    {session.sessionTitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Tingkat Kehadiran:</span>
                  <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {percentageConfirmed}%
                  </span>
                  <span className="text-muted-foreground">
                    ({confirmed}/{totalAllocated} Pax)
                  </span>
                </div>
              </div>

              {/* Multi-segmented Progress Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/80 flex">
                {confirmed > 0 && totalAllocated > 0 && (
                  <div
                    style={{ width: `${(confirmed / totalAllocated) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-500"
                    title={`Hadir: ${confirmed} pax`}
                  />
                )}
                {declined > 0 && totalAllocated > 0 && (
                  <div
                    style={{ width: `${(declined / totalAllocated) * 100}%` }}
                    className="bg-destructive/80 transition-all duration-500"
                    title={`Tidak Hadir: ${declined} pax`}
                  />
                )}
                {pending > 0 && totalAllocated > 0 && (
                  <div
                    style={{ width: `${(pending / totalAllocated) * 100}%` }}
                    className="bg-amber-400/80 transition-all duration-500"
                    title={`Pending: ${pending} pax`}
                  />
                )}
              </div>

              {/* Details Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium tabular-nums">{confirmed} Pax Hadir</span>
                </div>

                <div className="flex items-center gap-1.5 text-destructive">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="font-medium tabular-nums">{declined} Pax Tidak Hadir</span>
                </div>

                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="font-medium tabular-nums">{pending} Pax Pending</span>
                </div>

                <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
                  <Users className="h-3.5 w-3.5" />
                  <span>Kapasitas: {totalAllocated} Pax</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
