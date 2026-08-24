export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type ElementStyle = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  bullet?: boolean;
};

export type CodeLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "json"
  | "sql"
  | "markdown"
  | "html"
  | "css";

export type WhiteboardElement = {
  id: string;
  type: "rectangle" | "circle" | "text" | "line" | "drawing" | "code";
  position: Position;
  size?: Size;
  rotation?: number;
  content?: string;
  /** Monaco language id. Only meaningful for "code" elements. */
  language?: CodeLanguage;
  title?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
  style?: Partial<ElementStyle>;
};

export type WhiteboardDocument = {
  id: string;
  version: number;
  elements: WhiteboardElement[];
  createdAt: number;
  createdBy: string;
};
