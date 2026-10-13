import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-dvh bg-background flex flex-col text-foreground">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border/70 bg-card/60 py-6 text-center text-xs text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Inveeta by Naridza Studio. Platform Undangan Pernikahan Digital Eksklusif.
        </p>
      </footer>
    </div>
  );
};
