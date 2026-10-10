import { useId } from "react";
import type { Adjustments } from "./types";

type Props = {
  src: string;
  alt: string;
  adjust: Adjustments;
  flipped: boolean;
};

// Shows an image with its alterations applied, without changing the image
function AdjustedImage({ src, alt, adjust, flipped }: Props) {
  // Each image needs its own temperature filter, so each gets a unique id
  const filterId = `temperature-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  // CSS has no temperature filter, so warm/cool is an SVG color matrix that
  // boosts red and cuts blue (or the reverse)
  const warmth = (adjust.temperature / 100) * 0.3;
  const filter = [
    `url(#${filterId})`,
    `saturate(${1 + adjust.saturation / 100})`,
    `hue-rotate(${adjust.hue}deg)`,
    `brightness(${1 + adjust.brightness / 100})`,
    `contrast(${1 + adjust.contrast / 100})`,
  ].join(" ");

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id={filterId} colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values={`${1 + warmth} 0 0 0 0  0 1 0 0 0  0 0 ${1 - warmth} 0 0  0 0 0 1 0`}
          />
        </filter>
      </svg>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{ filter, transform: flipped ? "scaleX(-1)" : undefined }}
      />
    </>
  );
}

export default AdjustedImage;
