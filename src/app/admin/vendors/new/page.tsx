// src/app/admin/vendors/new/page.tsx
import { VendorsEditForm } from "@/components/VendorsEditForm";

export default function NewVendor() {
  return <main className="px-6 py-6"><VendorsEditForm initial={null} /></main>;
}
