import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.js';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Inveeta by Naridza Studio. All rights reserved.
      </footer>
    </div>
  );
};
