import { db, pool } from '../client.js';
import {
  users,
  accounts,
  events,
  eventSessions,
  guests,
  guestSessionAllocations,
  rsvps,
  eventGiftDetails,
  waMessageTemplates,
  wishes,
} from '../schemas/index.js';
import { generateGuestToken, generateId } from '@inveeta/shared';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';

export async function runDevSeed() {
  console.log('🌱 Menjalankan dev seed...');

  const testEmail = 'test@inveeta.com';
  const testPassword = 'password123';

  // 1. Bersihkan data host lama jika sudah ada (cascade menghapus seluruh data relasi)
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, testEmail))
    .limit(1);

  if (existingUser.length > 0) {
    console.log(`🧹 Membersihkan data host lama: ${testEmail}...`);
    await db.delete(users).where(eq(users.id, existingUser[0].id));
  }

  // 2. Buat Host User
  const hostUserId = `usr_${generateId()}`;
  console.log(`👤 Membuat akun host: ${testEmail} (${hostUserId})...`);
  await db.insert(users).values({
    id: hostUserId,
    name: 'Budi Santoso',
    email: testEmail,
    emailVerified: true,
  });

  // 3. Buat Credential Account untuk Better Auth
  const hashedPassword = await hashPassword(testPassword);
  await db.insert(accounts).values({
    id: `acc_${generateId()}`,
    userId: hostUserId,
    accountId: hostUserId,
    providerId: 'credential',
    password: hashedPassword,
  });

  // 4. Buat Acara Contoh (Wedding Event)
  const eventId = `evt_${generateId()}`;
  const slug = 'budi-dan-ani';
  console.log(`🎉 Membuat acara contoh: ${slug} (${eventId})...`);
  await db.insert(events).values({
    id: eventId,
    hostId: hostUserId,
    slug,
    title: 'Pernikahan Budi & Ani',
    brideName: 'Siti Anissa, S.Kom.',
    groomName: 'Budi Santoso, S.T.',
    brideNickname: 'Ani',
    groomNickname: 'Budi',
    brideParents: 'Bpk. Ahmad Dahlan & Ibu Siti Maryam',
    groomParents: 'Bpk. Bambang Sutrisno & Ibu Sri Rahayu',
    eventDate: new Date('2026-12-20T08:00:00+07:00'),
    timeZone: 'Asia/Jakarta',
    templateId: 'minimalist-elegance',
    templateTier: 'free',
    visualCustomization: {
      primaryColor: '#1E3A8A',
      secondaryColor: '#F3F4F6',
      fontFamily: 'font-serif',
      sectionsOrder: [
        'cover',
        'quote',
        'bride-groom',
        'sessions',
        'gallery',
        'rsvp',
        'wishes',
        'gift',
      ],
      coverLayout: 'classic',
    },
    quoteText:
      'Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri...',
    quoteSource: 'QS. Ar-Rum: 21',
    loveStory: [
      { year: '2020', story: 'Pertama kali bertemu di kampus ITB.' },
      {
        year: '2024',
        story: 'Memutuskan untuk melangkah ke jenjang yang lebih serius.',
      },
    ],
    rsvpDeadline: new Date('2026-12-15T23:59:59+07:00'),
    isPublished: true,
  });

  // 5. Buat 2 Sesi Acara: Akad Nikah & Resepsi
  const akadSessionId = `ses_${generateId()}`;
  const resepsiSessionId = `ses_${generateId()}`;
  console.log('⏰ Mendaftarkan sesi acara (Akad & Resepsi)...');

  await db.insert(eventSessions).values([
    {
      id: akadSessionId,
      eventId,
      title: 'Akad Nikah',
      startTime: new Date('2026-12-20T08:00:00+07:00'),
      endTime: new Date('2026-12-20T10:00:00+07:00'),
      locationName: 'Masjid Agung Al-Azhar',
      address: 'Jl. Sisingamangaraja No. 1, Kebayoran Baru, Jakarta Selatan',
      googleMapsUrl: 'https://maps.google.com/?q=-6.2355,106.7985',
      isPublic: false,
      sortOrder: 1,
    },
    {
      id: resepsiSessionId,
      eventId,
      title: 'Resepsi Pernikahan',
      startTime: new Date('2026-12-20T11:00:00+07:00'),
      endTime: new Date('2026-12-20T14:00:00+07:00'),
      locationName: 'Grand Ballroom Hotel Mulia Senayan',
      address: 'Jl. Asia Afrika Senayan, Gelora, Jakarta Pusat',
      googleMapsUrl: 'https://maps.google.com/?q=-6.2155,106.7995',
      isPublic: true,
      sortOrder: 2,
    },
  ]);

  // 6. Buat 5 Tamu Contoh (VIP, Family, Regular)
  console.log('👥 Mendaftarkan 5 tamu contoh dengan token unik...');
  const guest1Id = `gst_${generateId()}`;
  const guest2Id = `gst_${generateId()}`;
  const guest3Id = `gst_${generateId()}`;
  const guest4Id = `gst_${generateId()}`;
  const guest5Id = `gst_${generateId()}`;

  const guestData = [
    {
      id: guest1Id,
      eventId,
      name: 'Prof. Dr. Ir. H. Bambang Sudibyo, M.Eng.',
      phoneNumber: '6281234567890',
      category: 'vip' as const,
      maxPax: 2,
      token: generateGuestToken(),
    },
    {
      id: guest2Id,
      eventId,
      name: 'Keluarga Besar Bpk. Hendro Subroto',
      phoneNumber: '6281234567891',
      category: 'family' as const,
      maxPax: 4,
      token: generateGuestToken(),
    },
    {
      id: guest3Id,
      eventId,
      name: 'Rian Anggoro & Partner',
      phoneNumber: '6281234567892',
      category: 'regular' as const,
      maxPax: 2,
      token: generateGuestToken(),
    },
    {
      id: guest4Id,
      eventId,
      name: 'Dian Permatasari',
      phoneNumber: '6281234567893',
      category: 'regular' as const,
      maxPax: 1,
      token: generateGuestToken(),
    },
    {
      id: guest5Id,
      eventId,
      name: 'Farhan Maulana',
      phoneNumber: '6281234567894',
      category: 'regular' as const,
      maxPax: 2,
      token: generateGuestToken(),
    },
  ];

  await db.insert(guests).values(guestData);

  // 7. Alokasi Sesi Tamu
  // Tamu VIP & Keluarga: Akad & Resepsi
  // Tamu Reguler: Resepsi
  console.log('🎫 Mengalokasikan sesi ke tamu...');
  await db.insert(guestSessionAllocations).values([
    {
      id: `gsa_${generateId()}`,
      guestId: guest1Id,
      eventSessionId: akadSessionId,
    },
    {
      id: `gsa_${generateId()}`,
      guestId: guest1Id,
      eventSessionId: resepsiSessionId,
    },
    {
      id: `gsa_${generateId()}`,
      guestId: guest2Id,
      eventSessionId: akadSessionId,
    },
    {
      id: `gsa_${generateId()}`,
      guestId: guest2Id,
      eventSessionId: resepsiSessionId,
    },
    {
      id: `gsa_${generateId()}`,
      guestId: guest3Id,
      eventSessionId: resepsiSessionId,
    },
    {
      id: `gsa_${generateId()}`,
      guestId: guest4Id,
      eventSessionId: resepsiSessionId,
    },
    {
      id: `gsa_${generateId()}`,
      guestId: guest5Id,
      eventSessionId: resepsiSessionId,
    },
  ]);

  // 8. Buat Contoh RSVP Terisi
  console.log('✍️ Menambahkan contoh respon RSVP...');
  await db.insert(rsvps).values([
    {
      id: `rsvp_${generateId()}`,
      eventId,
      guestId: guest1Id,
      eventSessionId: akadSessionId,
      status: 'attending',
      actualPax: 2,
      notes: 'Insya Allah hadir berdua.',
    },
    {
      id: `rsvp_${generateId()}`,
      eventId,
      guestId: guest1Id,
      eventSessionId: resepsiSessionId,
      status: 'attending',
      actualPax: 2,
    },
    {
      id: `rsvp_${generateId()}`,
      eventId,
      guestId: guest3Id,
      eventSessionId: resepsiSessionId,
      status: 'attending',
      actualPax: 2,
      notes: 'Selamat untuk Budi & Ani!',
    },
    {
      id: `rsvp_${generateId()}`,
      eventId,
      guestId: guest4Id,
      eventSessionId: resepsiSessionId,
      status: 'declined',
      actualPax: 0,
      notes: 'Mohon maaf belum bisa hadir karena dinas luar kota.',
    },
  ]);

  // 9. Rincian Amplop Digital & Rekening Hadiah
  console.log('🎁 Mengatur rincian kado & rekening bank...');
  await db.insert(eventGiftDetails).values({
    id: `gft_${generateId()}`,
    eventId,
    giftAddress:
      'Jl. Tebet Barat Dalam VII No. 12, Tebet, Jakarta Selatan, DKI Jakarta 12810',
    giftRecipientName: 'Budi & Ani',
    bankAccounts: [
      {
        id: '1',
        bankName: 'Bank Central Asia (BCA)',
        accountNumber: '8801234567',
        accountHolder: 'Budi Santoso',
        sortOrder: 1,
      },
      {
        id: '2',
        bankName: 'Bank Mandiri',
        accountNumber: '1270009876543',
        accountHolder: 'Siti Anissa',
        sortOrder: 2,
      },
    ],
  });

  // 10. Template Pesan WhatsApp
  console.log('💬 Menyimpan template pesan WhatsApp...');
  await db.insert(waMessageTemplates).values({
    id: `wat_${generateId()}`,
    eventId,
    templateText: `Halo [NAMA_TAMU],

Tanpa mengurangi rasa hormat, kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:

*Budi & Ani*
Minggu, 20 Desember 2026

Informasi lengkap dan konfirmasi kehadiran (RSVP) dapat diakses melalui tautan berikut:
[LINK_UNDANGAN]

Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.

Terima kasih.`,
  });

  // 11. Contoh Doa & Ucapan (Wishes)
  console.log('💌 Mengisi doa restu (wishes)...');
  await db.insert(wishes).values([
    {
      id: `wsh_${generateId()}`,
      eventId,
      guestId: guest1Id,
      senderName: 'Prof. Dr. Ir. H. Bambang Sudibyo, M.Eng.',
      message:
        'Selamat menempuh hidup baru untuk Budi dan Ani. Semoga senantiasa sakinah, mawaddah, warahmah serta dilimpahi keberkahan.',
      isHidden: false,
      ipHash: 'seed_ip_hash_1',
    },
    {
      id: `wsh_${generateId()}`,
      eventId,
      guestId: guest3Id,
      senderName: 'Rian Anggoro & Partner',
      message:
        'Happy wedding Budi & Ani! Bahagia selalu sampai kakek nenek, lancar seluruh rangkaian acaranya!',
      isHidden: false,
      ipHash: 'seed_ip_hash_2',
    },
  ]);

  console.log('✅ Dev seed selesai!');
  console.log(`
=========================================
📋 INFORMASI AKUN & EVENT DUMMY DEV:
=========================================
Host Email     : ${testEmail}
Host Password  : ${testPassword}
Event Slug     : ${slug}
Tamu Contoh:
${guestData
  .map(
    (g) =>
      ` - ${g.name} (${g.category.toUpperCase()}) | Token: ${g.token} | URL: /${slug}/${g.token}`
  )
  .join('\n')}
=========================================
`);
}

// Eksekusi jika dijalankan secara langsung via CLI
if (process.argv[1]?.endsWith('dev.ts') || process.argv[1]?.endsWith('dev.js')) {
  try {
    await runDevSeed();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error saat menjalankan seed:', err);
    await pool.end();
    process.exit(1);
  }
}
