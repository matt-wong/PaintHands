export type ImageResult = {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  creator: string;
  source: string;
  page_url: string;
};

export type SearchResponse = {
  results: ImageResult[];
  errors: string[];
};

export type Adjustments = {
  saturation: number;
  hue: number;
  brightness: number;
  contrast: number;
  temperature: number;
};

// A pinned image keeps its alterations as settings; the image itself is never changed
export type PinnedImage = {
  image: ImageResult;
  adjust: Adjustments;
  flipped: boolean;
};
