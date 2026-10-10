import { useEffect, useState } from "react";
import type { ImageResult } from "./types";

const SLIDERS = [
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "hue", label: "Hue", min: -180, max: 180 },
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "temperature", label: "Temperature", min: -100, max: 100 },
] as const;

type Adjustments = Record<(typeof SLIDERS)[number]["key"], number>;

const DEFAULTS: Adjustments = {
  saturation: 0,
  hue: 0,
  brightness: 0,
  contrast: 0,
  temperature: 0,
};

const MOCK_TOOLS = ["Grayscale", "Posterize", "Flip", "Grid"];

type Props = {
  image: ImageResult;
  onClose: () => void;
};

function ImageModal({ image, onClose }: Props) {
  const [adjust, setAdjust] = useState<Adjustments>(DEFAULTS);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // CSS has no temperature filter, so warm/cool is an SVG color matrix that
  // boosts red and cuts blue (or the reverse)
  const warmth = (adjust.temperature / 100) * 0.3;
  const filter = [
    "url(#temperature)",
    `saturate(${1 + adjust.saturation / 100})`,
    `hue-rotate(${adjust.hue}deg)`,
    `brightness(${1 + adjust.brightness / 100})`,
    `contrast(${1 + adjust.contrast / 100})`,
  ].join(" ");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="temperature" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values={`${1 + warmth} 0 0 0 0  0 1 0 0 0  0 0 ${1 - warmth} 0 0  0 0 0 1 0`}
            />
          </filter>
        </svg>

        <img src={image.url} alt={image.title} style={{ filter }} />

        <aside className="controls">
          <h2>{image.title}</h2>
          {SLIDERS.map(({ key, label, min, max }) => (
            <label key={key}>
              {label}: {adjust[key]}
              <input
                type="range"
                min={min}
                max={max}
                value={adjust[key]}
                onChange={(e) =>
                  setAdjust({ ...adjust, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <div className="tools">
            {/* Mock tools: not wired to the image yet */}
            {MOCK_TOOLS.map((label) => (
              <button key={label} type="button">
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setAdjust(DEFAULTS)}>
              Reset
            </button>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </aside>
      </div>
    </div>
  );
}

export default ImageModal;
