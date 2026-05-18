"use client";

const GOOGLE_ICON =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBuK6myFHLyF4B3XkrFeq8GczkyAxK1RFX6dyeGQwyegSpQsn4dZghHJmOWHhXrsDANY_3srXRLjeIVLQJWI_uk2neCNm59xzKhWAGjdn3-gjgBDbNoh_FeoxvvFg5CLPcoRAEh4vylGYfEwvpg5HH9kb5KycrXG1OnqPsWDfg_rjEL0wvaujjTLQ4oYuj6H9sEy0XGZ25JRX96K2iGNHaRJiYvsqqgwCY9Krj_zqXnHEaoJqBAXeVpobcIkqwqvROKIvdayAu6yKPu";

const MICROSOFT_ICON =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCb45Ha1BbpxSJHPoqlVMuHP17qAQ62NzvERnq7J-LdbXlLCgVMmWX8v5goXif7zybCUNy-loaVf-CxaC8GTWmY4w8lRXb1mX0OuAWyswYvcKy6UCUGPDbwHTar8cq7yoy7YeepYjSoA-rS74VvHm_Ozkbo_Lwwg1VO7IKuhzuYqRpVogCWxkcsFRNckavI9Ss8k3Zc3yFR_VnGUnjhV5g_OiaGG6vtCUq8oWuaU7WkKkC-HENYkj0dAKRP7UTnOTJgjPgbYiJHndFs";

type OAuthButtonsProps = {
  disabled?: boolean;
  onGoogle: () => void;
  onMicrosoft: () => void;
};

export function OAuthButtons({ disabled, onGoogle, onMicrosoft }: OAuthButtonsProps) {
  return (
    <>
      <div className="relative my-lg">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant/40" />
        </div>
        <div className="relative flex justify-center text-label-md">
          <span className="bg-surface-container-lowest px-sm font-label-md text-on-surface-variant">
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={onGoogle}
          className="flex h-[56px] items-center justify-center gap-xs rounded-full border border-outline-variant bg-white transition-all hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-60"
        >
          <img alt="Google" className="h-5 w-5" src={GOOGLE_ICON} />
          <span className="font-label-md text-label-md text-ink">Google</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onMicrosoft}
          className="flex h-[56px] items-center justify-center gap-xs rounded-full border border-outline-variant bg-white transition-all hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-60"
        >
          <img alt="Microsoft" className="h-5 w-5" src={MICROSOFT_ICON} />
          <span className="font-label-md text-label-md text-ink">Microsoft</span>
        </button>
      </div>
    </>
  );
}
