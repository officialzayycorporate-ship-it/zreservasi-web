// components/BookingModal.tsx
'use client'
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  category: string;
  userEmail: string;
  merchantId: string;
  merchantSchedule?: any; 
  merchantHolidays?: string[];
  preselectedAssetId?: string; 
}

export default function BookingModal({ 
  isOpen, onClose, placeName, category, userEmail, merchantId, 
  merchantSchedule, merchantHolidays, preselectedAssetId
}: BookingModalProps) {
  const [nama, setNama] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jam, setJam] = useState('');
  
  const [minTime, setMinTime] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [scheduleInfo, setScheduleInfo] = useState('');
  
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);

  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatRupiah = (angka: string) => {
    if (!angka || angka === '0') return "Gratis / Harga belum diset";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseInt(angka));
  };

  // --- FUNGSI BARU: SATUAN HARGA DINAMIS ---
  const getPriceUnit = (cat: string) => {
    if (!cat) return '';
    const categoryLower = cat.toLowerCase();
    const hourly = ['futsal', 'billiard', 'karaoke', 'badminton', 'studio'];
    const session = ['barbershop', 'salon', 'spa', 'gym'];
    
    if (hourly.includes(categoryLower)) return '/ Jam';
    if (session.includes(categoryLower)) return '/ Sesi';
    return '(DP / Min.Order)';
  };

  useEffect(() => {
    if (isOpen && merchantId) {
      const fetchData = async () => {
        setLoadingAssets(true);
        try {
          const q = query(collection(db, "assets"), where("merchantId", "==", merchantId), where("status", "==", "available"));
          const querySnapshot = await getDocs(q);
          const assetData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAssets(assetData);

          if (preselectedAssetId) {
            const foundAsset = assetData.find(a => a.id === preselectedAssetId);
            if (foundAsset) {
              setSelectedAsset(foundAsset);
            }
          }

          const merchantRef = doc(db, "merchants", merchantId);
          const merchantSnap = await getDoc(merchantRef);
          if (merchantSnap.exists()) {
            setMerchantInfo(merchantSnap.data());
          }
        } catch (error) {
          console.error("Gagal mengambil data:", error);
        } finally {
          setLoadingAssets(false);
        }
      };
      fetchData();
    }
  }, [isOpen, merchantId, preselectedAssetId]); 

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    
    if (merchantHolidays && merchantHolidays.includes(selectedDate)) {
      alert("Maaf, toko tutup/libur pada tanggal tersebut. Silakan pilih hari lain.");
      setTanggal('');
      setMinTime(''); setMaxTime(''); setScheduleInfo('');
      return;
    }

    if (merchantSchedule && selectedDate) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      
      let dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0) dayOfWeek = 7; 

      const schedule = merchantSchedule[dayOfWeek.toString()];
      
      if (!schedule || schedule.active === false) {
        alert("Maaf, toko tidak beroperasi (tutup) pada hari tersebut. Silakan pilih hari lain.");
        setTanggal('');
        setMinTime(''); setMaxTime(''); setScheduleInfo('');
        return;
      }

      setMinTime(schedule.open);
      setMaxTime(schedule.close);
      setScheduleInfo(`Jam Operasional: ${schedule.open} - ${schedule.close}`);

      if (jam && (jam < schedule.open || jam > schedule.close)) {
        setJam('');
      }
    }
    
    setTanggal(selectedDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedTime = e.target.value;
    
    if (!tanggal) {
      alert("Silakan pilih Tanggal terlebih dahulu!");
      setJam('');
      return;
    }

    if (minTime && maxTime) {
      if (selectedTime < minTime || selectedTime > maxTime) {
        alert(`Mohon pilih jam antara ${minTime} hingga ${maxTime} sesuai jam operasional toko.`);
        setJam('');
        return;
      }
    }
    setJam(selectedTime);
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal || !jam || !selectedAsset) return alert("Mohon lengkapi Tanggal, Jam, dan pilih Ruangan/Aset!");
    
    const hasPaymentInfo = merchantInfo && (merchantInfo.bankAccount || merchantInfo.qrisUrl);
    if (hasPaymentInfo && !receiptFile) {
      return alert("Mohon unggah bukti transfer pembayaran DP Anda!");
    }
    
    setLoadingForm(true);
    try {
      // --- LOGIKA BARU: CEK KETERSEDIAAN (ANTI DOUBLE BOOKING) ---
      const qCheck = query(
        collection(db, "reservations"),
        where("merchantId", "==", merchantId),
        where("bookingDate", "==", tanggal),
        where("bookingTime", "==", jam),
        where("assetName", "==", selectedAsset.name),
        where("status", "==", "confirmed") // Hanya cek yang statusnya sudah 'confirmed'
      );

      const checkSnapshot = await getDocs(qCheck);

      if (!checkSnapshot.empty) {
        setLoadingForm(false);
        return alert(`Maaf, ${selectedAsset.name} sudah dipesan orang lain pada jam tersebut. Silakan pilih jam atau layanan lain.`);
      }
      // -------------------------------------------------------------

      let receiptUrl = "";

      if (receiptFile) {
        const storage = getStorage();
        const fileRef = ref(storage, `receipts/${merchantId}_${Date.now()}_${receiptFile.name}`);
        await uploadBytes(fileRef, receiptFile);
        receiptUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, "reservations"), {
        merchantId: merchantId,
        customerName: nama || userEmail.split('@')[0], 
        customerEmail: userEmail,
        bookingDate: tanggal, 
        bookingTime: jam,     
        assetName: selectedAsset.name, 
        totalPrice: selectedAsset.price || "0", 
        receiptUrl: receiptUrl, 
        status: "pending", 
        createdAt: serverTimestamp(),
        placeName: placeName,
        category: category
      });
      
      alert(`Reservasi ${selectedAsset.name} di ${placeName} Berhasil Menunggu Konfirmasi!`);
      
      setTanggal(''); setJam(''); setNama(''); setSelectedAsset(null); setReceiptFile(null);
      onClose(); 
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat booking, coba lagi.");
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="w-full sm:max-w-md bg-white rounded-t-[2rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        <div className="w-full flex justify-center pt-3 pb-1 bg-white shrink-0">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="px-6 pb-4 pt-2 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-800">Buat Reservasi</h3>
            <p className="text-sm font-bold text-blue-600">{placeName}</p>
          </div>
          <button onClick={onClose} className="bg-slate-100 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="overflow-y-auto no-scrollbar pb-10 px-6 pt-5 flex-1">
          <form onSubmit={handleBooking} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 ml-1">Pilih Ruangan / Layanan *</label>
              {loadingAssets ? (
                <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500 text-center animate-pulse">
                  Mencari ruangan tersedia...
                </div>
              ) : assets.length === 0 ? (
                <div className="w-full p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 text-center font-medium">
                  Maaf, tidak ada ruangan/layanan yang tersedia saat ini.
                </div>
              ) : (
                <select 
                  value={selectedAsset ? selectedAsset.id : ""}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  onChange={(e) => {
                    const found = assets.find(a => a.id === e.target.value);
                    setSelectedAsset(found || null);
                  }}
                  required
                >
                  <option value="" disabled>-- Klik untuk pilih --</option>
                  {/* LOGIKA BARU: Teks dropdown pintar berdasarkan kategori dan harga */}
                  {assets.map(asset => {
                    const priceText = asset.price && asset.price !== '0' 
                      ? `${formatRupiah(asset.price)} ${getPriceUnit(category)}` 
                      : 'Gratis Booking';
                      
                    return (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} {asset.capacity !== '1' ? `(Kapasitas: ${asset.capacity} Org)` : ''} - {priceText}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 ml-1">Nama Pemesan</label>
              <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Atas nama siapa?" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-blue-500 text-slate-800" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Tanggal *</label>
                <input 
                  type="date" 
                  min={getTodayDate()} 
                  value={tanggal} 
                  onChange={handleDateChange} 
                  required 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-blue-500 text-slate-800" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 ml-1">Jam *</label>
                <input 
                  type="time" 
                  min={minTime}
                  max={maxTime}
                  value={jam} 
                  onChange={handleTimeChange} 
                  required 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-blue-500 text-slate-800" 
                />
              </div>
            </div>

            {scheduleInfo && (
              <p className="text-[11px] font-bold text-blue-600 text-right -mt-2">
                ✅ {scheduleInfo}
              </p>
            )}

            {merchantInfo && (merchantInfo.bankAccount || merchantInfo.qrisUrl) && selectedAsset && (
              <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-slide-up">
                <h4 className="text-sm font-black text-blue-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  Pembayaran DP / Lunas
                </h4>
                
                <p className="text-xs text-blue-700 mb-4">Total yang harus dibayar: <strong className="text-lg">{formatRupiah(selectedAsset.price)}</strong></p>

                {merchantInfo.bankAccount && (
                  <div className="mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{merchantInfo.bankName}</p>
                    <p className="text-base font-black text-slate-800 leading-none my-1 tracking-wider">{merchantInfo.bankAccount}</p>
                    <p className="text-xs text-slate-600 font-medium">a.n {merchantInfo.bankOwner}</p>
                  </div>
                )}

                {merchantInfo.qrisUrl && (
                  <div className="flex flex-col items-center mb-4">
                    <p className="text-xs font-bold text-slate-600 mb-2">Atau Scan QRIS di bawah ini:</p>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <img src={merchantInfo.qrisUrl} alt="QRIS Payment" className="w-40 h-40 object-contain rounded-lg" />
                    </div>
                  </div>
                )}
                
                <div className="mt-4 border-t border-blue-200 pt-4">
                  <label className="block text-xs font-bold text-blue-800 mb-2">Upload Bukti Transfer *</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-blue-500 mt-2">Pastikan foto bukti transfer terlihat jelas.</p>
                </div>
              </div>
            )}

            <button type="submit" disabled={loadingForm || assets.length === 0} className={`w-full mt-4 py-4 text-white font-bold rounded-2xl transition-all ${loadingForm || assets.length === 0 ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xl shadow-blue-600/30'}`}>
              {loadingForm ? 'Mengunggah Bukti & Memproses...' : 'Konfirmasi Booking'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}