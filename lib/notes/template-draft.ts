import { MetadataSchema } from "./workspace";
/** Reused from the earlier Notes redesign: retain useful templates on the basic schema. */
export function templateDraft(template: readonly [string,string,string], advanced: boolean) {
  const kind: "note"|"strategy"|"goal" = template[1] === "Goals" ? "goal" : template[1] === "Strategy" ? "strategy" : "note";
  return { title:template[0],body:template[2],kind,metadata:MetadataSchema.parse({category:advanced?template[1]:kind==='goal'?'Goals':kind==='strategy'?'Strategy':'General'}) };
}
