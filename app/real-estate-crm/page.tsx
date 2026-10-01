import { createSeoPage } from "@/lib/seo/create-seo-page";

const seo = createSeoPage("real-estate-crm");

export const metadata = seo.metadata;
export default seo.default;
