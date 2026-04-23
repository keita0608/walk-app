'use client';

import { useState } from 'react';
import { AppUser, UserRole, Gender } from '@/lib/types';
import { updateUser, saveApiToken } from '@/lib/firebase/firestore';

interface Props {
  users: AppUser[];
  onUpdated: () => void;
}

export default function UserList({ users, onUpdated }: Props) {
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editName, setEditName]         = useState('');
  const [editRole, setEditRole]         = useState<UserRole>('user');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId]         = useState<string | null>(null);
  const [editGender, setEditGender] = useState<Gender | ''>('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const startEdit = (user: AppUser) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditGender(user.gender ?? '');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
  };

  const saveEdit = async (userId: string) => {
    if (!editName.trim()) { setError('名前を入力してください'); return; }
    setSaving(true);
    try {
      await updateUser(userId, {
        name:   editName.trim(),
        role:   editRole,
        gender: editGender !== '' ? editGender : undefined,
      });
      setEditingId(null);
      onUpdated();
    } catch (err: unknown) {
      setError('更新に失敗しました: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const genderLabel = (g?: Gender) =>
    g === 'male' ? '男性' : g === 'female' ? '女性' : '—';

  const handleGenerateToken = async (userId: string) => {
    setGeneratingId(userId);
    try {
      const token = crypto.randomUUID();
      await saveApiToken(userId, token);
      onUpdated();
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopy = (text: string, userId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-3">
      {users.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">ユーザーがいません</p>
      )}

      {users.map((user) => (
        <div key={user.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          {editingId === user.id ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">名前</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">ロール</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">性別</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value as Gender | '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">未設定</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => saveEdit(user.id)}
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 truncate">{user.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-400">{genderLabel(user.gender)}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => startEdit(user)}
                className="text-sm text-indigo-600 hover:text-indigo-800 shrink-0"
              >
                編集
              </button>
            </div>

            {/* API token row */}
            <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 shrink-0">iOSトークン：</span>
              {user.apiToken ? (
                <>
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono truncate max-w-[180px]">
                    {user.apiToken}
                  </code>
                  <button
                    onClick={() => handleCopy(user.apiToken!, user.id)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 shrink-0"
                  >
                    {copiedId === user.id ? 'コピー済み ✓' : 'コピー'}
                  </button>
                  <button
                    onClick={() => handleGenerateToken(user.id)}
                    disabled={generatingId === user.id}
                    className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    再発行
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleGenerateToken(user.id)}
                  disabled={generatingId === user.id}
                  className="text-xs px-2 py-0.5 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 shrink-0"
                >
                  {generatingId === user.id ? '発行中…' : 'トークンを発行'}
                </button>
              )}
            </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
