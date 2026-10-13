import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const WizardPage: React.FC = () => {
  const steps = [
    { num: 1, title: 'Informasi Dasar', desc: 'Judul acara, slug URL kustom, zona waktu IANA & batas RSVP' },
    { num: 2, title: 'Sesi Acara & Lokasi', desc: 'Akad/Pemberkatan & Resepsi dengan URL Google Maps' },
    { num: 3, title: 'Biodata Pasangan', desc: 'Profil pengantin pria dan wanita beserta nama orang tua' },
    { num: 4, title: 'Amplop & Media R2', desc: 'No. rekening digital & kompresi foto Canvas WebP (<600KB)' },
    { num: 5, title: 'Tema & Publikasi', desc: 'Pilihan template undangan & live preview status' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
        </Button>
        <Badge variant="outline" className="text-xs">
          Task M1.5 Preview
        </Badge>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-serif">
            Wizard Pembuatan Undangan 5 Langkah
          </CardTitle>
          <CardDescription className="max-w-md mx-auto text-sm">
            Alur formulir interaktif multi-langkah untuk menyusun setiap aspek undangan pernikahan digital Anda secara menyeluruh.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-6 space-y-4">
          <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card">
            {steps.map((s) => (
              <div
                key={s.num}
                className="flex items-center justify-between p-4 transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-semibold tabular-nums text-foreground">
                    {s.num}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      {s.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary/90 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Komponen form terpadu untuk 5 langkah ini akan diaktifkan secara interaktif pada <strong>Task M1.5</strong> sesuai arsitektur TDD.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
