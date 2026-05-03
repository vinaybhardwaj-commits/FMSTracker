// src/app/admin/locations/new/page.tsx
import { LocationsEditForm } from "@/components/LocationsEditForm";

export default function NewLocation() {
  return <main className="px-6 py-6"><LocationsEditForm initial={null} /></main>;
}
