// app/kategori/[slug]/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string; 

  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMerchantsByCategory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "merchants"), 
          where("category", "==", slug)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMerchants(data);
      } catch (error) {
        console.error("Gagal ambil data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchMerchantsByCategory();
  }, [slug]);

  return (
    <main className="w-full sm:max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden flex flex-col font-sans">
      
      {/* HEADER KATEGORI */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => router.push('/')} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-800 capitalize">{slug}</h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tersedia {merchants.length} Tempat</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-32 no-scrollbar">
        
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-full aspect-square bg-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : merchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            </div>
            <p className="text-sm font-bold text-slate-500">Belum ada mitra {slug} di lokasi ini.</p>
          </div>
        ) : (
          /* GRID 2 KOLOM */
          <div className="grid grid-cols-2 gap-3">
            {merchants.map((merchant) => {
              const hasRating = merchant.rating && merchant.rating > 0;
              const hasCity = merchant.city && merchant.city.trim() !== '';

              return (
                <div 
                  key={merchant.id} 
                  onClick={() => {
                      // SEKARANG MENGARAH KE PROFIL MERCHANT
                      router.push(`/merchant/${merchant.id}`);
                  }} 
                  className="relative w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden shadow-sm cursor-pointer group border border-slate-200/60 active:scale-95 transition-all duration-300"
                >
                  {/* GAMBAR TOKO */}
                  {merchant.imageUrl ? (
                    <img 
                      src={merchant.imageUrl} 
                      alt={merchant.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100">
                      <span className="text-3xl text-slate-400">🏪</span>
                    </div>
                  )}

                  {/* GRADIENT OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90"></div>

                  {/* INFO MELAYANG */}
                  <div className="absolute bottom-0 left-0 w-full p-3">
                    <h3 className="text-white font-bold text-xs truncate tracking-wide leading-tight mb-1.5">
                      {merchant.name.toUpperCase()}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      {/* RATING DINAMIS */}
                      {hasRating ? (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                          <p className="text-[10px] font-bold text-white">{merchant.rating}</p>
                        </div>
                      ) : (
                        <div className="bg-blue-500/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                          ⭐ Baru
                        </div>
                      )}

                      {/* ALAMAT DINAMIS */}
                      {hasCity && (
                        <p className="text-[9px] text-slate-300 font-medium truncate max-w-[60px]">
                          {merchant.city}
                        </p>
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
      <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </main>
  );
}