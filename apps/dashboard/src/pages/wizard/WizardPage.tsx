import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

export const WizardPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">
        Wizard Pembuatan Acara 5 Langkah
      </h1>
      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
        Antarmuka interaktif 5 langkah (Info Dasar, Sesi & Peta, Biodata Pengantin, Amplop & Foto Canvas Compressor, dan Pilihan Template) siap diimplementasikan pada <strong>Task M1.5</strong>.
      </p>
      <div className="mt-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
