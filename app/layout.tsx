import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '歩数バトル',
  description: '部署内の歩数ランキングで毎日競い合おう',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-brand-600 text-white py-4 px-6 shadow-md">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <span className="text-2xl">👟</span>
              <h1 className="text-xl font-bold tracking-tight">歩数バトル</h1>
            </div>
          </header>
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  )
}
