'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getMaintenanceMode } from '@/lib/firebase/firestore';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (requireAdmin && user.role !== 'admin') {
      router.replace('/');
      return;
    }
    if (user.role === 'user') {
      getMaintenanceMode().then(setMaintenance);
    } else {
      setMaintenance(false);
    }
  }, [user, loading, requireAdmin, router]);

  if (loading || (user && maintenance === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  if (requireAdmin && user.role !== 'admin') return null;

  if (maintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">🔧</div>
          <h1 className="text-xl font-bold text-gray-800">メンテナンス中</h1>
          <p className="text-sm text-gray-500">
            ただいまシステムメンテナンスを行っています。<br />
            しばらくお待ちください。
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
