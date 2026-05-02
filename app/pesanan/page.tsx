// app/pesanan/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore'; 
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

  // 2. Tarik Data Pesanan Real-Time
  useEffect(() => {
    if (!user?.email) return;

    setLoading(true);
    const q = query(
      collection(db, "reservations"), 
      where("customerEmail", "==", user.email)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

  // --- FUNGSI BARU: FORMAT TANGGAL PINTAR ---
  const formatTanggal = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  // --- FUNGSI BARU: BATALKAN PESANAN ---
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
                  <div className="flex justify-between items-end bg-blue-50/50 p-3 rounded-xl border border-blue-50">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 mb-0.5">Layanan / Ruangan</p>
                      <p className="text-xs font-bold text-blue-900">{item.assetName || "Belum dipilih"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-blue-400 mb-0.5">Total Bayar</p>
                      <p className="text-sm font-black text-blue-700">{formatRupiah(item.totalPrice)}</p>
                    </div>
                  </div>

                  {/* TOMBOL BUKTI TRANSFER UNTUK PELANGGAN */}
                  {item.receiptUrl && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Bukti Terkirim
                      </p>
                      <a 
                        href={item.receiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100 transition shadow-sm"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        Lihat Foto
                      </a>
                    </div>
                  )}

                  {/* INFO & TOMBOL BATAL JIKA MASIH PENDING */}
                  {isPending && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 font-medium max-w-[200px]">
                        Menunggu konfirmasi dari pihak pengelola.
                      </p>
                      <button 
                        onClick={() => handleCancelReservation(item.id)}
                        className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        Batalkan
                      </button>
                    </div>
                  )}
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