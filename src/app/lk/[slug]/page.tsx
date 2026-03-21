import { LkClient } from "./lk-client";

type Props = { params: Promise<{ slug: string }> };

export default async function LkPage({ params }: Props) {
  const { slug } = await params;
  return <LkClient slug={slug} />;
}
