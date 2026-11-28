import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Languages,
  Moon,
  Sun,
  Bell,
  CheckCircle2,
  Sliders,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Local preferences state
  const [timezone, setTimezone] = useState<string>('Asia/Ho_Chi_Minh');
  const [notifyLowWater, setNotifyLowWater] = useState<boolean>(true);
  const [notifyCriticalTemp, setNotifyCriticalTemp] = useState<boolean>(true);
  const [defaultWaterDuration, setDefaultWaterDuration] = useState<number>(30);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow">{t('nav_settings', 'TÙY BIẾN HỆ THỐNG')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
          {language === 'vi' ? 'Cài đặt giao diện & Tham số' : 'Preferences & Operation Settings'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          {language === 'vi'
            ? 'Thiết lập ngôn ngữ, giao diện hiển thị, múi giờ và các tùy chọn thông báo tự động.'
            : 'Configure system language, display theme, timezone, and automated alert preferences.'}
        </p>
      </div>

      {isSaved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>{language === 'vi' ? 'Đã lưu cấu hình tùy chọn thành công!' : 'Settings saved successfully!'}</span>
        </div>
      )}

      <form onSubmit={handleSavePreferences} className="space-y-6">
        {/* Localization & Display */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Languages className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-ink">
              {language === 'vi' ? 'Ngôn ngữ & Giao diện' : 'Language & Appearance'}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            {/* Language toggle */}
            <div>
              <label className="block font-semibold text-muted mb-1.5">
                {language === 'vi' ? 'Ngôn ngữ hiển thị' : 'System Language'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    language === 'vi'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-line glass-panel-subtle text-ink hover:bg-white/10'
                  }`}
                >
                  🇻🇳 Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    language === 'en'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-line glass-panel-subtle text-ink hover:bg-white/10'
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            {/* Theme toggle */}
            <div>
              <label className="block font-semibold text-muted mb-1.5">
                {language === 'vi' ? 'Giao diện' : 'Display Theme'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    theme === 'light'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-line glass-panel-subtle text-ink hover:bg-white/10'
                  }`}
                >
                  <Sun className="size-4" />
                  <span>{language === 'vi' ? 'Sáng (Light)' : 'Light'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-line glass-panel-subtle text-ink hover:bg-white/10'
                  }`}
                >
                  <Moon className="size-4" />
                  <span>{language === 'vi' ? 'Tối (Dark)' : 'Dark'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Timezone picker */}
          <div className="text-xs pt-2">
            <label className="block font-semibold text-muted mb-1">
              {language === 'vi' ? 'Múi giờ vận hành' : 'Operating Timezone'}
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full sm:w-1/2 rounded-xl glass-input px-3 py-2 text-xs font-medium text-ink"
            >
              <option value="Asia/Ho_Chi_Minh">UTC+07:00 (Hà Nội, TP.HCM, Bangkok)</option>
              <option value="Asia/Tokyo">UTC+09:00 (Tokyo, Seoul)</option>
              <option value="UTC">UTC+00:00 (Coordinated Universal Time)</option>
            </select>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
              <Bell className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-ink">
              {language === 'vi' ? 'Tùy chọn cảnh báo tự động' : 'Notification & Safety Thresholds'}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between rounded-xl glass-panel-subtle p-3 cursor-pointer">
              <div>
                <p className="font-bold text-ink">
                  {language === 'vi' ? 'Cảnh báo cạn nước bình chứa (< 15%)' : 'Low water reservoir warning (< 15%)'}
                </p>
                <p className="text-[11px] text-muted">
                  {language === 'vi'
                    ? 'Ngăn chặn cháy máy bơm khi bồn chứa cạn nước.'
                    : 'Prevent pump damage by warning when water level is critical.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifyLowWater}
                onChange={(e) => setNotifyLowWater(e.target.checked)}
                className="size-4 accent-primary rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl glass-panel-subtle p-3 cursor-pointer">
              <div>
                <p className="font-bold text-ink">
                  {language === 'vi' ? 'Cảnh báo nhiệt độ khí cực đoan (> 38°C)' : 'Extreme temperature warning (> 38°C)'}
                </p>
                <p className="text-[11px] text-muted">
                  {language === 'vi'
                    ? 'Báo động khi vườn quá nóng ảnh hưởng sinh trưởng cây.'
                    : 'Alert when ambient climate exceeds plant safety limits.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={notifyCriticalTemp}
                onChange={(e) => setNotifyCriticalTemp(e.target.checked)}
                className="size-4 accent-primary rounded cursor-pointer"
              />
            </label>
          </div>
        </section>

        {/* Default Operation Parameters */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <Sliders className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-ink">
              {language === 'vi' ? 'Thông số tưới mặc định' : 'Default Irrigation Parameters'}
            </h2>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-muted">{language === 'vi' ? 'Thời lượng bơm mặc định:' : 'Default runtime duration:'}</span>
              <span className="font-mono text-primary font-bold">{defaultWaterDuration} {language === 'vi' ? 'giây' : 'seconds'}</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={defaultWaterDuration}
              onChange={(e) => setDefaultWaterDuration(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </section>

        {/* System Version & Security Disclaimer */}
        <section className="panel space-y-3 glass-panel-subtle">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-muted">
              <Shield className="size-3.5" />
              {language === 'vi' ? 'Bảo mật hạ tầng:' : 'Security policy:'}
            </span>
            <span className="text-muted">
              {language === 'vi'
                ? 'Thông tin MQTT Broker được bảo mật tại máy chủ'
                : 'Broker credentials strictly isolated in backend configuration'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60">
            <span className="text-muted">Smart Farm Mini Platform</span>
            <span className="font-mono text-primary font-bold">v2.1 (Build 2026.11)</span>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-2.5 text-xs shadow-xs transition-colors"
          >
            {language === 'vi' ? 'Lưu toàn bộ cài đặt' : 'Save All Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
