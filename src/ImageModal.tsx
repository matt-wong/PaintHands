import { useEffect, useState } from "react";
import AdjustedImage from "./AdjustedImage";
import type { Adjustments, ImageResult, PinnedImage } from "./types";

const SLIDERS = [
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "hue", label: "Hue", min: -180, max: 180 },
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "temperature", label: "Temperature", min: -100, max: 100 },
] as const;

const DEFAULTS: Adjustments = {
  saturation: 0,
  hue: 0,
  brightness: 0,
  contrast: 0,
  temperature: 0,
};

type Props = {
  image: ImageResult;
  // Set when the image is already pinned, so its saved alterations are restored
  pinned?: PinnedImage;
  onPin: (pin: PinnedImage) => void;
  onUnpin: () => void;
  onClose: () => void;
};

function ImageModal({ image, pinned, onPin, onUnpin, onClose }: Props) {
  const [adjust, setAdjust] = useState<Adjustments>(pinned?.adjust ?? DEFAULTS);
  const [flipped, setFlipped] = useState(pinned?.flipped ?? false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <AdjustedImage
          src={image.url}
          alt={image.title}
          adjust={adjust}
          flipped={flipped}
        />

        <aside className="controls">
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
            <button type="button" onClick={() => setFlipped(!flipped)}>
              Flip
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjust(DEFAULTS);
                setFlipped(false);
              }}
            >
              Reset
            </button>
          </div>
          <div className="tools">
            <button
              type="button"
              onClick={() => onPin({ image, adjust, flipped })}
            >
              {pinned ? "Update pin" : "Pin"}
            </button>
            {pinned && (
              <button type="button" onClick={onUnpin}>
                Unpin
              </button>
            )}
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
