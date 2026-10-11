import { useState } from "react";

// One entry per voice phrase. A command with `options` opens a dropdown and
// passes the position of the chosen option to `run`; others just call `run`.
export type VoiceCommand = {
  label: string;
  options?: string[];
  run: (choice: number) => void;
};

// Dropdown options "1", "2", ... for commands that take a number
export function numbers(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

// Temporary stand-in for voice control: each pill does what saying the phrase will do
function VoiceBar({ commands }: { commands: VoiceCommand[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav className="voice-bar" onClick={(e) => e.stopPropagation()}>
      {commands.map(({ label, options, run }) =>
        options ? (
          <div key={label} className="voice-item">
            <button
              type="button"
              disabled={options.length === 0}
              onClick={() => setOpen(open === label ? null : label)}
            >
              {label} ▾
            </button>
            {open === label && (
              <div className="voice-menu">
                {options.map((option, choice) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setOpen(null);
                      run(choice);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            key={label}
            type="button"
            onClick={() => {
              setOpen(null);
              run(0);
            }}
          >
            {label}
          </button>
        ),
      )}
    </nav>
  );
}

export default VoiceBar;
