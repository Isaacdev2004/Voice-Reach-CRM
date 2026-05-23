import { RelationshipProfilePage } from "@/components/pages/stitch/RelationshipProfilePage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactRelationshipPage({ params }: PageProps) {
  const { id } = await params;
  return <RelationshipProfilePage contactId={id} />;
}
