/* Spec document reading helper. */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SpecItem } from "./types.js";

export async function readSpecsWithText(root: string, items: SpecItem[], maxChars: number): Promise<Array<SpecItem & { text: string }>> {
  void maxChars;
  const specs: Array<SpecItem & { text: string }> = [];
  for (const item of items) {
    const text = await fs.readFile(path.join(root, item.file), "utf8");
    specs.push({
      ...item,
      text
    });
  }
  return specs;
}
