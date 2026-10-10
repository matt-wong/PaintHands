import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ImageModal from "./ImageModal";
import type { ImageResult, SearchResponse } from "./types";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<ImageResult | null>(null);

  async function search() {
    if (!query.trim()) return;
    setStatus("Searching...");
    setResults([]);
    try {
      // The Rust side calls Unsplash and Pixabay (10 each) and alternates them
      const data = await invoke<SearchResponse>("search_images", { query });
      setResults(data.results);
      setStatus(
        data.errors.join(" · ") ||
          (data.results.length ? "" : "No images found."),
      );
    } catch (err) {
      setStatus(`Search failed: ${err instanceof Error ? err.message : err}`);
    }
  }

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
      </form>
      <p>{status}</p>

      <div className="results">
        {results.map((img, index) => (
          <div key={img.id}>
          <span>{index + 1}</span>
          <figure onClick={() => setSelected(img)}>
            <img src={img.thumbnail} alt={img.title} loading="lazy" />
            <footer>{img.source}</footer>
          </figure>
          </div>
        ))}
      </div>

      {selected && <ImageModal image={selected} onClose={() => setSelected(null)} />
      }
    </main>
  );
}

export default App;
