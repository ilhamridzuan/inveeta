import React from 'react';
import Image from 'next/image';
import type { PublicEventDTO } from '@inveeta/shared';
import { Gift, CreditCard, QrCode, MapPin } from 'lucide-react';
import { CopyButton } from './CopyButton';

interface DigitalGiftSectionProps {
  event: PublicEventDTO;
}

export function DigitalGiftSection({ event }: DigitalGiftSectionProps) {
  const giftDetails = event.giftDetails;
  if (!giftDetails) return null;

  const hasBankAccounts =
    giftDetails.bankAccounts && giftDetails.bankAccounts.length > 0;
  const hasQris = Boolean(giftDetails.qrisImageUrl);
  const hasPhysicalGift = Boolean(giftDetails.giftAddress);

  if (!hasBankAccounts && !hasQris && !hasPhysicalGift) return null;

  return (
    <section className="py-20 px-6 max-w-3xl mx-auto space-y-12">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-red-50 text-red-500 mb-2">
          <Gift className="w-6 h-6" />
        </div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gray-500 font-medium">
          Tanda Kasih
        </h2>
        <p className="text-3xl font-serif text-gray-900 tracking-tight">
          Amplop Digital & Kado
        </p>
        <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto pt-1 font-light">
          Doa restu Anda merupakan karunia terindah bagi kami. Namun jika Anda
          berkenan memberikan tanda kasih, dapat melalui:
        </p>
      </div>

      <div className="space-y-6">
        {/* Bank Accounts */}
        {hasBankAccounts && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {giftDetails.bankAccounts.map((account) => (
              <div
                key={account.id || account.accountNumber}
                className="p-6 rounded-2xl bg-white border border-gray-150 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">
                    {account.bankName}
                  </span>
                  <CreditCard className="w-5 h-5 text-gray-400" />
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-mono font-semibold text-gray-900 tracking-wider">
                    {account.accountNumber}
                  </p>
                  <p className="text-xs text-gray-500">
                    a.n. {account.accountHolder}
                  </p>
                </div>

                <div>
                  <CopyButton textToCopy={account.accountNumber} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QRIS */}
        {hasQris && giftDetails.qrisImageUrl && (
          <div className="p-8 rounded-2xl bg-white border border-gray-150 shadow-sm text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
              <QrCode className="w-4 h-4 text-gray-600" />
              <span>QRIS Pembayaran Digital</span>
            </div>

            <div className="relative w-56 h-56 mx-auto rounded-xl overflow-hidden border p-2 bg-white">
              <Image
                src={giftDetails.qrisImageUrl}
                alt="QRIS Amplop Digital"
                fill
                sizes="224px"
                className="object-contain p-2"
              />
            </div>
            <p className="text-xs text-gray-500">
              Dapat dipindai melalui BCA, Mandiri, GoPay, OVO, ShopeePay, Dana,
              dan aplikasi bank lainnya.
            </p>
          </div>
        )}

        {/* Physical Gift Address */}
        {hasPhysicalGift && giftDetails.giftAddress && (
          <div className="p-6 rounded-2xl bg-white border border-gray-150 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span>Kirim Kado Fisik</span>
            </div>

            {giftDetails.giftRecipientName && (
              <p className="text-sm font-medium text-gray-900">
                Penerima: {giftDetails.giftRecipientName}
              </p>
            )}

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-light">
              {giftDetails.giftAddress}
            </p>

            <div className="pt-1">
              <CopyButton
                textToCopy={giftDetails.giftAddress}
                label="Salin Alamat"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
