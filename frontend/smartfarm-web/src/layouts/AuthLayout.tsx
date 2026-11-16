import type { ReactNode } from 'react';
import { Sprout } from 'lucide-react';

export interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  eyebrow = 'SMART FARM MINI IOT',
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2 bg-canvas">
      {/* Cột trái: Brand Story / Visual Panel */}
      <aside
        className="hidden flex-col justify-between overflow-hidden bg-primary p-10 text-white lg:flex xl:p-16 relative"
        aria-label="Smart Farm Mini - Hệ thống nông nghiệp thông minh"
      >
        <div className="flex items-center gap-3 font-semibold text-white">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 border border-white/25 text-xl font-bold shadow-xs">
            <Sprout className="size-6 text-white" />
          </span>
          <div className="leading-tight">
            <span className="text-base font-bold tracking-tight">Smart Farm Mini</span>
            <span className="block text-[10px] uppercase tracking-widest text-emerald-200/80">Khu vườn công nghệ</span>
          </div>
        </div>

        <div className="my-12 max-w-lg z-10">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Hệ sinh thái IoT điều khiển tự động
          </span>
          <h2 className="mt-4 text-4xl font-bold leading-tight lg:text-5xl text-white">
            Chăm một mầm xanh.<br />Nuôi trọn bình yên.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-emerald-100/90">
            Giám sát độ ẩm đất, nhiệt độ khí và tự động hóa chu kỳ tưới tiêu trực quan từ một nền tảng duy nhất.
          </p>

          {/* Minh họa mầm cây */}
          <div className="garden-art" aria-hidden="true">
            <span className="garden-stem" />
            <span className="garden-leaf garden-leaf-left" />
            <span className="garden-leaf garden-leaf-right" />
            <span className="garden-pot" />
          </div>
        </div>

        <div className="text-xs text-emerald-100/70 z-10 flex items-center justify-between border-t border-white/15 pt-6">
          <span>Chuẩn hóa vi khí hậu cho mọi chậu cây.</span>
          <span>Version 1.0</span>
        </div>
      </aside>

      {/* Cột phải: Form Content Side */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12 bg-surface lg:bg-canvas">
        <div className="w-full max-w-md bg-surface p-8 sm:p-10 rounded-2xl border border-line shadow-xs">
          {/* Mobile Brand Header */}
          <div className="mb-8 flex items-center gap-3 font-bold text-primary lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Sprout className="size-6" />
            </span>
            <span className="text-lg">Smart Farm Mini</span>
          </div>

          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
