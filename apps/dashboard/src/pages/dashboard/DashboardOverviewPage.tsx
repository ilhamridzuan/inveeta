import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Calendar,
  ExternalLink,
  Globe,
  Clock,
  Sparkles,
  CalendarCheck,
  FileEdit,
  Layers,
  Users,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const DashboardOverviewPage: React.FC = () => {
  const { data: eventsList, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const res = await apiClient.api.v1.manage.events.mine.$get();
      if (!res.ok) throw new Error('Gagal mengambil daftar acara');
      const json = await res.json();
      return json.data;
    },
  });

  const totalEvents = eventsList?.length || 0;
  const publishedEvents =
    eventsList?.filter((evt) => evt.isPublished).length || 0;
  const draftEvents = totalEvents - publishedEvents;

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-serif">
            Daftar Acara Saya
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola formulir wizard, pantau kuota tamu, dan atur detail undangan pernikahan digital Anda.
          </p>
        </div>
        <div>
          <Button asChild size="default" className="shadow-xs font-semibold">
            <Link to="/wizard">
              <Plus className="h-4 w-4 mr-1.5" />
              <span>Buat Undangan Baru</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Acara
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">
            {isLoading ? <Skeleton className="h-8 w-12 rounded-md" /> : totalEvents}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Seluruh undangan yang terdaftar
          </p>
        </Card>

        <Card className="border-border/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Publikasi Aktif
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">
            {isLoading ? <Skeleton className="h-8 w-12 rounded-md" /> : publishedEvents}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dapat diakses langsung oleh tamu
          </p>
        </Card>

        <Card className="border-border/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Draft Formulir
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">
            {isLoading ? <Skeleton className="h-8 w-12 rounded-md" /> : draftEvents}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sedang dalam proses penyusunan
          </p>
        </Card>
      </div>

      {/* Events Grid / Empty State / Structural Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <Card key={key} className="p-6 space-y-5 border-border/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && eventsList && eventsList.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {eventsList.map((evt) => (
            <Card
              key={evt.id}
              className="flex flex-col justify-between border-border/80 shadow-2xs transition-shadow hover:shadow-md"
            >
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-center justify-between gap-2">
                  {evt.isPublished ? (
                    <Badge variant="success">● Publikasi Aktif</Badge>
                  ) : (
                    <Badge variant="warning">○ Draft Formulir</Badge>
                  )}
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Tpl: {evt.templateId}
                  </span>
                </div>

                <div>
                  <CardTitle className="text-lg line-clamp-1 leading-snug">
                    {evt.title}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1.5 text-xs">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono text-muted-foreground/90 line-clamp-1">
                      /{evt.slug}
                    </span>
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {evt.eventDate ? (
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-foreground/80">
                    <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="tabular-nums font-medium">
                      {new Date(evt.eventDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span>Jadwal tanggal belum diatur</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
                    <Link to={`/wizard?id=${evt.id}`}>
                      <FileEdit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
                    <Link to={`/events/${evt.id}/guests`}>
                      <Users className="h-3.5 w-3.5" />
                      <span>Tamu</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
                    <Link to={`/events/${evt.id}/wishes`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Ucapan</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
                    <Link to={`/events/${evt.id}/analytics`}>
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Analitik</span>
                    </Link>
                  </Button>
                </div>

                {evt.isPublished ? (
                  <Button asChild variant="ghost" size="sm" className="gap-1.5 text-primary">
                    <a
                      href={`http://localhost:3001/${evt.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Buka halaman undangan publik"
                    >
                      <span>Lihat Web</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Belum dipublikasikan
                  </span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!eventsList || eventsList.length === 0) && (
        /* Empty State */
        <Card className="border-dashed border-border/90 bg-card/50 p-12 text-center shadow-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground font-serif">
            Belum Ada Undangan Pernikahan
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
            Mulai susun undangan digital pertama Anda. Tentukan jadwal acara, upload foto calon mempelai, dan kelola alokasi kuota tamu dengan mudah.
          </p>
          <div className="mt-6">
            <Button asChild size="default" className="shadow-xs font-semibold">
              <Link to="/wizard">
                <Plus className="h-4 w-4 mr-1.5" />
                <span>Buat Undangan Pertama</span>
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
