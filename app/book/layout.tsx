import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Request an appointment | MyARI",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
