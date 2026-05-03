/**
 * src/app/admin/statutory/new/page.tsx — S18 create.
 */

import { StatutoryEditForm } from "@/components/StatutoryEditForm";

export default function NewStatutory() {
  return (
    <main className="px-6 py-6">
      <StatutoryEditForm initial={null} />
    </main>
  );
}
