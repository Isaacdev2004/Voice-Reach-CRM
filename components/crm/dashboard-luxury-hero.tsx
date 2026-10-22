import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { DASHBOARD_PAGE_HEROES } from "@/lib/dashboard/page-heroes";

/** Home-only presentation; destinations and approved copy come from the existing configuration. */
export function DashboardLuxuryHero() {
  const config = DASHBOARD_PAGE_HEROES["/dashboard"];
  return (
    <section className="dashboard-luxury-hero" aria-labelledby="dashboard-heading">
      <div className="dashboard-luxury-hero-photo">
        <Image src="/brand/heroes/dashboard-interior.jpg" alt="Sunlit luxury living room with natural textures and sea views"
          fill priority sizes="(max-width: 767px) 100vw, 65vw" className="object-cover" />
      </div>
      <div className="dashboard-luxury-hero-copy">
        <p className="dashboard-luxury-eyebrow">DASHBOARD</p>
        <h1 id="dashboard-heading"><span>Your business.</span>{" "}<span>Beautifully in motion.</span></h1>
        <p className="dashboard-luxury-hero-description">{config.subtitle}</p>
        <div className="dashboard-luxury-hero-actions">
          {config.actions?.map((action) => (
            <Link key={action.href} href={action.href} className={action.primary ? "dashboard-luxury-primary" : "dashboard-luxury-secondary"}>
              <Icon name={action.icon} className="text-[19px]" />{action.label}
              {action.primary ? <Icon name="arrow_forward" className="text-[17px]" /> : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
