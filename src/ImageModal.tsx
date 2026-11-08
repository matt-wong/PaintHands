import { useEffect, useState } from "react";
import AdjustedImage from "./AdjustedImage";
import VoiceBar, { type VoiceCommand } from "./VoiceBar";
import type { Adjustments, ImageResult, PinnedImage } from "./types";

const SLIDERS = [
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "hue", label: "Hue", min: -180, max: 180 },
  { key: "brightness", label: "Brightness", min: -100, max: 100 },
  { key: "contrast", label: "Contrast", min: -100, max: 100 },
  { key: "temperature", label: "Temperature", min: -100, max: 100 },
] as const;

export const DEFAULTS: Adjustments = {
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
  // Set when there's another image to step to (pinned images, then results)
  onPrevious?: () => void;
  onNext?: () => void;
};

function ImageModal({
  image,
  pinned,
  onPin,
  onUnpin,
  onClose,
  onPrevious,
  onNext,
}: Props) {
  const [adjust, setAdjust] = useState<Adjustments>(pinned?.adjust ?? DEFAULTS);
  const [flipped, setFlipped] = useState(pinned?.flipped ?? false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Arrow keys belong to a slider while one is focused
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") onPrevious?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrevious, onNext]);

  // Voice phrases available while editing
  const commands: VoiceCommand[] = [
    {
      label: "Saturation",
      options: ["Low", "Medium", "High"],
      run: (choice) =>
        setAdjust({ ...adjust, saturation: [-100, 0, 100][choice] }),
    },
    { label: "Flip", run: () => setFlipped(!flipped) },
    ...(onPrevious && onNext
      ? [
          { label: "Previous", run: onPrevious },
          { label: "Next", run: onNext },
        ]
      : []),
    ...(pinned ? [{ label: "Unpin", run: onUnpin }] : []),
    {
      label: "Pin",
      run: () => {
        onPin({ image, adjust, flipped });
        onClose();
      },
    },
    { label: "Close", run: onClose },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {onPrevious && (
        <button
          type="button"
          className="modal-arrow"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
        >
          ‹
        </button>
      )}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* A spinner holds the image's place until the full-size image arrives */}
        <div className={loaded ? "modal-image" : "modal-image loading"}>
          <AdjustedImage
            src={image.url}
            alt={image.title}
            adjust={adjust}
            flipped={flipped}
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <div className="spinner" role="status" aria-label="Loading image" />
          )}
        </div>

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
      {onNext && (
        <button
          type="button"
          className="modal-arrow"
          aria-label="Next image"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          ›
        </button>
      )}
      <VoiceBar commands={commands} />
    </div>
  );
}

export default ImageModal;
