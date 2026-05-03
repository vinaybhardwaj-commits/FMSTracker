/**
 * src/components/Stepper.tsx — simple horizontal stepper for capture screens.
 */

interface Props {
  steps: string[];
  /** zero-indexed: 0 = first step active */
  active: number;
}

export function Stepper({ steps, active }: Props) {
  return (
    <div className="flex h-9 items-center gap-1.5 px-4 pt-1">
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
            <div className="flex w-full items-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  done
                    ? "bg-green-600"
                    : current
                    ? "bg-ehrc-blue"
                    : "border border-slate-300 bg-white"
                }`}
                aria-hidden
              />
              {i < steps.length - 1 && (
                <span
                  className={`h-px flex-1 ${done ? "bg-green-300" : "bg-slate-200"}`}
                  aria-hidden
                />
              )}
            </div>
            <span
              className={`mt-0.5 truncate text-[10px] ${
                current ? "font-medium text-ehrc-navy" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
