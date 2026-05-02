'use client'
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); 
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast("Akun berhasil dibuat! Mengalihkan ke login...", "success");
      
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (error: any) {
      showToast("Gagal daftar: Pastikan password minimal 6 karakter.", "error");
      setLoading(false); 
    } 
  };

  return (
    <main className="min-h-screen relative flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-100">
      
      {/* Floating Notification Card (Elegan & Tidak Mantul) */}
      {toast && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 w-max max-w-[90vw] transition-all duration-300 ease-out">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700 shadow-green-500/10' 
              : 'bg-red-50 border-red-200 text-red-700 shadow-red-500/10'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ) : (
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            )}
            <p className="text-sm font-bold leading-tight">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white/80 backdrop-blur-lg rounded-[2rem] shadow-2xl border border-white p-8 sm:p-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">
            Z<span className="text-blue-600">reservasi</span>
          </h1>
          <h2 className="text-lg font-bold text-slate-700">Buat Akun Baru</h2>
          <p className="text-sm text-slate-500 mt-1">Lengkapi data untuk mulai memesan</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700 ml-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="nama@email.com"
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm" />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700 ml-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimal 6 karakter"
              className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm" />
          </div>

          <button type="submit" disabled={loading}
            className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 hover:shadow-blue-500/30 active:translate-y-0 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500">
          Sudah punya akun? <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors">Masuk di sini</Link>
        </p>
      </div>
    </main>
  );
}