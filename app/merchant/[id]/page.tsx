// app/merchant/[id]/page.tsx
'use client'
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; // <--- UPDATE: Import auth
import { onAuthStateChanged } from 'firebase/auth'; // <--- UPDATE: Import onAuthStateChanged
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import BookingModal from '@/components/BookingModal';

export default function MerchantProfile() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [merchant, setMerchant] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpenNow, setIsOpenNow] = useState<boolean>(true); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [preselectedAssetId, setPreselectedAssetId] = useState<string>('');

  // --- LOGIKA BARU: Tarik Email Asli dari Firebase Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email) {
        setUserEmail(currentUser.email);
      } else {
        setUserEmail(''); // Kosongkan jika belum login
      }
    });

    const fetchDetail = async () => {
      try {
        const merchantDoc = await getDoc(doc(db, "merchants", id));
        if (merchantDoc.exists()) {
          const merchantData = merchantDoc.data();
          setMerchant(merchantData);
          checkStoreStatus(merchantData);
        }

        const q = query(collection(db, "assets"), where("merchantId", "==", id));
        const querySnapshot = await getDocs(q);
        const assetData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssets(assetData);
      } catch (error) {
        console.error("Error fetching merchant profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetail();
    
    return () => unsubscribe();
  }, [id]);

  const checkStoreStatus = (data: any) => {
    if (!data.operationalHours) {
      setIsOpenNow(true);
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayDateString = `${year}-${month}-${day}`; 

    if (data.holidays && data.holidays.includes(todayDateString)) {
      setIsOpenNow(false); 
      return;
    }

    let currentDayOfWeek = now.getDay(); 
    if (currentDayOfWeek === 0) currentDayOfWeek = 7; 

    const todaySchedule = data.operationalHours[currentDayOfWeek.toString()];
    
    if (!todaySchedule || todaySchedule.active === false) {
      setIsOpenNow(false); 
      return;
    }

    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMin = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMin}`;

    if (currentTimeStr >= todaySchedule.open && currentTimeStr <= todaySchedule.close) {
      setIsOpenNow(true); 
    } else {
      setIsOpenNow(false); 
    }
  };

  const formatRupiah = (angka: any) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(angka));
  };

  const getPriceUnit = (category: string) => {
    const hourly = ['futsal', 'billiard', 'karaoke', 'badminton', 'studio'];
    const session = ['barbershop', 'salon', 'spa', 'gym'];
    if (hourly.includes(category)) return '/ Jam';
    if (session.includes(category)) return '/ Sesi';
    return '(DP / Min.Order)'; 
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!merchant) return <div className="p-10 text-center">Merchant tidak ditemukan.</div>;

  const hasRating = merchant.rating && merchant.rating > 0;

  return (
    <main className="w-full sm:max-w-md mx-auto min-h-screen bg-white relative flex flex-col font-sans">
      
      <div className="relative h-40 w-full shrink-0">
        <button 
          onClick={() => router.back()}
          className="absolute top-10 left-5 z-20 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-lg"
        >
          <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        
        {merchant.imageUrl ? (
          <img src={merchant.imageUrl} alt={merchant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl">🏪</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      </div>

      <div className="px-5 -mt-8 relative z-10">
        <div className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-800 leading-tight">{merchant.name}</h1>
              <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">{merchant.category}</p>
            </div>
            
            {hasRating ? (
              <div className="bg-orange-50 px-3 py-1.5 rounded-xl flex items-center gap-1 border border-orange-100">
                <span className="text-orange-500 text-xs">⭐</span>
                <span className="text-xs font-black text-orange-700">{merchant.rating}</span>
              </div>
            ) : (
              <div className="bg-blue-600 px-2.5 py-1.5 rounded-lg flex items-center shadow-sm">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">⭐ Baru</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-slate-500">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <p className="text-[11px] font-medium leading-relaxed">{merchant.address || 'Alamat belum diatur oleh pengelola.'}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${isOpenNow ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-wider">{isOpenNow ? 'BUKA SEKARANG' : 'SEDANG TUTUP'}</span>
            </div>
            {!isOpenNow && (
              <p className="text-[10px] text-slate-400 font-medium">Bisa pesan untuk hari lain</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 mt-2 flex-1">
        <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
          Daftar Ruangan / Layanan
        </h2>

        {assets.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 font-medium italic">
            Belum ada ruangan yang tersedia untuk dipesan.
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                <div className="h-28 w-full relative">
                  {asset.imageUrl ? (
                    <img src={asset.imageUrl} className="w-full h-full object-cover" alt={asset.name} />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <span className="text-[10px] text-slate-400 mt-1.5 font-bold">Foto Belum Tersedia</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-blue-600 shadow-sm">
                    {asset.price && asset.price !== '0' ? `${formatRupiah(asset.price)} ${getPriceUnit(merchant.category)}` : 'Gratis Booking'}
                  </div>
                </div>
                
                <div className="p-3.5 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{asset.name}</h3>
                    {asset.capacity && asset.capacity !== '1' && (
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 tracking-tight">Kapasitas Maks: {asset.capacity} Orang</p>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      // --- LOGIKA BARU: TOLAK JIKA BELUM LOGIN ---
                      if (!userEmail) {
                        alert("Silakan Login terlebih dahulu untuk melakukan reservasi.");
                        router.push('/login');
                        return;
                      }
                      setPreselectedAssetId(asset.id);
                      setIsModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-200 active:scale-95 transition-all"
                  >
                    Pilih
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <BookingModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setPreselectedAssetId(''); 
          }}
          placeName={merchant.name}
          category={merchant.category}
          userEmail={userEmail}
          merchantId={id}
          merchantSchedule={merchant?.operationalHours} 
          merchantHolidays={merchant?.holidays}
          preselectedAssetId={preselectedAssetId} 
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; }`}} />
    </main>
  );
}