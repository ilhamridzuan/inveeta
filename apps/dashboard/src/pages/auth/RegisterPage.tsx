import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, ArrowRight, User, Mail, Lock, Loader2 } from 'lucide-react';
import { signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res.error) {
        setErrorMessage(
          res.error.message || 'Pendaftaran tidak berhasil. Mohon periksa kelengkapan data.'
        );
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan jaringan saat mendaftar. Silakan coba kembali.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
            Inveeta
          </h1>
          <p className="text-sm text-muted-foreground">
            Mulai Buat Undangan Digital Eksklusif dalam Hitungan Menit
          </p>
        </div>

        {/* Register Card */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Daftar Akun Host Baru</CardTitle>
            <CardDescription>
              Isi formulir di bawah untuk membuat akun penyelenggara acara.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Raden Wijaya"
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Alamat Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Kata Sandi (Minimal 8 Karakter)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button
                type="submit"
                className="w-full font-semibold shadow-xs"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <span>Buat Akun Sekarang</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Sudah memiliki akun?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Masuk ke akun Anda
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          Dengan mendaftar, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi Inveeta.
        </p>
      </div>
    </div>
  );
};
