import { createSeoPage } from "@/lib/seo/create-seo-page";

const seo = createSeoPage("lead-follow-up");

export const metadata = seo.metadata;
export default seo.default;
