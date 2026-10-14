import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, LogOut, Plus, AlertTriangle, Users, Layers, MessageSquare, BarChart3 } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const Navbar: React.FC = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setShowLogoutDialog(false);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userName = session?.user?.name || 'Host Inveeta';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'HI';

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo & Context */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground font-serif">
                Inveeta
              </span>
            </Link>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] font-medium tracking-wide">
              Host Workspace
            </Badge>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1 ml-3 pl-3 border-l border-border/80 text-xs">
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Acara</span>
              </Link>
              <Link
                to="/guests"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  location.pathname.includes('/guests')
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Tamu</span>
              </Link>
              <Link
                to="/wishes"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  location.pathname.includes('/wishes')
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Ucapan</span>
              </Link>
              <Link
                to="/analytics"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  location.pathname.includes('/analytics')
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Analitik</span>
              </Link>
            </nav>
          </div>

          {/* Action & User Profile */}
          <div className="flex items-center gap-3">
            <Button asChild size="sm" className="hidden sm:inline-flex shadow-xs">
              <Link to="/wizard">
                <Plus className="h-4 w-4" />
                <span>Buat Undangan Baru</span>
              </Link>
            </Button>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 ring-1 ring-border/80">
                <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="hidden text-left md:block">
                <div className="text-xs font-semibold leading-tight text-foreground line-clamp-1">
                  {userName}
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {session?.user?.email || 'host@inveeta.com'}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowLogoutDialog(true)}
                title="Keluar dari akun"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Keluar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Konfirmasi Keluar Akun</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin keluar dari dashboard Inveeta? Sesi Anda saat ini akan diakhiri.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              disabled={isLoggingOut}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span>{isLoggingOut ? 'Memproses...' : 'Ya, Keluar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
