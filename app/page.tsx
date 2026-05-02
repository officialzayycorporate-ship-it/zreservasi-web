// app/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

// DATA BANNER & KATEGORI
const promos = [
  { bg: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=800&auto=format&fit=crop", title: "Punya Tempat Menarik? Gabung Mitra Zreservasi!", subtitle: "Daftar gratis & tingkatkan pengunjung Anda." },
  { bg: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop", title: "Kelola Reservasi Lebih Mudah & Profesional", subtitle: "Cocok untuk Resto, Futsal, dan Barbershop." },
];

const otherMenus = [
  { name: "Billiard", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><circle cx="12" cy="16" r="3" /><circle cx="16" cy="10" r="3" /><circle cx="8" cy="10" r="3" /></svg>, path: "/kategori/billiard", color: "text-red-600", bg: "bg-red-50", hover: "group-hover:bg-red-600" },
  { name: "Salon", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>, path: "/kategori/salon", color: "text-pink-500", bg: "bg-pink-50", hover: "group-hover:bg-pink-500" },
  { name: "Karaoke", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>, path: "/kategori/karaoke", color: "text-indigo-600", bg: "bg-indigo-50", hover: "group-hover:bg-indigo-600" },
  { name: "Badminton", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75a5.25 5.25 0 1 0-7.425 7.425l6.364 6.364a1.5 1.5 0 0 0 2.121 0l1.061-1.06l-6.364-6.365a5.25 5.25 0 0 0 4.243-6.364Z" /></svg>, path: "/kategori/badminton", color: "text-orange-600", bg: "bg-orange-50", hover: "group-hover:bg-orange-600" },
  { name: "Gym & Fit", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, path: "/kategori/gym", color: "text-zinc-700", bg: "bg-zinc-100", hover: "group-hover:bg-zinc-700" },
  { name: "Cafe", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75H4.5A2.25 2.25 0 0 0 2.25 6v7.5a5.25 5.25 0 0 0 5.25 5.25h5.25a5.25 5.25 0 0 0 5.25-5.25V6a2.25 2.25 0 0 0-2.25-2.25Zm0 0v1.5a3.75 3.75 0 0 1-3.75 3.75H4.5" /></svg>, path: "/kategori/cafe", color: "text-amber-700", bg: "bg-amber-50", hover: "group-hover:bg-amber-700" },
  { name: "Studio", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163Z" /></svg>, path: "/kategori/studio", color: "text-purple-600", bg: "bg-purple-50", hover: "group-hover:bg-purple-600" },
  { name: "Spa", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18c-3 0-6 2-6 6s6 6 6 6m0-12c3 0 6 2 6 6s-6 6-6 6" /></svg>, path: "/kategori/spa", color: "text-teal-600", bg: "bg-teal-50", hover: "group-hover:bg-teal-600" },
];

// FUNGSI MATEMATIKA UNTUK MENGHITUNG JARAK (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c; 
  return distance; 
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false); 
  const [merchants, setMerchants] = useState<any[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<any[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // STATE LOKASI PENGGUNA
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("Mencari lokasi...");

  // 1. Sinkronisasi Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push('/login');
      else setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  // 2. Minta Izin Lokasi GPS dari Browser HP Pelanggan
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus("Lokasi Terdekat 📍");
        },
        (error) => {
          console.warn("GPS Error:", error);
          setLocationStatus("GPS Dinonaktifkan ⚠️");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationStatus("GPS Tidak Didukung");
    }
  }, []);

  // 3. Ambil data Merchant dan Hitung Jarak
  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const q = query(collection(db, "merchants"), where("status", "==", "subscribed"));
        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // JIKA LOKASI PENGGUNA TERDETEKSI, HITUNG JARAK DAN URUTKAN!
        if (userLocation) {
          data = data.map((merchant: any) => {
            // Cek apakah merchant punya data latitude & longitude di database
            if (merchant.latitude && merchant.longitude) {
              const dist = calculateDistance(userLocation.lat, userLocation.lng, merchant.latitude, merchant.longitude);
              return { ...merchant, distance: dist };
            }
            return { ...merchant, distance: 9999 }; // Jika toko belum set koordinat, taruh paling bawah
          });

          // Urutkan dari yang Jaraknya Paling Dekat
          data.sort((a: any, b: any) => a.distance - b.distance);
        }

        setMerchants(data);
        setFilteredMerchants(data);
      } catch (error) {
        console.error("Gagal menarik data merchant:", error);
      } finally {
        setLoadingMerchants(false);
      }
    };
    fetchMerchants();
  }, [userLocation]); // Re-run jika lokasi pengguna berhasil didapatkan

  // 4. Auto-Slide Banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === promos.length - 1 ? 0 : prev + 1));
    }, 4000); 
    return () => clearInterval(timer);
  }, []);

  // 5. Fungsi Pencarian (Nama, Kategori, atau Lokasi Manual)
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const searchLow = text.toLowerCase();
    
    const filtered = merchants.filter((m) => {
      return (
        m.name?.toLowerCase().includes(searchLow) || 
        m.category?.toLowerCase().includes(searchLow) ||
        m.city?.toLowerCase().includes(searchLow) ||
        m.address?.toLowerCase().includes(searchLow)
      );
    });
    setFilteredMerchants(filtered);
  };

  if (!user) return null;

  return (
    <main className="w-full sm:max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden flex flex-col font-sans">
      
      {/* HEADER DENGAN INFO LOKASI & SEARCH */}
      <div className="bg-blue-600 px-5 pt-10 pb-[4.5rem] rounded-b-[2rem] text-white shrink-0 relative z-10 shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[10px] text-blue-200 opacity-90 uppercase font-bold tracking-wider mb-1">Lokasi Anda Saat Ini</p>
            <div className="flex items-center gap-1.5 bg-blue-700/50 w-fit px-2.5 py-1.5 rounded-lg border border-blue-500/50">
              <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <h1 className="text-[11px] font-bold tracking-wide">{locationStatus}</h1>
            </div>
          </div>
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm border border-white/30 backdrop-blur-md shadow-sm uppercase">
            {user?.email?.[0]}
          </div>
        </div>
        
        {/* INPUT SEARCH */}
        <div className="bg-white rounded-xl flex items-center px-4 py-3 shadow-xl absolute left-5 right-5 -bottom-5 border border-slate-100">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input 
            type="text" 
            placeholder="Cari Nama, Layanan, atau Kota..." 
            className="w-full bg-transparent border-none outline-none ml-2 text-xs text-slate-700 placeholder:text-slate-400 font-medium" 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 pt-12 no-scrollbar px-5">
        
        {/* BANNER PROMO */}
        {!searchQuery && (
          <div className="mb-6">
            <div className="w-full h-[150px] rounded-2xl relative overflow-hidden shadow-md group cursor-pointer" onClick={() => alert("Halaman Pendaftaran Mitra (Segera Hadir!)")}>
              {promos.map((promo, idx) => (
                <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                  <img src={promo.bg} className="w-full h-full object-cover" alt="promo" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent p-5 flex flex-col justify-end">
                    <p className="text-white font-bold text-[13px] leading-tight mb-1">{promo.title}</p>
                    <p className="text-blue-200 text-[10px] font-medium">{promo.subtitle} →</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU KATEGORI */}
        {!searchQuery && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-wider">Pilih Layanan</h2>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              <div onClick={() => router.push('/kategori/resto')} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm border border-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 14.25v-8.5A2.25 2.25 0 0 1 6.75 3.5h10.5a2.25 2.25 0 0 1 2.25 2.25v8.5a5.25 5.25 0 0 1-5.25 5.25H9.75A5.25 5.25 0 0 1 4.5 14.25Z" /></svg>
                </div>
                <p className="text-[10px] font-semibold text-slate-600">Resto</p>
              </div>
              <div onClick={() => router.push('/kategori/futsal')} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm border border-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-green-600 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7l-3 4h6l-3-4zM7.5 14l2.5-3M16.5 14l-2.5-3M12 17v-3" /></svg>
                </div>
                <p className="text-[10px] font-semibold text-slate-600">Futsal</p>
              </div>
              <div onClick={() => router.push('/kategori/barbershop')} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm border border-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 18a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M7.4 8.6 18 18M7.4 19.4 18 10" /></svg>
                </div>
                <p className="text-[10px] font-semibold text-slate-600">Barber</p>
              </div>
              <div onClick={() => setShowMoreMenu(true)} className="flex flex-col items-center gap-2.5 cursor-pointer group">
                <div className="w-14 h-14 bg-white rounded-[1.25rem] shadow-sm border border-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>
                </div>
                <p className="text-[10px] font-semibold text-slate-600">Lainnya</p>
              </div>
            </div>
          </div>
        )}

        {/* LIST MERCHANT HASIL FILTER (Rekomendasi Eksklusif) */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[14px] font-black text-slate-800 tracking-tight uppercase">
            {searchQuery ? `Hasil Pencarian` : "Paling Dekat Dengan Anda"}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase">
            {filteredMerchants.length} Tempat
          </p>
        </div>

        {loadingMerchants ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-full h-40 bg-slate-200 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="w-full p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
            <div className="text-4xl mb-3 opacity-50">🔍</div>
            <p className="text-xs font-black text-slate-700">Tidak Ditemukan</p>
            <p className="text-[10px] text-slate-400 mt-1">Belum ada mitra di sekitar Anda atau kata kunci salah.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredMerchants.map((merchant) => {
              const isNew = !merchant.rating || merchant.rating === 0;
              return (
                <div 
                  key={merchant.id} 
                  onClick={() => router.push(`/merchant/${merchant.id}`)} 
                  className="relative w-full h-44 bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer border border-slate-200/50 active:scale-95 transition-all flex flex-col"
                >
                  <div className="w-full h-28 relative">
                    {merchant.imageUrl ? (
                      <img src={merchant.imageUrl} alt={merchant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">🏪</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    {/* TAMPILAN JARAK (KM) JIKA TERSEDIA */}
                    {merchant.distance && merchant.distance < 9999 && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                        <svg className="w-2.5 h-2.5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
                        <span className="text-[9px] font-black text-slate-800">{merchant.distance.toFixed(1)} km</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-2.5 flex flex-col justify-between bg-white">
                    <h3 className="text-slate-800 font-black text-[11px] truncate tracking-wide leading-tight mb-1">
                      {merchant.name}
                    </h3>
                    
                    <div className="flex items-center justify-between">
                      {isNew ? (
                        <div className="bg-blue-50 px-1.5 py-0.5 rounded text-[8px] font-black text-blue-600 uppercase tracking-wider border border-blue-100">
                          ⭐ Baru
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          <p className="text-[10px] font-bold text-slate-700">{merchant.rating}</p>
                        </div>
                      )}
                      
                      <p className="text-[9px] text-slate-400 font-medium truncate max-w-[60px]">
                        {merchant.city || 'Tersedia'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
      
      {/* MODAL LAINNYA */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="absolute inset-0" onClick={() => setShowMoreMenu(false)}></div>
          <div className="w-full sm:max-w-md bg-white rounded-t-[2rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[70vh] relative z-10">
            <div className="w-full flex justify-center pt-4 pb-2 bg-white shrink-0"><div className="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
            <div className="px-6 pb-4 pt-2 flex justify-between items-center bg-white shrink-0 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Semua Layanan</h3>
              <button onClick={() => setShowMoreMenu(false)} className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div className="overflow-y-auto no-scrollbar pb-10 px-6 pt-6">
              <div className="grid grid-cols-4 gap-y-8 gap-x-2">
                {otherMenus.map((menu, index) => (
                  <div key={index} onClick={() => { setShowMoreMenu(false); router.push(menu.path); }} className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className={`w-14 h-14 ${menu.bg} rounded-[1.25rem] flex items-center justify-center group-hover:text-white ${menu.hover} transition-all shadow-sm border border-white`}><span className={`${menu.color} group-hover:text-white transition-colors`}>{menu.icon}</span></div>
                    <p className="text-[10px] font-bold text-slate-600">{menu.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </main>
  );
}