import Image from "next/image";
export function CalendarPageHero() {
  return (
    <section className="calendar-hero">
      <Image
        src="/brand/heroes/calendar-home-office.png"
        alt="Sunlit home office with warm natural materials and garden views"
        fill
        sizes="(max-width: 768px) 100vw, 85vw"
        priority
      />
      <div className="calendar-hero-copy">
        <p>CALENDAR</p>
        <h1>Make every moment count.</h1>
        <span>
          Keep appointments, follow-ups, and important moments beautifully
          organized.
        </span>
      </div>
    </section>
  );
}
