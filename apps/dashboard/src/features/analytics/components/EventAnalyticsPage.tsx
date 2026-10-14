import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useActiveEvent } from '@/hooks/useActiveEvent';
import { EventSelector } from '@/components/EventSelector';
import { useEventMetricsQuery } from '../api/useMetrics';
import { useDashboardRealtime } from '../api/useDashboardRealtime';
import { KpiSummaryCards } from './KpiSummaryCards';
import { SessionAttendanceBreakdown } from './SessionAttendanceBreakdown';
import { ExportButtons } from './ExportButtons';

export const EventAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeEventId, myEvents } = useActiveEvent();

  // 1. Fetch event metrics
  const {
    data: metricsData,
    isLoading: isLoadingMetrics,
    error: metricsError,
  } = useEventMetricsQuery(activeEventId);

  // 2. Connect to Realtime SSE
  const { isConnected, lastEventAt } = useDashboardRealtime(activeEventId);

  const handleEventSwitch = (newEventId: string) => {
    navigate(`/events/${newEventId}/analytics`);
  };

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
            <span className="text-foreground font-medium">Statistik & Realtime KPI</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-serif">
            Analitik & Laporan Kehadiran
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau metrik kehadiran tamu, kapasitas kuota per sesi acara, dan unduh rekap data secara realtime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EventSelector
            events={myEvents}
            activeEventId={activeEventId}
            onSelectEvent={handleEventSwitch}
          />

          {activeEventId && (
            <ExportButtons eventId={activeEventId} size="default" />
          )}
        </div>
      </div>

      {metricsError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h3 className="mt-2 text-base font-semibold text-foreground">
            Gagal Memuat Metrik Acara
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {metricsError instanceof Error ? metricsError.message : 'Silakan coba beberapa saat lagi.'}
          </p>
        </Card>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <KpiSummaryCards
            metrics={metricsData}
            isLoading={isLoadingMetrics}
            isRealtimeConnected={isConnected}
            lastEventAt={lastEventAt}
          />

          {/* Session Attendance Breakdown */}
          <SessionAttendanceBreakdown
            sessions={metricsData?.sessionBreakdown}
            isLoading={isLoadingMetrics}
          />

          {/* Quick Navigations Cards */}
          {activeEventId && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <Card className="border-border/80 p-5 shadow-2xs flex items-center justify-between transition-all hover:shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Kelola Tamu & RSVP
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Lihat alokasi sesi, status RSVP, dan bagikan tautan via WhatsApp.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0 ml-3">
                  <Link to={`/events/${activeEventId}/guests`}>
                    <span>Buka Tamu</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Card>

              <Card className="border-border/80 p-5 shadow-2xs flex items-center justify-between transition-all hover:shadow-md">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Moderasi Buku Ucapan
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Tinjau pesan dan doa dari para tamu serta sembunyikan jika perlu.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0 ml-3">
                  <Link to={`/events/${activeEventId}/wishes`}>
                    <span>Buka Ucapan</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
