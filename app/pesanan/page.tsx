// app/pesanan/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
// TAMBAHAN: Import getDoc untuk mengambil data dari koleksi merchants
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore'; 
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function PesananPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Semua');

  const filters = ['Semua', 'Menunggu', 'Selesai'];

  // 1. Cek Login User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push('/login');
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Tarik Data Pesanan & Gabungkan dengan Data Merchant
  useEffect(() => {
    if (!user?.email) return;

    setLoading(true);
    const q = query(
      collection(db, "reservations"), 
      where("customerEmail", "==", user.email)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      // Kita gunakan Promise.all karena kita akan menarik data merchant satu per satu
      const dataPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const resData = docSnapshot.data();
        let merchantPhone = resData.phone || ""; // Cek apakah sudah ada di tabel reservations

        // Jika tidak ada nomor HP di reservations, ambil dari tabel merchants berdasarkan merchantId
        if (!merchantPhone && resData.merchantId) {
           try {
              const merchantRef = doc(db, "merchants", resData.merchantId);
              const merchantSnap = await getDoc(merchantRef);
              if (merchantSnap.exists()) {
                 merchantPhone = merchantSnap.data().phone || "";
              }
           } catch (error) {
              console.error("Gagal mengambil data merchant:", error);
           }
        }

        return {
          id: docSnapshot.id,
          ...resData,
          merchantPhone: merchantPhone // Simpan nomor telepon yang didapat
        };
      });

      const data = await Promise.all(dataPromises);

      // Urutkan dari yang terbaru
      data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setReservations(data);
      setLoading(false);
    }, (error) => {
      console.error("Gagal menarik data pesanan:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- FUNGSI FORMAT RUPIAH ---
  const formatRupiah = (angka: string) => {
    if (!angka || angka === '0') return "Gratis";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseInt(angka));
  };

  // --- FUNGSI FORMAT TANGGAL ---
  const formatTanggal = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // --- FUNGSI BATALKAN PESANAN ---
  const handleCancelReservation = async (reservationId: string) => {
    const confirmCancel = window.confirm("Apakah Anda yakin ingin membatalkan pesanan ini?");
    if (!confirmCancel) return;

    try {
      await deleteDoc(doc(db, "reservations", reservationId));
      alert("Pesanan berhasil dibatalkan.");
    } catch (error) {
      console.error("Error cancelling:", error);
      alert("Gagal membatalkan pesanan. Silakan coba lagi.");
    }
  };

  const filteredReservations = reservations.filter(res => {
    if (activeFilter === 'Semua') return true;
    if (activeFilter === 'Menunggu') return res.status === 'pending';
    if (activeFilter === 'Selesai') return res.status === 'confirmed';
    return true;
  });

  if (!user) return <div className="min-h-screen bg-slate-50"></div>;

  return (
    <main className="w-full sm:max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="bg-white px-5 pt-10 pb-4 border-b border-slate-100 flex flex-col z-10 shadow-sm shrink-0">
        <h1 className="font-black text-2xl text-slate-800">Pesanan Saya</h1>
        <p className="text-sm text-slate-500 mt-1">Pantau status reservasi Anda di sini</p>
        
        <div className="flex gap-2 mt-5 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === filter 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* DAFTAR PESANAN */}
      <div className="flex-1 overflow-y-auto p-5 pb-28 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20">
             <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-sm font-bold text-slate-500">Memuat riwayat...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center mt-20 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
              </svg>
            </div>
            <h3 className="font-bold text-slate-700 text-lg">Belum ada pesanan</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Anda belum memiliki riwayat reservasi untuk kategori ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((item) => {
              const isPending = item.status === 'pending';
              const isConfirmed = item.status === 'confirmed';

              // ==========================================
              // LOGIKA WHATSAPP MERHCHANT
              // ==========================================
              let phone = item.merchantPhone || ""; 
              
              // Bersihkan nomor (hapus spasi, strip, dll)
              phone = phone.replace(/\D/g,''); 
              
              // Ubah awalan 0 menjadi 62 standar WhatsApp
              if (phone.startsWith('0')) {
                phone = '62' + phone.slice(1);
              }

              // Pesan otomatis yang akan terkirim
              const pesanTeks = `Halo Admin *${item.placeName || "Merchant"}*, saya ingin bertanya terkait pesanan atas nama *${user.email}* untuk layanan *${item.assetName || "-"}* pada tanggal *${formatTanggal(item.bookingDate)}* jam *${item.bookingTime}*.`;
              const linkWhatsApp = `https://wa.me/${phone}?text=${encodeURIComponent(pesanTeks)}`;
              // ==========================================

              return (
                <div key={item.id} className="bg-white rounded-3xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
                  
                  {/* Bagian Atas: Info Toko & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConfirmed ? 'bg-green-50' : 'bg-orange-50'}`}>
                        <span className="text-lg">{isConfirmed ? '✅' : '⏳'}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-sm">{item.placeName || "Tempat Usaha"}</h3>
                        <p className="text-[10px] font-bold text-slate-400 capitalize">{item.category || "Layanan"}</p>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      isPending ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {isPending ? 'Menunggu' : 'Selesai'}
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-100 my-3"></div>

                  {/* Bagian Tengah: Detail Jadwal */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 mb-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Tanggal
                      </p>
                      <p className="text-xs font-bold text-slate-700">{formatTanggal(item.bookingDate)}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                      <p className="text-[10px] font-bold text-slate-400 mb-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Jam
                      </p>
                      <p className="text-xs font-bold text-slate-700">{item.bookingTime}</p>
                    </div>
                  </div>

                  {/* Bagian Bawah: Info Aset & Harga */}
                  <div className="flex justify-between items-end bg-blue-50/50 p-3 rounded-xl border border-blue-50 mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 mb-0.5">Layanan / Ruangan</p>
                      <p className="text-xs font-bold text-blue-900">{item.assetName || "Belum dipilih"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-blue-400 mb-0.5">Total Bayar</p>
                      <p className="text-sm font-black text-blue-700">{formatRupiah(item.totalPrice)}</p>
                    </div>
                  </div>

                  {/* INFO & TOMBOL AKSI (CHAT & BATAL) */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                    {isPending && (
                      <p className="text-[10px] text-slate-400 font-medium">
                        Menunggu konfirmasi dari pihak pengelola.
                      </p>
                    )}
                    
                    <div className="flex items-center justify-end gap-2">
                      {/* Tombol Chat WA (Hanya muncul jika merchant mengatur nomor HP) */}
                      {phone && phone.length > 5 && (
                        <a 
                          href={linkWhatsApp} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-green-100 transition border border-green-100"
                        >
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Chat Admin
                        </a>
                      )}

                      {/* Tombol Batalkan */}
                      {isPending && (
                        <button 
                          onClick={() => handleCancelReservation(item.id)}
                          className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition border border-red-100"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}