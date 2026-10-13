import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusCircle, Calendar, ExternalLink, Sparkles, Clock, Globe } from 'lucide-react';
import { apiClient } from '../../lib/api-client.js';

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Acara Saya
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola draft formulir wizard dan pantau undangan pernikahan Anda
          </p>
        </div>
        <Link
          to="/wizard"
          className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Buat Undangan Baru</span>
        </Link>
      </div>

      {/* Events Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Memuat data acara...</p>
        </div>
      ) : eventsList && eventsList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventsList.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      evt.isPublished
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {evt.isPublished ? '● Publikasi Aktif' : '○ Draft'}
                  </span>
                  <span className="text-xs text-gray-400">
                    Template: {evt.templateId}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-gray-900 line-clamp-1">
                  {evt.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5" />
                  <span>/{evt.slug}</span>
                </p>

                {evt.eventDate && (
                  <div className="mt-4 flex items-center text-xs text-gray-500 space-x-1.5">
                    <Calendar className="w-4 h-4 text-brand-600" />
                    <span>
                      {new Date(evt.eventDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <Link
                  to={`/wizard?id=${evt.id}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center space-x-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Lanjutkan Wizard</span>
                </Link>

                {evt.isPublished && (
                  <a
                    href={`http://localhost:3001/${evt.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center space-x-1"
                  >
                    <span>Buka Undangan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Belum ada acara yang dibuat
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-6">
            Mulai langkah pertama Anda dengan menyelesaikan wizard 5 langkah untuk membuat undangan pernikahan impian Anda.
          </p>
          <Link
            to="/wizard"
            className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Mulai Wizard Acara</span>
          </Link>
        </div>
      )}
    </div>
  );
};
