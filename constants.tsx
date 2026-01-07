
import { Division, Position, QuestionTemplate } from './types';

export const DIVISION_POSITIONS: Record<Division, Position[]> = {
  [Division.BUSDEV]: ['Office Boy (OB)', 'Umum', 'Konten Kreator', 'Dapur', 'IT', 'Manager Busdev'],
  [Division.KEUANGAN]: ['Staff Keuangan', 'SPV Keuangan', 'Manager Keuangan'],
  [Division.OPERASI]: [
    'Staff Operasional', 
    'Staff Gudang', 
    'Admin Operasional',
    'Staff Operasional & Logistik', 
    'SPV Operasional', 
    'Manager Operasional'
  ],
};

const GENERAL_QUESTIONS: QuestionTemplate[] = [
  { id: 'g1', category: 'General', question: 'Silakan perkenalkan diri Anda secara lengkap (Nama, Asal/Domisili, dan Latar Belakang Keluarga/Pendidikan)?', idealAnswer: 'Menjelaskan identitas diri dengan jelas, sopan, dan percaya diri.' },
  { id: 'g2', category: 'General', question: 'Apa yang Anda ketahui tentang perusahaan kami, dan dari mana Anda mendapatkan informasi tersebut?', idealAnswer: 'Menunjukkan riset mendalam tentang produk, visi, atau budaya perusahaan.' },
  { id: 'g3', category: 'General', question: 'Sebutkan pengalaman kerja paling relevan yang pernah Anda miliki dengan posisi ini?', idealAnswer: 'Memberikan contoh konkret pencapaian atau tugas yang sesuai dengan job desk.' },
  { id: 'g4', category: 'General', question: 'Apa kelebihan terbesar Anda yang bisa berkontribusi langsung, dan apa satu kekurangan yang sedang Anda perbaiki?', idealAnswer: 'Jujur mengenai kelemahan (dengan solusi) dan percaya diri mengenai kelebihan.' },
  { id: 'g5', category: 'General', question: 'Berapa ekspektasi gaji Anda dan kapan Anda siap mulai bekerja?', idealAnswer: 'Realistis sesuai standar pasar dan menunjukkan ketersediaan yang jelas.' }
];

export const QUESTION_TEMPLATES: Record<Position, QuestionTemplate[]> = {
  'Office Boy (OB)': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Jelaskan urutan prioritas pembersihan kantor dari pagi hingga sore?', idealAnswer: 'Pagi: Lobby/Public Area & Toilet. Siang: Maintain kebersihan. Sore: Pembuangan sampah.' },
    { id: 't2', category: 'Technical', question: 'Apa standar kebersihan toilet kantor yang Anda ketahui?', idealAnswer: 'Kering, tidak berbau, tisu tersedia, cermin bersih, kloset higienis.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana cara Anda merawat peralatan kebersihan (sapu, pel, kain lap)?', idealAnswer: 'Dicuci setelah pakai, dikeringkan, dan disimpan rapi sesuai jenisnya.' },
    { id: 't4', category: 'Technical', question: 'Apa yang Anda lakukan jika diminta membelikan makanan oleh karyawan saat jam kerja sibuk?', idealAnswer: 'Meminta izin atasan atau melakukannya jika pekerjaan utama sudah aman.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana cara membersihkan noda kopi di karpet?', idealAnswer: 'Segera serap cairan, gunakan cairan pembersih khusus/sabun, jangan digosok kasar.' },
    { id: 't6', category: 'Technical', question: 'Apa tindakan Anda jika melihat AC atau lampu kantor lupa dimatikan di ruangan kosong?', idealAnswer: 'Mematikannya segera untuk hemat energi.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana sikap Anda jika ditegur karena pekerjaan dinilai kurang bersih?', idealAnswer: 'Menerima masukan, meminta maaf, dan segera memperbaikinya.' },
    { id: 't8', category: 'Technical', question: 'Jelaskan cara memilah sampah organik dan non-organik?', idealAnswer: 'Organik (sisa makanan), Non-organik (plastik, kertas, kaleng).' },
    { id: 't9', category: 'Technical', question: 'Apa yang Anda lakukan jika menemukan dompet atau HP tertinggal di meja rapat?', idealAnswer: 'Jangan dibuka, segera lapor ke security atau HR/Umum.' },
    { id: 't10', category: 'Technical', question: 'Apakah Anda bersedia datang lebih pagi atau pulang lebih lambat jika ada event kantor?', idealAnswer: 'Menunjukkan kesediaan dan fleksibilitas.' }
  ],
  'IT': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Jelaskan langkah troubleshooting jika internet kantor mati total?', idealAnswer: 'Cek modem/router, cek kabel LAN, ping test, hubungi ISP.' },
    { id: 't2', category: 'Technical', question: 'Bagaimana cara Anda mengamankan data perusahaan dari serangan virus/ransomware?', idealAnswer: 'Firewall, Antivirus update, Backup rutin, Edukasi user.' },
    { id: 't3', category: 'Technical', question: 'Software apa saja yang Anda kuasai untuk menunjang produktivitas kantor?', idealAnswer: 'Office 365, Trello/Jira, Slack, Zoom, dll.' },
    { id: 't4', category: 'Technical', question: 'Bagaimana prosedur maintenance laptop/PC karyawan?', idealAnswer: 'Disk cleanup, update OS, pembersihan fisik debu, cek kesehatan storage.' },
    { id: 't5', category: 'Technical', question: 'Jelaskan konsep jaringan LAN dan WLAN secara sederhana?', idealAnswer: 'LAN pakai kabel (lebih stabil), WLAN nirkabel (fleksibel).' },
    { id: 't6', category: 'Technical', question: 'Apa yang Anda lakukan jika printer sharing tidak bisa digunakan?', idealAnswer: 'Restart print spooler, cek koneksi IP printer, instal ulang driver.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana cara Anda melakukan manajemen aset IT?', idealAnswer: 'Labeling, database inventaris (serial number), catat user pemegang.' },
    { id: 't8', category: 'Technical', question: 'Jika ada user yang lupa password emailnya, apa langkah verifikasi Anda?', idealAnswer: 'Pastikan identitas user valid sebelum reset password.' },
    { id: 't9', category: 'Technical', question: 'Apa pengalaman Anda dalam setting Mikrotik atau Router?', idealAnswer: 'Bandwidth management, blocking situs, VPN.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana Anda menjelaskan masalah teknis rumit kepada orang awam?', idealAnswer: 'Menggunakan analogi sederhana dan bahasa non-teknis.' }
  ],
  'Staff Keuangan': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Jelaskan alur Petty Cash dari pengajuan hingga pelaporan?', idealAnswer: 'Form pengajuan -> Approval -> Pencairan -> Bukti belanja -> Input Jurnal.' },
    { id: 't2', category: 'Technical', question: 'Bagaimana cara Anda melakukan rekonsiliasi bank?', idealAnswer: 'Mencocokkan saldo buku perusahaan dengan rekening koran bank.' },
    { id: 't3', category: 'Technical', question: 'Apa bedanya biaya operasional (Opex) dan belanja modal (Capex)?', idealAnswer: 'Opex untuk operasional sehari-hari, Capex untuk investasi aset jangka panjang.' },
    { id: 't4', category: 'Technical', question: 'Bagaimana cara menangani invoice supplier yang hilang?', idealAnswer: 'Minta salinan ke supplier, cek email, buat berita acara kehilangan jika perlu.' },
    { id: 't5', category: 'Technical', question: 'Apa yang Anda ketahui tentang PPh 21 dan PPh 23?', idealAnswer: 'PPh 21 pajak gaji karyawan, PPh 23 pajak jasa/sewa.' },
    { id: 't6', category: 'Technical', question: 'Software akuntansi apa yang pernah Anda gunakan (Accurate, Jurnal, SAP)?', idealAnswer: 'Menyebutkan software dan tingkat kemahirannya.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana sikap Anda jika atasan meminta reimbursement tanpa struk?', idealAnswer: 'Menolak halus atau meminta form pengganti bukti potong sesuai SOP.' },
    { id: 't8', category: 'Technical', question: 'Jelaskan cara filing dokumen keuangan yang rapi?', idealAnswer: 'Berdasarkan tanggal, jenis transaksi, dan nomor urut voucher.' },
    { id: 't9', category: 'Technical', question: 'Apa itu Cash Flow dan mengapa penting?', idealAnswer: 'Aliran uang masuk keluar, penting untuk likuiditas perusahaan.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana cara Anda meminimalisir kesalahan input angka?', idealAnswer: 'Double check, tidak terburu-buru, cross check dengan dokumen fisik.' }
  ],
  'Staff Operasional': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Apa yang kamu ketahui tentang posisi yang dilamar di perusahaan kami?', idealAnswer: 'Memahami bahwa staff operasional bertanggung jawab atas kelancaran arus barang, logistik, dan administrasi lapangan serta mengetahui profil umum perusahaan.' },
    { id: 't2', category: 'Technical', question: 'Menurutmu apa 3 skill yang harus dikuasai oleh Staff Operasional?', idealAnswer: '1. Ketelitian (Detail-oriented), 2. Manajemen Waktu/Kecepatan, 3. Komunikasi & Koordinasi Tim.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana cara melakukan pengelolaan barang masuk dan keluar yang baik?', idealAnswer: 'Melakukan pengecekan fisik vs surat jalan, mencatat di sistem/kartu stok (FIFO/FEFO), memastikan kerapian penyimpanan, dan rutin Stock Opname.' },
    { id: 't4', category: 'Technical', question: 'Apa yang kamu ketahui tentang administrasi dokumen (Dokumentasi Pengiriman)?', idealAnswer: 'Memahami fungsi Surat Jalan, DO (Delivery Order), dan Invoice. Dokumen harus lengkap tanda tangan, stempel, dan diarsip dengan rapi sebagai bukti sah.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana cara mendapatkan harga pasar terbaik untuk material yang telah dipesan oleh customer?', idealAnswer: 'Melakukan perbandingan harga dari minimal 3 supplier, negosiasi termin pembayaran/diskon volume, dan rutin update database harga.' },
    { id: 't6', category: 'Technical', question: 'Jelaskan langkah teknis Anda ketika harus mengirimkan material ke lokasi proyek, mulai dari persiapan hingga pengiriman?', idealAnswer: '1. Cek Kesesuaian Barang & Jumlah (QC), 2. Cek Kondisi Kendaraan (P2H), 3. Loading barang dengan aman, 4. Kirim via rute efisien, 5. Serah terima dengan tanda tangan basah.' },
    { id: 'cs1', category: 'Technical', question: 'STUDI KASUS: Bagaimana jika stok di sistem berbeda dengan fisik gudang?', idealAnswer: 'Segera lakukan hitung ulang (re-count), telusuri riwayat transaksi hari itu/terakhir, buat Berita Acara Selisih, dan lapor atasan untuk penyesuaian data.' },
    { id: 'cs2', category: 'Technical', question: 'STUDI KASUS: Proyek minta dikirim di luar jam kerja TANPA PO resmi. Apa tindakanmu?', idealAnswer: 'Secara SOP harus ditolak. Namun jika urgent, wajib minta persetujuan tertulis (WA/Email) dari Atasan/Manajer dan minta Surat Jaminan/Konfirmasi dari Proyek sebelum kirim.' },
    { id: 'cs3', category: 'Technical', question: 'STUDI KASUS: Truk pengiriman terlambat akibat cuaca / kendala di jalan. Apa yang harus dilakukan?', idealAnswer: 'Jangan diam. Segera hubungi PIC di lokasi proyek, jelaskan kendalanya, sampaikan permohonan maaf, dan berikan estimasi jam tiba yang baru (update berkala).' },
    { id: 'cs4', category: 'Technical', question: 'STUDI KASUS: Material sampai proyek namun jenis TIDAK SESUAI PO dan kebutuhan proyek urgen. Apa solusinya?', idealAnswer: 'Tetap tenang, minta maaf, segera koordinasi dengan gudang untuk mengirimkan barang pengganti (susulan) secepat mungkin, dan tarik barang yang salah.' }
  ],
  'Staff Gudang': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Jelaskan metode FIFO dan FEFO dalam pengelolaan gudang?', idealAnswer: 'FIFO (First In First Out), FEFO (First Expired First Out) untuk barang kadaluarsa.' },
    { id: 't2', category: 'Technical', question: 'Bagaimana cara Anda melakukan Stock Opname agar akurat?', idealAnswer: 'Hitung fisik, bandingkan dengan kartu stok/sistem, tandai barang yang sudah dihitung.' },
    { id: 't3', category: 'Technical', question: 'Apa yang harus dilakukan agar gudang bebas dari hama (tikus/kecoa)?', idealAnswer: 'Jaga kebersihan, jangan ada sisa makanan, tutup celah masuk, pest control rutin.' },
    { id: 't4', category: 'Technical', question: 'Bagaimana prosedur penerimaan barang (Inbound) yang benar?', idealAnswer: 'Cek surat jalan vs PO, cek fisik barang (rusak/bagus), tanda tangan terima.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana cara menata barang agar mudah diambil (picking)?', idealAnswer: 'Kelompokkan kategori, barang fast moving ditaruh di depan/bawah.' },
    { id: 't6', category: 'Technical', question: 'Apa fungsi Kartu Stok (Bin Card)?', idealAnswer: 'Mencatat riwayat keluar masuk barang secara manual di rak.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana Anda menangani barang retur dari pelanggan?', idealAnswer: 'Cek kondisi, pisahkan di area karantina/retur, update stok.' },
    { id: 't8', category: 'Technical', question: 'Apa standar APD (Alat Pelindung Diri) di gudang?', idealAnswer: 'Sepatu safety, sarung tangan, rompi (jika perlu), helm.' },
    { id: 't9', category: 'Technical', question: 'Apa yang Anda lakukan jika menemukan selisih stok?', idealAnswer: 'Cek riwayat transaksi hari itu, hitung ulang, lapor SPV.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana cara mengangkat beban berat agar punggung tidak cedera?', idealAnswer: 'Tekuk lutut, punggung tegak, beban dekat dengan tubuh.' }
  ],
  'Admin Operasional': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana cara Anda mengarsip Surat Jalan agar mudah dicari?', idealAnswer: 'Urutkan berdasarkan tanggal atau nomor surat jalan, simpan di ordner berlabel.' },
    { id: 't2', category: 'Technical', question: 'Software apa yang biasa Anda gunakan untuk rekap data?', idealAnswer: 'Excel (VLOOKUP, Pivot Table), Google Sheets, atau software ERP.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana prosedur pembuatan Surat Jalan?', idealAnswer: 'Input data sesuai DO/Invoice, pastikan detail barang benar, cetak rangkap.' },
    { id: 't4', category: 'Technical', question: 'Apa yang Anda lakukan jika ada driver yang lupa minta tanda tangan pelanggan?', idealAnswer: 'Hubungi pelanggan untuk konfirmasi penerimaan via WA/Email, minta driver susulkan.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana Anda mengatur jadwal service kendaraan operasional?', idealAnswer: 'Buat database jadwal service berkala berdasarkan KM atau bulan.' },
    { id: 't6', category: 'Technical', question: 'Bagaimana cara Anda memantau posisi driver saat pengiriman?', idealAnswer: 'Telepon/WA berkala atau cek GPS tracking jika ada.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana Anda menangani klaim bensin/uang makan tim lapangan?', idealAnswer: 'Cek struk/bukti, cocokkan dengan rute/jadwal, rekap untuk approval.' },
    { id: 't8', category: 'Technical', question: 'Apa yang Anda lakukan jika stok di sistem berbeda dengan laporan gudang?', idealAnswer: 'Koordinasi dengan Staff Gudang untuk stock opname parsial.' },
    { id: 't9', category: 'Technical', question: 'Bagaimana cara Anda menghitung performa pengiriman (On Time Delivery)?', idealAnswer: 'Bandingkan waktu tiba aktual dengan estimasi/janji ke pelanggan.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana sikap Anda saat dikejar deadline laporan oleh atasan?', idealAnswer: 'Fokus, prioritas data yang paling penting dulu, komunikasi progress.' }
  ],
  'Staff Operasional & Logistik': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Mengingat gudang kita hanya berupa ruangan kecil, bagaimana strategi Anda menata barang agar mudah dicari dan stok akurat?', idealAnswer: 'Kelompokkan per kategori/jenis, beri label jelas di rak, pisahkan barang fast-moving di tempat termudah dijangkau, dan gunakan kartu stok.' },
    { id: 't2', category: 'Technical', question: 'Posisi ini juga mencakup mencari pelanggan baru. Bagaimana cara Anda melakukan kanvasing atau mencari target pasar baru?', idealAnswer: 'Riset area potensial, kunjungan langsung (door-to-door) ke toko/klien, atau memanfaatkan media sosial untuk promosi.' },
    { id: 't3', category: 'Technical', question: 'Coba simulasikan cara Anda menawarkan produk kita kepada calon pelanggan yang baru pertama kali Anda temui?', idealAnswer: 'Sopan, perkenalkan diri, jelaskan keunggulan produk secara singkat, dan tawarkan promo/sampel jika ada.' },
    { id: 't4', category: 'Technical', question: 'Setelah terjadi kesepakatan (deal), bagaimana prosedur pembuatan Invoice yang benar sampai barang dikirim?', idealAnswer: 'Buat Invoice sesuai pesanan (cek harga & jumlah), cetak rangkap, siapkan barang, dan pastikan tanda terima ditandatangani saat pengiriman.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana Anda mengatur rute pengiriman ke beberapa pelanggan berbeda agar efisien waktu dan bensin?', idealAnswer: 'Kelompokkan lokasi yang searah, kirim ke lokasi terjauh atau terdekat dulu sesuai situasi lalu lintas, dan cek kondisi kendaraan.' },
    { id: 't6', category: 'Technical', question: 'Apa yang Anda lakukan jika saat pengiriman, pelanggan komplain barangnya ada yang rusak/lecet?', idealAnswer: 'Minta maaf, foto buktinya, jangan berdebat, catat di surat jalan, dan laporkan ke kantor untuk proses retur/ganti.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana Anda membagi waktu antara mengurus gudang, mencari pelanggan (sales), dan mengirim barang (kurir)?', idealAnswer: 'Pagi: Siapkan kiriman & admin. Siang: Pengiriman sekaligus kanvasing area sekitar. Sore: Rapikan gudang & laporan.' },
    // Removed COD Question (t8)
    { id: 't9', category: 'Technical', question: 'Apa yang Anda lakukan jika stok fisik di gudang ternyata tidak cocok dengan catatan Invoice?', idealAnswer: 'Segera hitung ulang, telusuri riwayat keluar barang hari itu, dan laporkan selisihnya agar data bisa disesuaikan.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana cara Anda menjaga hubungan baik dengan pelanggan saat mengantar barang rutin?', idealAnswer: 'Ramah, tepat waktu, rapi, dan sesekali menanyakan apakah ada kebutuhan tambahan.' }
  ],
  'Konten Kreator': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Tools apa saja yang Anda gunakan untuk editing video dan desain?', idealAnswer: 'Adobe Premiere/CapCut, Photoshop/Canva, Illustrator.' },
    { id: 't2', category: 'Technical', question: 'Bagaimana cara Anda riset tren yang sedang viral?', idealAnswer: 'Lihat TikTok Creative Center, Google Trends, Hashtag monitoring.' },
    { id: 't3', category: 'Technical', question: 'Jelaskan proses pembuatan konten dari ide sampai posting?', idealAnswer: 'Ideasi -> Script -> Take -> Edit -> Review -> Caption/Hashtag -> Post.' },
    { id: 't4', category: 'Technical', question: 'Apa perbedaan konten untuk Instagram Reels dan TikTok?', idealAnswer: 'TikTok lebih raw/autentik, Reels lebih estetik/polished.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana cara menghadapi komentar negatif (hate speech) di akun kantor?', idealAnswer: 'Tidak terbawa emosi, balas profesional jika perlu, atau hide/block sesuai SOP.' },
    { id: 't6', category: 'Technical', question: 'Berapa banyak konten yang sanggup Anda produksi dalam sehari?', idealAnswer: 'Menunjukkan produktivitas yang realistis.' },
    { id: 't7', category: 'Technical', question: 'Apa itu Hook dalam video pendek dan berikan contohnya?', idealAnswer: '3 detik pertama penentu. Contoh: "Jangan scroll kalau mau..."' },
    { id: 't8', category: 'Technical', question: 'Bagaimana strategi menaikkan Engagement Rate?', idealAnswer: 'Call to Action (CTA), reply komen, konten interaktif (Q&A).' },
    { id: 't9', category: 'Technical', question: 'Pernahkah konten Anda FYP/Viral? Apa analisanya?', idealAnswer: 'Menjelaskan faktor keberhasilan konten tersebut.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana Anda menyesuaikan gaya desain dengan Brand Identity perusahaan?', idealAnswer: 'Pelajari Brand Guidelines, penggunaan warna dan font resmi.' }
  ],
  'Umum': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana prosedur pengadaan ATK bulanan?', idealAnswer: 'Cek stok sisa, rekap permintaan divisi, ajukan budget, beli.' },
    { id: 't2', category: 'Technical', question: 'Apa yang Anda lakukan jika listrik kantor tiba-tiba mati?', idealAnswer: 'Cek sekring/MCB, hubungi PLN, nyalakan Genset jika ada.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana cara mengelola surat masuk dan surat keluar?', idealAnswer: 'Buku agenda, disposisi ke penerima, arsip salinan.' },
    { id: 't4', category: 'Technical', question: 'Bagaimana Anda mengatur jadwal penggunaan ruang meeting?', idealAnswer: 'Sistem booking (Google Calendar/Manual), pastikan ruangan bersih sebelum dipakai.' },
    { id: 't5', category: 'Technical', question: 'Jelaskan cara maintenance kendaraan operasional kantor?', idealAnswer: 'Jadwal servis berkala, cek pajak STNK, cek kebersihan.' },
    { id: 't6', category: 'Technical', question: 'Apa tindakan Anda jika ada tamu komplain pelayanan front office?', idealAnswer: 'Dengarkan, minta maaf, catat keluhan, sampaikan ke manajemen.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana prosedur pembuangan limbah kantor?', idealAnswer: 'Kerjasama dengan vendor sampah atau dinas kebersihan.' },
    { id: 't8', category: 'Technical', question: 'Bagaimana Anda mengelola data absensi karyawan?', idealAnswer: 'Cek mesin fingerprint, rekap cuti/sakit, serahkan ke HR.' },
    { id: 't9', category: 'Technical', question: 'Apa yang Anda ketahui tentang K3 Perkantoran?', idealAnswer: 'Keselamatan kerja, jalur evakuasi, ketersediaan APAR.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana cara Anda menyeleksi vendor catering atau cleaning service?', idealAnswer: 'Bandingkan harga, rasa/kualitas, dan layanan purna jual.' }
  ],
  'Dapur': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Apa itu Cross Contamination (Kontaminasi Silang) dan cara mencegahnya?', idealAnswer: 'Pisahkan talenan daging dan sayur, cuci tangan, simpan bahan terpisah.' },
    { id: 't2', category: 'Technical', question: 'Jelaskan metode FIFO dalam penyimpanan bahan makanan?', idealAnswer: 'Barang yang masuk duluan (atau expire duluan) harus dipakai duluan.' },
    { id: 't3', category: 'Technical', question: 'Berapa suhu standar untuk memasak daging ayam agar aman?', idealAnswer: 'Minimal 74 derajat Celcius (matang sempurna).' },
    { id: 't4', category: 'Technical', question: 'Bagaimana prosedur cleaning kitchen di akhir shift (Closing)?', idealAnswer: 'Matikan gas/listrik, cuci alat, bersihkan grease trap, pel lantai.' },
    { id: 't5', category: 'Technical', question: 'Apa yang Anda lakukan jika menemukan bahan baku yang sedikit berbau?', idealAnswer: 'Langsung buang/retur, jangan ambil risiko dipakai.' },
    { id: 't6', category: 'Technical', question: 'Bagaimana cara Anda bekerja cepat saat pesanan menumpuk (Rush Hour)?', idealAnswer: 'Mise en place (persiapan) yang matang, kerja tim, tenang.' },
    { id: 't7', category: 'Technical', question: 'Sebutkan jenis-jenis potongan sayuran dasar?', idealAnswer: 'Julienne, Dice, Slice, Chiffonade.' },
    { id: 't8', category: 'Technical', question: 'Bagaimana cara menyimpan sisa makanan matang?', idealAnswer: 'Dinginkan cepat, masukkan wadah tertutup, beri label tanggal, masuk chiller.' },
    { id: 't9', category: 'Technical', question: 'Apa fungsi Inventory Harian di dapur?', idealAnswer: 'Mencegah kehabisan stok saat operasional dan kontrol cost.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana menjaga kebersihan diri (Personal Hygiene) di dapur?', idealAnswer: 'Rambut tertutup, kuku pendek, cuci tangan rutin, baju bersih.' }
  ],
  'Manager Busdev': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana Anda membuat Business Plan untuk tahun depan?', idealAnswer: 'Analisis SWOT, proyeksi finansial, strategi marketing, timeline eksekusi.' },
    { id: 't2', category: 'Technical', question: 'Jelaskan strategi Anda untuk akuisisi klien B2B?', idealAnswer: 'Networking, LinkedIn, Cold Calling, Proposal Value Proposition.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana cara Anda menghitung Customer Acquisition Cost (CAC)?', idealAnswer: 'Total biaya marketing dibagi jumlah customer baru.' },
    { id: 't4', category: 'Technical', question: 'Apa yang Anda lakukan jika target sales bulan ini tidak tercapai?', idealAnswer: 'Evaluasi funnel, genjot promo jangka pendek, motivasi tim.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana cara menjalin kemitraan strategis yang long-term?', idealAnswer: 'Win-win solution, trust, maintenance hubungan rutin.' },
    { id: 't6', category: 'Technical', question: 'Metode apa yang Anda gunakan untuk analisis kompetitor?', idealAnswer: 'Mystery shopping, analisis digital footprint, survei pasar.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana Anda memimpin tim sales yang demotivasi?', idealAnswer: 'Coaching 1-on-1, insentif scheme review, lead by example.' },
    { id: 't8', category: 'Technical', question: 'Apa itu Product-Market Fit?', idealAnswer: 'Kondisi di mana produk benar-benar dibutuhkan dan dibeli pasar.' },
    { id: 't9', category: 'Technical', question: 'Bagaimana strategi pricing untuk produk baru?', idealAnswer: 'Cost-plus, Value-based, atau Competitor-based pricing.' },
    { id: 't10', category: 'Technical', question: 'Jelaskan pengalaman Anda dalam negosiasi kontrak bernilai besar?', idealAnswer: 'Menunjukkan kemampuan persuasi dan closing deal.' }
  ],
  'SPV Keuangan': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana Anda memastikan tim staff input data tepat waktu?', idealAnswer: 'Set deadline harian, monitoring berkala, SOP yang jelas.' },
    { id: 't2', category: 'Technical', question: 'Apa poin terpenting saat mereview Laporan Laba Rugi bulanan?', idealAnswer: 'Cek anomali biaya, bandingkan dengan budget, analisis margin.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana cara Anda mengelola Cash Flow saat pemasukan sedang seret?', idealAnswer: 'Prioritas pembayaran urgent, negosiasi termin supplier, genjot penagihan AR.' },
    { id: 't4', category: 'Technical', question: 'Jelaskan prosedur Audit Internal yang Anda terapkan?', idealAnswer: 'Spot check kas, sampling dokumen, verifikasi aset fisik.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana menangani staff yang melakukan fraud kecil?', idealAnswer: 'Tegas sesuai peraturan perusahaan (SP/PHK), investigasi akar masalah.' },
    { id: 't6', category: 'Technical', question: 'Apa strategi tax planning yang legal untuk efisiensi pajak?', idealAnswer: 'Memaksimalkan biaya yang deductible, taat lapor tepat waktu hindari denda.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana Anda menyusun Budget Tahunan?', idealAnswer: 'Based on historical data + asumsi pertumbuhan + inflasi.' },
    { id: 't8', category: 'Technical', question: 'Apa bedanya Accrual Basis dan Cash Basis?', idealAnswer: 'Accrual catat saat transaksi terjadi, Cash saat uang diterima/keluar.' },
    { id: 't9', category: 'Technical', question: 'Bagaimana Anda mempresentasikan data keuangan ke orang non-finance?', idealAnswer: 'Gunakan grafik, dashboard, dan bahasa bisnis sederhana.' },
    { id: 't10', category: 'Technical', question: 'Apa peran SPV Keuangan dalam pengambilan keputusan manajemen?', idealAnswer: 'Menyajikan data valid sebagai dasar keputusan strategis.' }
  ],
  'Manager Keuangan': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana Anda menjaga kesehatan finansial perusahaan jangka panjang?', idealAnswer: 'Kontrol rasio utang, jaga likuiditas, investasi bijak.' },
    { id: 't2', category: 'Technical', question: 'Strategi apa untuk menghadapi resesi ekonomi?', idealAnswer: 'Efisiensi cost, perkuat cash reserve, diversifikasi revenue.' },
    { id: 't3', category: 'Technical', question: 'Jelaskan pengalaman Anda dalam mencari pendanaan (Funding)?', idealAnswer: 'Bank loan, investor, atau IPO.' },
    { id: 't4', category: 'Technical', question: 'Bagaimana Anda mengelola risiko fluktuasi kurs mata uang?', idealAnswer: 'Hedging, kontrak forward, multi-currency account.' },
    { id: 't5', category: 'Technical', question: 'Apa Key Performance Indicator (KPI) utama departemen keuangan?', idealAnswer: 'Akurasi laporan, ketepatan waktu lapor, efisiensi budget, clean audit.' },
    { id: 't6', category: 'Technical', question: 'Bagaimana Anda mengevaluasi kelayakan investasi mesin baru?', idealAnswer: 'Hitung ROI (Return on Investment), NPV, dan Payback Period.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana leadership style Anda dalam memimpin departemen keuangan?', idealAnswer: 'Integritas tinggi, detail-oriented, tapi supportif.' },
    { id: 't8', category: 'Technical', question: 'Bagaimana sistem kontrol internal untuk mencegah kebocoran dana besar?', idealAnswer: 'Segregation of duties (pemisahan tugas), approval berjenjang, audit rutin.' },
    { id: 't9', category: 'Technical', question: 'Apa pendapat Anda tentang digitalisasi sistem keuangan?', idealAnswer: 'Wajib dilakukan untuk efisiensi, real-time data, dan akurasi.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana Anda menangani konflik kepentingan antara Divisi Sales (ingin spend) dan Finance (ingin hemat)?', idealAnswer: 'Cari titik tengah berdasarkan ROI, dukung spend yang menghasilkan revenue.' }
  ],
  'SPV Operasional': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana Anda menyusun jadwal shift agar operasional tidak terganggu?', idealAnswer: 'Analisa jam sibuk, pastikan coverage skill merata di tiap shift.' },
    { id: 't2', category: 'Technical', question: 'Apa langkah Anda jika ada mesin produksi/alat utama rusak mendadak?', idealAnswer: 'Punya plan B (backup manual/alat cadangan), panggil teknisi segera.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana cara mengukur produktivitas tim operasional?', idealAnswer: 'Output per jam, tingkat kesalahan (error rate), kepuasan pelanggan.' },
    { id: 't4', category: 'Technical', question: 'Strategi apa untuk mengurangi lembur (Overtime) yang membengkak?', idealAnswer: 'Evaluasi beban kerja, perbaiki workflow, atau tambah manpower jika perlu.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana Anda memastikan SOP dijalankan di lapangan?', idealAnswer: 'Briefing rutin, sidak/spot check, sistem reward/punishment.' },
    { id: 't6', category: 'Technical', question: 'Jelaskan cara Anda menangani komplain pelanggan yang eskalasi ke SPV?', idealAnswer: 'Dengarkan, empati, beri solusi win-win, follow up penyelesaian.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana manajemen logistik dan inventory di bawah supervisi Anda?', idealAnswer: 'Akurasi stok, kecepatan fulfillment, minimalisir dead stock.' },
    { id: 't8', category: 'Technical', question: 'Apa yang Anda lakukan untuk efisiensi biaya operasional (Cost Reduction)?', idealAnswer: 'Hemat energi, kurangi waste material, negosiasi vendor.' },
    { id: 't9', category: 'Technical', question: 'Bagaimana cara membangun kekompakan tim di lapangan?', idealAnswer: 'Komunikasi terbuka, gathering, adil dalam pembagian tugas.' },
    { id: 't10', category: 'Technical', question: 'Apa pengalaman Anda dalam menggunakan sistem ERP operasional?', idealAnswer: 'Menjelaskan tools yang dikuasai untuk monitoring.' }
  ],
  'Manager Operasional': [
    ...GENERAL_QUESTIONS,
    { id: 't1', category: 'Technical', question: 'Bagaimana Anda merancang sistem operasional yang scalable?', idealAnswer: 'SOP terstandarisasi, automasi sistem, struktur organisasi yang jelas.' },
    { id: 't2', category: 'Technical', question: 'Jelaskan konsep Lean Management dalam operasional?', idealAnswer: 'Menghilangkan pemborosan (waste) dalam proses untuk dimaksimalkan value.' },
    { id: 't3', category: 'Technical', question: 'Bagaimana strategi Anda dalam Supply Chain Management?', idealAnswer: 'Diversifikasi supplier, jaga safety stock, optimasi logistik.' },
    { id: 't4', category: 'Technical', question: 'Apa indikator keberhasilan (KPI) seorang Manager Operasional?', idealAnswer: 'Cost efficiency, Quality consistency, On-time delivery, Safety.' },
    { id: 't5', category: 'Technical', question: 'Bagaimana Anda memimpin transformasi digital di lini operasional?', idealAnswer: 'Change management, pelatihan SDM, implementasi bertahap.' },
    { id: 't6', category: 'Technical', question: 'Bagaimana cara menangani krisis besar (misal: bencana alam, mogok kerja)?', idealAnswer: 'Business Continuity Plan (BCP), komunikasi krisis, kepemimpinan tenang.' },
    { id: 't7', category: 'Technical', question: 'Bagaimana sinergi Operasional dengan Sales dan Finance?', idealAnswer: 'Ops support sales untuk deliver janji, ops support finance untuk kontrol budget.' },
    { id: 't8', category: 'Technical', question: 'Apa strategi Anda untuk Quality Control (QC) menyeluruh?', idealAnswer: 'QC bahan baku, QC proses, QC barang jadi, dan evaluasi feedback.' },
    { id: 't9', category: 'Technical', question: 'Bagaimana Anda mengembangkan talent/pemimpin masa depan di tim Anda?', idealAnswer: 'Mentoring, delegasi wewenang, rotasi jabatan.' },
    { id: 't10', category: 'Technical', question: 'Bagaimana analisis Anda terhadap tren otomatisasi/robotik di industri ini?', idealAnswer: 'Adaptif, melihat peluang efisiensi jangka panjang.' }
  ],
};
