import { redirect } from "next/navigation";

export default async function OrderRefRedirect({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  redirect(`/order?ref=${encodeURIComponent(ref)}`);
}
