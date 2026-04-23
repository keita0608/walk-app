'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-indigo-600 font-bold text-lg tracking-tight">
            🚶 Step Battle
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/" className="text-sm text-gray-600 hover:text-indigo-600">
              イベント一覧
            </Link>
            {user.role === 'admin' && (
              <>
                <Link href="/admin" className="text-sm text-gray-600 hover:text-indigo-600">
                  管理
                </Link>
                <Link href="/admin/users" className="text-sm text-gray-600 hover:text-indigo-600">
                  ユーザー管理
                </Link>
              </>
            )}
            <span className="text-sm text-gray-400">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              ログアウト
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded text-gray-500"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="メニュー"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden pb-3 flex flex-col gap-2 border-t border-gray-100 pt-2">
            <Link href="/" className="text-sm text-gray-700 py-1" onClick={() => setMenuOpen(false)}>
              イベント一覧
            </Link>
            {user.role === 'admin' && (
              <>
                <Link href="/admin" className="text-sm text-gray-700 py-1" onClick={() => setMenuOpen(false)}>
                  管理ダッシュボード
                </Link>
                <Link href="/admin/users" className="text-sm text-gray-700 py-1" onClick={() => setMenuOpen(false)}>
                  ユーザー管理
                </Link>
              </>
            )}
            <span className="text-sm text-gray-400">{user.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 text-left py-1">
              ログアウト
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
