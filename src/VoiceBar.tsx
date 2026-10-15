import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";

const WAKE_WORD = "paint hands";
// The recogniser often hears "pain hands" or "paint hand", so accept near misses
const WAKE_PATTERN = /\bpain[a-z]* hands?\b/g;

// Words the recogniser tends to write in place of a number
const MISHEARD: Record<string, string> = {
  won: "one",
  to: "two",
  too: "two",
  for: "four",
  ate: "eight",
};

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty",
  "ninety",
];

type Speech = { text: string; is_final: boolean };

// One entry per voice phrase. A command with `options` opens a dropdown and
// passes the position of the chosen option to `run`; others just call `run`.
export type VoiceCommand = {
  label: string;
  options?: string[];
  run: (choice: number) => void;
  // For a command followed by free speech, e.g. "search red apples"
  dictate?: (words: string) => void;
};

// Dropdown options "1", "2", ... for commands that take a number
export function numbers(count: number): string[] {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

// How an option sounds: "21" is heard as "twenty one"
function spoken(option: string): string {
  const n = Number(option);
  if (!Number.isInteger(n) || n < 1 || n > 99) return option.toLowerCase();
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
}

// Runs a command with the words that came after its name; false if they don't fit
function finish(command: VoiceCommand, rest: string): boolean {
  if (command.dictate) {
    if (rest) command.dictate(rest);
    return rest !== "";
  }
  if (!command.options) {
    command.run(0);
    return true;
  }
  const said = rest
    .split(" ")
    .map((word) => MISHEARD[word] ?? word)
    .join(" ");
  const choice = command.options.findIndex((option) => spoken(option) === said);
  if (choice >= 0) command.run(choice);
  return choice >= 0;
}

// Every command can be clicked as a pill or spoken after the wake word; both
// end up in the same `run`, and the pills show which phrases work right now.
function VoiceBar({ commands }: { commands: VoiceCommand[] }) {
  // The command waiting for its option, by click or by voice
  const [open, setOpen] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [problem, setProblem] = useState("");
  // True from the wake word until a command has everything it needs
  const awake = useRef(false);

  // Does what a spoken sentence asks for. Returns true when more is needed
  // ("pin" without a number), so the next sentence is taken as the rest of it.
  function hear(words: string): boolean {
    const waiting = commands.find((c) => c.label === open);
    setOpen(null);
    if (waiting && finish(waiting, words)) return false;

    const command = commands.find((c) =>
      `${words} `.startsWith(`${c.label.toLowerCase()} `),
    );
    if (!command) {
      setHeard(`"${words}" is not a command here`);
      return false;
    }
    if (command.options?.length === 0) {
      setHeard(`Nothing to ${command.label.toLowerCase()} yet`);
      return false;
    }
    if (finish(command, words.slice(command.label.length).trim())) return false;
    setOpen(command.label);
    return true;
  }

  // The listener below is set up once, so it reaches the latest `hear` through this
  const latestHear = useRef(hear);
  useEffect(() => {
    latestHear.current = hear;
  });

  useEffect(() => {
    // The Rust side listens to the microphone and sends each sentence as it is spoken
    const speech = listen<Speech>("speech", ({ payload }) => {
      const wake = [...payload.text.matchAll(WAKE_PATTERN)].pop();
      if (!wake && !awake.current) return;
      const words = wake
        ? payload.text.slice(wake.index + wake[0].length).trim()
        : payload.text;
      setHeard(words);
      // A pause straight after the wake word keeps listening for the next sentence
      awake.current = !(payload.is_final && words) || latestHear.current(words);
    });
    const status = listen<string>("voice-status", ({ payload }) =>
      setProblem(payload),
    );
    return () => {
      speech.then((stop) => stop());
      status.then((stop) => stop());
    };
  }, []);

  return (
    <nav className="voice-bar" onClick={(e) => e.stopPropagation()}>
      <span className="voice-heard">
        {problem || heard || `Say "${WAKE_WORD}"`}
      </span>
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
            className={open === label ? "waiting" : undefined}
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
