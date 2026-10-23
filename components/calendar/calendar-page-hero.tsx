import Image from "next/image";
export function CalendarPageHero() {
  return (
    <section className="calendar-hero">
      <Image
        src="/brand/heroes/calendar-coastal-office.png"
        alt="Elegant coastal home office with an olive-branch vase, cream furnishings and warm evening light"
        fill
        sizes="(max-width: 768px) 100vw, 85vw"
        priority
      />
      <div className="calendar-hero-copy">
        <p>CALENDAR</p>
        <h1>Plan today. Close tomorrow.</h1>
        <span>
          Keep appointments, follow-ups, and important moments beautifully
          organized.
        </span>
      </div>
    </section>
  );
}
