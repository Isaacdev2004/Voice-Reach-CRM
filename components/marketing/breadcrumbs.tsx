import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="landing-shell py-4">
      <ol className="flex flex-wrap items-center gap-2 text-[13px] text-taupe md:text-[14px]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden className="text-outline-variant">/</span> : null}
              {isLast || !item.href ? (
                <span className={isLast ? "font-medium text-ink" : undefined}>{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-rose-gold-deep">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
