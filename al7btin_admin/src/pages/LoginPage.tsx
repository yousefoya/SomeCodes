import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Phone, KeyRound, ArrowLeft, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, isStaff, sendOtp, verifyOtp } = useAuth();
  const { t, direction } = useLanguage();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isAuthenticated && isStaff) {
    return <Navigate to="/admin" replace />;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMsg('يرجى إدخال رقم الهاتف.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await sendOtp(phoneNumber.trim());
      setStep('otp');
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      success(res.message || t.auth.otpSent);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال رمز التحقق.');
      toastError(err.message || 'فشل إرسال رمز التحقق.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('يرجى إدخال رمز التحقق.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await verifyOtp(phoneNumber.trim(), otp.trim());
      success(t.auth.loginSuccess);
      navigate('/admin');
    } catch (err: any) {
      setErrorMsg(err.message || 'رمز التحقق غير صحيح أو الحساب غير مصرح.');
      toastError(err.message || 'رمز التحقق غير صحيح أو الحساب غير مصرح.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Language Switcher Bar */}
      <div className="absolute top-6 right-6 left-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
            ب
          </div>
          <span className="font-extrabold text-surface-900 text-sm tracking-tight">{t.brand.name}</span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-xl shadow-surface-200/50 rounded-3xl border border-surface-200 sm:px-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200/80 mx-auto flex items-center justify-center text-brand-600 mb-3 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-surface-900 tracking-tight">
              {t.auth.loginTitle}
            </h2>
            <p className="text-xs text-surface-500 mt-1">
              {t.auth.loginSubtitle}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Input
                  label={t.auth.phoneNumber}
                  placeholder={t.auth.phoneNumberPlaceholder}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  icon={<Phone className="w-4 h-4" />}
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
                icon={direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              >
                {t.auth.sendOtp}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-xs text-surface-600 bg-surface-50 p-3 rounded-xl border border-surface-200/70 flex justify-between items-center">
                <span>{phoneNumber}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setErrorMsg(null);
                  }}
                  className="text-brand-600 hover:text-brand-700 font-semibold"
                >
                  {t.auth.changePhone}
                </button>
              </div>

              {devOtpHint && (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-semibold block">{t.auth.devOtpNotice}</span>
                    <span className="font-mono text-base font-bold text-amber-800 tracking-wider">
                      {devOtpHint}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Input
                  label={t.auth.otpCode}
                  placeholder={t.auth.otpPlaceholder}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  icon={<KeyRound className="w-4 h-4" />}
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                size="lg"
                isLoading={isLoading}
              >
                {t.auth.verifyOtp}
              </Button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-surface-100 text-center">
            <p className="text-[11px] text-surface-400">
              منصة بتنحل © {new Date().getFullYear()} — نظام إدارة العمليات والتوزيع
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
