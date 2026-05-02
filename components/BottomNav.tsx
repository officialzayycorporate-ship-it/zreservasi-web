// components/BottomNav.tsx
'use client'
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Fungsi untuk Logout
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar?");
    if (confirmLogout) {
      try {
        await signOut(auth);
        router.push('/login');
      } catch (error) {
        console.error("Gagal logout:", error);
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full sm:max-w-md mx-auto bg-white border-t border-slate-100 flex justify-around items-center pb-6 pt-3 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-50">
      
      {/* Tombol 1: Beranda */}
      <button 
        onClick={() => router.push('/')} 
        className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
      >
        <svg className="w-6 h-6" fill={pathname === '/' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={pathname === '/' ? "0" : "1.5"}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
        <span className="text-[10px] font-bold">Beranda</span>
      </button>

      {/* Tombol 2: Pesanan (Sekarang sudah tersambung!) */}
      <button 
        onClick={() => router.push('/pesanan')} 
        className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/pesanan' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
      >
        <svg className="w-6 h-6" fill={pathname === '/pesanan' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={pathname === '/pesanan' ? "0" : "1.5"}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <span className="text-[10px] font-bold">Pesanan</span>
      </button>

      {/* Tombol 3: Keluar */}
      <button 
        onClick={handleLogout} 
        className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        <span className="text-[10px] font-bold">Keluar</span>
      </button>

    </div>
  );
}