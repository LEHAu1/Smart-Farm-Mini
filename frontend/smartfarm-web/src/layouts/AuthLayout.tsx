import type { ReactNode } from 'react';
import { Sprout, Activity, Droplets, BellRing, Sparkles } from 'lucide-react';

export interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  storyTitle?: string;
  storySubtitle?: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  eyebrow = 'SMART FARM MINI IOT',
  storyTitle = 'Chăm một mầm xanh.\nNuôi cả bình yên.',
  storySubtitle = 'Theo dõi cây trồng, giữ đất đủ ẩm và chăm sóc khu vườn từ một nơi duy nhất.',
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2 bg-slate-50">
      {/* Cột trái: Brand Story / Visual Panel */}
      <aside
        className="hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#134935] via-[#1a5a41] to-[#0c3123] p-10 text-white lg:flex xl:p-16 relative shadow-2xl"
        aria-label="Smart Farm Mini"
      >
        {/* Glow effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-teal-300/10 blur-3xl" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 border border-white/20 text-white shadow-inner backdrop-blur-md">
            <Sprout className="size-6 text-emerald-300" />
          </span>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">Smart Farm Mini</span>
            <span className="text-[11px] font-medium tracking-widest text-emerald-200/80 uppercase">Hệ sinh thái IoT thông minh</span>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-emerald-300" />
            <span>NÔNG NGHIỆP SỐ CHUẨN XÁC</span>
          </div>

          <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white lg:text-5xl whitespace-pre-line">
            {storyTitle}
          </h2>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-emerald-100/85">
            {storySubtitle}
          </p>

          {/* Feature Highlights Cards */}
          <div className="mt-8 grid grid-cols-1 gap-3.5 pt-4">
            <div className="flex items-center gap-3.5 rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Giám sát cảm biến Realtime</p>
                <p className="text-[11px] text-emerald-200/70">Nhiệt độ khí, độ ẩm đất và mực nước bồn chứa qua SignalR</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                <Droplets className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Tự động hóa chu kỳ tưới</p>
                <p className="text-[11px] text-emerald-200/70">Quy tắc thông minh bảo vệ máy bơm và tiết kiệm nguồn nước</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <BellRing className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Cảnh báo ngưỡng an toàn</p>
                <p className="text-[11px] text-emerald-200/70">Thông báo tức thời khi độ ẩm đất cạn kiệt hoặc nhiệt độ quá cao</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-emerald-200/70">
          <span>Một khu vườn nhỏ. Một khởi đầu xanh.</span>
          <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-md">SmartFarm v2.1</span>
        </div>
      </aside>

      {/* Cột phải: Form Content Side */}
      <section
        className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8 lg:px-12 bg-slate-50"
        aria-labelledby="auth-title"
      >
        <div className="w-full max-w-md bg-white p-7 sm:p-9 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {/* Mobile Brand Header */}
          <div className="mb-6 flex items-center gap-3 font-bold text-emerald-800 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
              <Sprout className="size-5" />
            </span>
            <div>
              <span className="text-base tracking-tight block">Smart Farm Mini</span>
              <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">IoT Agriculture</span>
            </div>
          </div>

          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              {eyebrow}
            </p>
          )}
          <h1 id="auth-title" className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {subtitle}
            </p>
          )}

          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
