/**
 * src/app/admin/(v2)/tasks/new/page.tsx — AD1.2
 *
 * New template form.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-auth";
import { TaskForm } from "@/components/admin/tasks/TaskForm";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/pin?next=" + encodeURIComponent("/admin/tasks/new"));

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href={"/admin/tasks" as any} className="text-slate-500 hover:text-ehrc-navy hover:underline">
          ← Tasks
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ehrc-navy">New task template</h1>
        <p className="mt-1 text-sm text-slate-500">
          Task ID auto-assigns on save. Engine generates instances on the next 04:00 IST run.
        </p>
      </div>
      <div className="max-w-3xl">
        <TaskForm />
      </div>
    </div>
  );
}
