import { SettingsWorkspacePage } from "@/components/pages/stitch/SettingsWorkspacePage";
import { Suspense } from "react";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-taupe">Loading settings…</div>}>
      <SettingsWorkspacePage />
    </Suspense>
  );
}
