import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, PlusCircle, User } from 'lucide-react';
import { useSession, signOut } from '../../lib/auth-client.js';

export const Navbar: React.FC = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Inveeta
              </span>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
              Host Dashboard
            </span>
          </div>

          {/* Action & User Profile */}
          <div className="flex items-center space-x-4">
            <Link
              to="/wizard"
              className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Undangan Baru</span>
            </Link>

            <div className="h-6 w-px bg-gray-200" />

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-gray-800">
                  {session?.user?.name || 'Host Inveeta'}
                </div>
                <div className="text-xs text-gray-400">
                  {session?.user?.email || ''}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="text-gray-400 hover:text-red-600 transition p-1.5 rounded-md hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
