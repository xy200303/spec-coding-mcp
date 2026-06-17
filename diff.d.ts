import type { BlockChange, BlockState, DocBlock } from "./types.js";
export declare function diffBlocks(current: DocBlock[], previous: Record<string, BlockState>, keyIndex?: Record<string, string>): BlockChange[];
