"use client";

import { PropertyFinderHero } from "@/components/property-finder/property-finder-hero";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const HERO_MOUNT_ID = "dashboard-hero-mount";

type PropertyFinderHeroPortalProps = {
  contacts: ApiContact[];
  loading: boolean;
  selectedId: string;
  onSelectContact: (id: string) => void;
};

export function PropertyFinderHeroPortal(props: PropertyFinderHeroPortalProps) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMount(document.getElementById(HERO_MOUNT_ID));
  }, []);

  if (!mount) return null;

  return createPortal(<PropertyFinderHero {...props} />, mount);
}
