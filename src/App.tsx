import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import AdjustedImage from "./AdjustedImage";
import ImageModal, { DEFAULTS } from "./ImageModal";
import VoiceBar, { numbers, type VoiceCommand } from "./VoiceBar";
import type { ImageResult, PinnedImage, SearchResponse } from "./types";

const PINNED_STORAGE_KEY = "pinned-images";

function loadPinned(): PinnedImage[] {
  try {
    return JSON.parse(localStorage.getItem(PINNED_STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

// The open image, and which section it was opened from (an image can be in both)
type Selection = { image: ImageResult; from: "pinned" | "results" };

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Selection | null>(null);
  const [pinned, setPinned] = useState<PinnedImage[]>(loadPinned);

  // Keep the pinned collection between runs of the app
  useEffect(() => {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
  }, [pinned]);

  function pin(pin: PinnedImage) {
    const exists = pinned.some((p) => p.image.id === pin.image.id);
    setPinned(
      exists
        ? pinned.map((p) => (p.image.id === pin.image.id ? pin : p))
        : [...pinned, pin],
    );
  }

  function unpin(id: string) {
    setPinned(pinned.filter((p) => p.image.id !== id));
  }

  function search(text = query) {
    if (!text.trim()) return;
    loadImages(text);
  }

  // Without a search term, the Rust side sends random images
  async function loadImages(text?: string) {
    setStatus("Searching...");
    setResults([]);
    try {
      // The Rust side calls Unsplash and Pixabay (10 each) and alternates them
      const data = await invoke<SearchResponse>("search_images", {
        query: text,
      });
      setResults(data.results);
      setStatus(
        data.errors.join(" · ") ||
          (data.results.length ? "" : "No images found."),
      );
    } catch (err) {
      setStatus(`Search failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Previous/Next step through the pinned images, then the results, wrapping at
  // the ends. An image that's in both is visited in both places.
  const sequence: Selection[] = [
    ...pinned.map((p) => ({ image: p.image, from: "pinned" as const })),
    ...results.map((image) => ({ image, from: "results" as const })),
  ];
  const selectedIndex = selected
    ? sequence.findIndex(
        (s) => s.from === selected.from && s.image.id === selected.image.id,
      )
    : -1;
  function step(by: number) {
    const next = (selectedIndex + by + sequence.length) % sequence.length;
    setSelected(sequence[next]);
  }
  const canStep = selectedIndex >= 0 && sequence.length > 1;

  // Voice phrases available on the main screen; Pin and Edit only with results showing
  const commands: VoiceCommand[] = [
    {
      label: "Search",
      run: () =>
        query.trim()
          ? search()
          : document.getElementById("search-input")?.focus(),
      // Spoken as "search red apples"
      dictate: (words) => {
        setQuery(words);
        search(words);
      },
    },
    {
      label: "View",
      options: numbers(pinned.length),
      run: (choice) =>
        setSelected({ image: pinned[choice].image, from: "pinned" }),
    },
    ...(results.length > 0
      ? [
          {
            label: "Pin",
            options: numbers(results.length),
            run: (choice: number) =>
              pin({ image: results[choice], adjust: DEFAULTS, flipped: false }),
          },
          {
            label: "Edit",
            options: numbers(results.length),
            run: (choice: number) =>
              setSelected({ image: results[choice], from: "results" }),
          },
        ]
      : []),
  ];

  return (
    <main className="container">
      <h1>PaintHands</h1>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input
          id="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search images..."
        />
        <button type="submit">Search</button>
        <button type="button" onClick={() => loadImages()}>
          Random
        </button>
      </form>
      <p>{status}</p>

      {pinned.length > 0 && (
        <section>
          <h2>Pinned</h2>
          <div className="results">
            {pinned.map(({ image, adjust, flipped }, index) => (
              <div key={image.id}>
                <span>{index + 1}</span>
                <figure onClick={() => setSelected({ image, from: "pinned" })}>
                  <AdjustedImage
                    src={image.thumbnail}
                    alt={image.title}
                    adjust={adjust}
                    flipped={flipped}
                  />
                  <footer>{image.source}</footer>
                </figure>
              </div>
            ))}
          </div>
          {results.length > 0 && <h2>Results</h2>}
        </section>
      )}

      <div className="results">
        {results.map((img, index) => (
          <div key={img.id}>
          <span>{index + 1}</span>
          <figure
            onClick={() => setSelected({ image: img, from: "results" })}
          >
            <img src={img.thumbnail} alt={img.title} loading="lazy" />
            <footer>{img.source}</footer>
          </figure>
          </div>
        ))}
      </div>

      {!selected && <VoiceBar commands={commands} />}

      {selected && (
        <ImageModal
          key={selected.image.id}
          image={selected.image}
          pinned={pinned.find((p) => p.image.id === selected.image.id)}
          onPin={pin}
          onUnpin={() => unpin(selected.image.id)}
          onClose={() => setSelected(null)}
          onPrevious={canStep ? () => step(-1) : undefined}
          onNext={canStep ? () => step(1) : undefined}
        />
      )}
    </main>
  );
}

export default App;
