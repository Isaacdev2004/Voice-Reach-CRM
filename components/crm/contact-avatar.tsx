import { cn } from "@/lib/cn";

const AVATAR_TONES = [
  "bg-sage-light text-emerald-muted",
  "bg-rose-gold/20 text-rose-gold-deep",
  "bg-bronze-light text-bronze",
  "bg-champagne text-taupe",
] as const;

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-[12px] ring-2",
  md: "h-14 w-14 text-[16px] ring-2",
  lg: "h-28 w-28 text-[32px] ring-4",
} as const;

function initials(firstName: string, lastName?: string | null) {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function toneForName(firstName: string, lastName?: string | null) {
  const key = `${firstName} ${lastName ?? ""}`.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

type ContactAvatarProps = {
  firstName: string;
  lastName?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function ContactAvatar({
  firstName,
  lastName,
  size = "lg",
  className,
}: ContactAvatarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-serif font-semibold ring-champagne",
        SIZE_CLASSES[size],
        toneForName(firstName, lastName),
        className,
      )}
      aria-hidden
    >
      {initials(firstName, lastName)}
    </div>
  );
}
