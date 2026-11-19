import { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../services/api-client';
import { Badge } from '../../components/common/Badge';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
} from 'lucide-react';

interface UserProfileData {
  id: string;
  userName: string;
  email: string;
  displayName?: string | null;
  phoneNumber?: string | null;
  role: string;
  authProvider: string;
  avatarUrl?: string | null;
  createdAtUtc: string;
}

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPass, setIsChangingPass] = useState<boolean>(false);
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await apiClient.get<UserProfileData>('/api/auth/me');
        if (data) {
          setProfile(data);
          setDisplayName(data.displayName || '');
          setPhoneNumber(data.phoneNumber || '');
        }
      } catch {
        // Fallback
      }
    }
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileFeedback(null);

    try {
      const { data } = await apiClient.put<UserProfileData>('/api/auth/profile', {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      setProfile(data);
      setProfileFeedback({
        type: 'success',
        text: language === 'vi' ? 'Cập nhật thông tin thành công!' : 'Profile updated successfully!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật hồ sơ.';
      setProfileFeedback({ type: 'error', text: msg });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassFeedback({
        type: 'error',
        text: language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.',
      });
      return;
    }

    setIsChangingPass(true);
    setPassFeedback(null);

    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassFeedback({
        type: 'success',
        text: language === 'vi' ? 'Đổi mật khẩu thành công!' : 'Password changed successfully!',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đổi mật khẩu.';
      setPassFeedback({ type: 'error', text: msg });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <p className="eyebrow">{t('nav_profile', 'HỒ SƠ TÀI KHOẢN')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl text-ink">
          {language === 'vi' ? 'Thông tin chủ vườn' : 'Farmer Profile & Security'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          {language === 'vi'
            ? 'Quản lý thông tin định danh, email liên kết và mật khẩu đăng nhập an toàn.'
            : 'Manage your owner identity, linked email, and account security credentials.'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info Form */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-ink">
              {language === 'vi' ? 'Thông tin cá nhân' : 'Personal Details'}
            </h2>
          </div>

          {profileFeedback && (
            <div
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium ${
                profileFeedback.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {profileFeedback.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                <span>{profileFeedback.text}</span>
              </div>
              <button onClick={() => setProfileFeedback(null)} className="opacity-75 hover:opacity-100">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-muted mb-1">Email</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  disabled
                  value={profile?.email || user?.email || ''}
                  className="w-full rounded-xl border border-line bg-canvas/70 px-3 py-2 text-muted font-mono"
                />
                <Badge variant="success" className="shrink-0">
                  <ShieldCheck className="size-3" />
                  <span>Verified</span>
                </Badge>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1">
                {language === 'vi' ? 'Tên đăng nhập (Username)' : 'Username'}
              </label>
              <input
                type="text"
                disabled
                value={profile?.userName || user?.userName || ''}
                className="w-full rounded-xl border border-line bg-canvas/70 px-3 py-2 text-muted font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1">
                {language === 'vi' ? 'Tên hiển thị' : 'Display Name'}
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink font-medium focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1">
                {language === 'vi' ? 'Số điện thoại' : 'Phone Number'}
              </label>
              <input
                type="text"
                placeholder="+84..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink font-medium focus:border-primary focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 text-xs shadow-xs"
              >
                {isUpdatingProfile ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
              </button>
            </div>
          </form>
        </section>

        {/* Change Password Section */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <KeyRound className="size-4" />
            </span>
            <h2 className="text-sm font-bold text-ink">
              {language === 'vi' ? 'Đổi mật khẩu' : 'Change Password'}
            </h2>
          </div>

          {passFeedback && (
            <div
              className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium ${
                passFeedback.type === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {passFeedback.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                <span>{passFeedback.text}</span>
              </div>
              <button onClick={() => setPassFeedback(null)} className="opacity-75 hover:opacity-100">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-muted mb-1">
                {language === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'} *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1">
                {language === 'vi' ? 'Mật khẩu mới' : 'New Password'} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-muted mb-1">
                {language === 'vi' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'} *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-ink focus:border-primary focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPass}
                className="rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-2 text-xs shadow-xs"
              >
                {isChangingPass ? (language === 'vi' ? 'Đang đổi...' : 'Changing...') : (language === 'vi' ? 'Cập nhật mật khẩu' : 'Update Password')}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
