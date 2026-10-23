import type { FeaturePageSlug } from "@/lib/seo/feature-pages";
import { FEATURE_SHOWCASES } from "./feature-showcases";
import { PRODUCT_CAPTURES } from "./product-captures";
/** Only feature-relevant implemented UI; no generic Dashboard substitution. */
export function heroImageForFeaturePage(slug:FeaturePageSlug){return PRODUCT_CAPTURES[FEATURE_SHOWCASES[slug].capture];}
