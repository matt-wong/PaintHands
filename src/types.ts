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
