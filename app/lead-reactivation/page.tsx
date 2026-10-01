import { createSeoPage } from "@/lib/seo/create-seo-page";

const seo = createSeoPage("lead-reactivation");

export const metadata = seo.metadata;
export default seo.default;
