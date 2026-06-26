// Stub type definitions for legacy results mock data.
// Real data now flows through /hooks/queries/useResults — these types remain
// so the presentation components keep their typed shape.

export interface BadgeUnlock {
  id: string;
  name: string;
  description: string;
  icon: "flame" | "trophy" | "zap" | "star";
}

export interface StyleMatchDimension {
  label: string;
  value: number;
  description?: string;
}

export interface StyleMatch {
  overall: number;
  dimensions: StyleMatchDimension[];
}

export interface FillerWord {
  word: string;
  count: number;
}

export type CategoryTileFormat = "score" | "boolean" | "raw";

export interface CategoryTile {
  label: string;
  value: number;
  format: CategoryTileFormat;
  detail?: string;
}

export interface CategoryBreakdown {
  title: string;
  tiles: CategoryTile[];
  alternativePrompt: string;
  alternativeLine: string;
}
