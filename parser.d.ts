import type { BlockKind, DocBlock } from "./types.js";
export declare function inferKind(titlePath: string[], file: string): BlockKind;
export declare function extractKeywords(text: string, titlePath: string[]): string[];
export declare function parseMarkdownFile(root: string, absoluteFile: string): Promise<DocBlock[]>;
export declare function scanDocs(root: string, docsDir?: string): Promise<DocBlock[]>;
