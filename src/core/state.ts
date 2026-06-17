import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as Automerge from "@automerge/automerge";
import type { BlockChange, BlockState, DocBlock, DocsCodeState, JournalEvent } from "./types.js";
import { ensureDir, nowIso, pathExists } from "../shared/utils.js";

export type CrdtState = Automerge.Doc<DocsCodeState>;

export function stateDir(root: string): string {
  return path.join(root, ".docs-code");
}

export function statePath(root: string): string {
  return path.join(stateDir(root), "state.json");
}

export function automergePath(root: string): string {
  return path.join(stateDir(root), "index.automerge");
}

export function plansDir(root: string): string {
  return path.join(stateDir(root), "plans");
}

export function createBlockId(): string {
  return `blk_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function blockToState(block: DocBlock, blockId = createBlockId()): BlockState {
  return {
    blockId,
    key: block.key,
    kind: block.kind,
    file: block.file,
    titlePath: block.titlePath,
    title: block.title,
    startLine: block.startLine,
    endLine: block.endLine,
    hash: block.hash,
    semanticHash: block.semanticHash,
    keywords: block.keywords,
    lastSeenAt: nowIso(),
    aliases: [block.key]
  };
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        cleaned[key] = stripUndefined(item);
      }
    }
    return cleaned as T;
  }
  return value;
}

function emptyState(docsDir: string): CrdtState {
  return Automerge.from<DocsCodeState>({
    version: 2,
    generatedAt: nowIso(),
    docsDir,
    blocks: {},
    keyIndex: {},
    events: []
  });
}

function migrateJsonState(raw: unknown, docsDir: string): CrdtState {
  const source = raw as Partial<DocsCodeState> & { version?: number };
  let doc = emptyState(docsDir);
  doc = Automerge.change(doc, (draft) => {
    draft.docsDir = source.docsDir ?? docsDir;
    draft.generatedAt = nowIso();
    draft.blocks = {};
    draft.keyIndex = {};
    draft.events = source.events ?? [];
    for (const [key, block] of Object.entries(source.blocks ?? {})) {
      const existing = block as BlockState;
      const blockId = existing.blockId ?? createBlockId();
      draft.blocks[blockId] = {
        ...existing,
        blockId,
        aliases: [...new Set([...(existing.aliases ?? []), key])],
        lastSeenAt: existing.lastSeenAt ?? nowIso()
      };
      draft.keyIndex[key] = blockId;
    }
  });
  return doc;
}

export async function loadCrdtState(root: string, docsDir = "docs"): Promise<CrdtState> {
  const binaryPath = automergePath(root);
  if (await pathExists(binaryPath)) {
    const binary = await fs.readFile(binaryPath);
    return Automerge.load<DocsCodeState>(binary);
  }
  const jsonPath = statePath(root);
  if (await pathExists(jsonPath)) {
    return migrateJsonState(JSON.parse(await fs.readFile(jsonPath, "utf8")), docsDir);
  }
  return emptyState(docsDir);
}

export async function saveCrdtState(root: string, doc: CrdtState): Promise<void> {
  await ensureDir(stateDir(root));
  const saved = Automerge.save(doc);
  await fs.writeFile(automergePath(root), Buffer.from(saved));
  await fs.writeFile(statePath(root), JSON.stringify(Automerge.toJS(doc), null, 2) + "\n", "utf8");
}

export async function loadState(root: string, docsDir = "docs"): Promise<DocsCodeState> {
  return Automerge.toJS(await loadCrdtState(root, docsDir));
}

export async function saveState(root: string, state: DocsCodeState): Promise<void> {
  await saveCrdtState(root, Automerge.from(state));
}

function appendEvent(draft: DocsCodeState, event: Omit<JournalEvent, "eventId" | "at">): void {
  draft.events.push(stripUndefined({
    eventId: randomUUID(),
    at: nowIso(),
    ...event
  }));
}

export function observeBlocks(doc: CrdtState, blocks: DocBlock[], eventType: JournalEvent["type"]): CrdtState {
  return Automerge.change(doc, (draft) => {
    draft.generatedAt = nowIso();
    for (const block of blocks) {
      const blockId = draft.keyIndex[block.key] ?? createBlockId();
      const previous = draft.blocks[blockId];
      draft.blocks[blockId] = {
        ...(previous ?? {}),
        ...blockToState(block, blockId),
        aliases: [...new Set([...(previous?.aliases ?? []), block.key])]
      };
      if (previous?.implementedHash) draft.blocks[blockId].implementedHash = previous.implementedHash;
      if (previous?.implementedAt) draft.blocks[blockId].implementedAt = previous.implementedAt;
      delete draft.blocks[blockId].removedAt;
      draft.keyIndex[block.key] = blockId;
      appendEvent(draft, {
        type: eventType,
        blockId,
        file: block.file,
        titlePath: block.titlePath,
        hash: block.hash,
        semanticHash: block.semanticHash
      });
    }
  });
}

export async function baselineState(root: string, blocks: DocBlock[], docsDir = "docs"): Promise<DocsCodeState> {
  let doc = emptyState(docsDir);
  doc = Automerge.change(doc, (draft) => {
    for (const block of blocks) {
      const item = blockToState(block);
      item.implementedHash = block.hash;
      item.implementedAt = nowIso();
      draft.blocks[item.blockId] = item;
      draft.keyIndex[block.key] = item.blockId;
      appendEvent(draft, {
        type: "baseline",
        blockId: item.blockId,
        file: item.file,
        titlePath: item.titlePath,
        hash: item.hash,
        semanticHash: item.semanticHash
      });
    }
  });
  await saveCrdtState(root, doc);
  return Automerge.toJS(doc);
}

export async function markImplemented(root: string, blocks: DocBlock[], docsDir = "docs"): Promise<DocsCodeState> {
  let doc = await loadCrdtState(root, docsDir);
  doc = Automerge.change(doc, (draft) => {
    const seen = new Set<string>();
    for (const block of blocks) {
      const blockId = draft.keyIndex[block.key] ?? createBlockId();
      const previous = draft.blocks[blockId];
      draft.blocks[blockId] = {
        ...(previous ?? {}),
        ...blockToState(block, blockId),
        implementedHash: block.hash,
        implementedAt: nowIso(),
        aliases: [...new Set([...(previous?.aliases ?? []), block.key])]
      };
      delete draft.blocks[blockId].removedAt;
      draft.keyIndex[block.key] = blockId;
      seen.add(blockId);
      appendEvent(draft, {
        type: "implemented",
        blockId,
        file: block.file,
        titlePath: block.titlePath,
        hash: block.hash,
        semanticHash: block.semanticHash
      });
    }
    for (const [blockId, block] of Object.entries(draft.blocks)) {
      if (!seen.has(blockId) && !block.removedAt) {
        block.removedAt = nowIso();
      }
    }
  });
  await saveCrdtState(root, doc);
  return Automerge.toJS(doc);
}

export async function markChangesImplemented(root: string, changes: BlockChange[], docsDir = "docs"): Promise<DocsCodeState> {
  let doc = await loadCrdtState(root, docsDir);
  doc = Automerge.change(doc, (draft) => {
    const seen = new Set<string>();
    for (const change of changes) {
      if (!change.block) continue;
      const block = change.block;
      const blockId = change.blockId ?? draft.keyIndex[block.key] ?? createBlockId();
      const previous = draft.blocks[blockId] ?? change.previous;
      draft.blocks[blockId] = {
        ...(previous ?? {}),
        ...blockToState(block, blockId),
        implementedHash: block.hash,
        implementedAt: nowIso(),
        aliases: [...new Set([...(previous?.aliases ?? []), block.key])]
      };
      delete draft.blocks[blockId].removedAt;
      draft.keyIndex[block.key] = blockId;
      seen.add(blockId);
      appendEvent(draft, {
        type: "implemented",
        blockId,
        file: block.file,
        titlePath: block.titlePath,
        hash: block.hash,
        semanticHash: block.semanticHash,
        previous: previous ? stripUndefined(previous) : undefined,
        similarity: change.similarity,
        reasons: change.reasons
      } as Omit<JournalEvent, "eventId" | "at">);
    }
    for (const change of changes) {
      if (change.type !== "removed" || !change.previous) continue;
      const blockId = change.blockId ?? change.previous.blockId;
      if (!draft.blocks[blockId]) continue;
      draft.blocks[blockId].removedAt = nowIso();
      appendEvent(draft, {
        type: "implemented",
        blockId,
        previous: stripUndefined(change.previous),
        similarity: change.similarity,
        reasons: change.reasons
      } as Omit<JournalEvent, "eventId" | "at">);
    }
    for (const [blockId, block] of Object.entries(draft.blocks)) {
      if (!seen.has(blockId) && changes.some((change) => change.type === "removed" && change.blockId === blockId)) {
        block.implementedHash = block.hash;
        block.implementedAt = nowIso();
      }
    }
  });
  await saveCrdtState(root, doc);
  return Automerge.toJS(doc);
}
