"use client";
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-ehrc-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-ehrc-blue/90"
    >
      Print / Save as PDF
    </button>
  );
}
