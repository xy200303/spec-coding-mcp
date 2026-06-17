import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as Automerge from "@automerge/automerge";
import { ensureDir, nowIso, pathExists } from "./utils.js";
export function stateDir(root) {
    return path.join(root, ".docs-code");
}
export function statePath(root) {
    return path.join(stateDir(root), "state.json");
}
export function automergePath(root) {
    return path.join(stateDir(root), "index.automerge");
}
export function plansDir(root) {
    return path.join(stateDir(root), "plans");
}
export function createBlockId() {
    return `blk_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
export function blockToState(block, blockId = createBlockId()) {
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
function stripUndefined(value) {
    if (Array.isArray(value)) {
        return value.map((item) => stripUndefined(item));
    }
    if (value && typeof value === "object") {
        const cleaned = {};
        for (const [key, item] of Object.entries(value)) {
            if (item !== undefined) {
                cleaned[key] = stripUndefined(item);
            }
        }
        return cleaned;
    }
    return value;
}
function emptyState(docsDir) {
    return Automerge.from({
        version: 2,
        generatedAt: nowIso(),
        docsDir,
        blocks: {},
        keyIndex: {},
        events: []
    });
}
function migrateJsonState(raw, docsDir) {
    const source = raw;
    let doc = emptyState(docsDir);
    doc = Automerge.change(doc, (draft) => {
        draft.docsDir = source.docsDir ?? docsDir;
        draft.generatedAt = nowIso();
        draft.blocks = {};
        draft.keyIndex = {};
        draft.events = source.events ?? [];
        for (const [key, block] of Object.entries(source.blocks ?? {})) {
            const existing = block;
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
export async function loadCrdtState(root, docsDir = "docs") {
    const binaryPath = automergePath(root);
    if (await pathExists(binaryPath)) {
        const binary = await fs.readFile(binaryPath);
        return Automerge.load(binary);
    }
    const jsonPath = statePath(root);
    if (await pathExists(jsonPath)) {
        return migrateJsonState(JSON.parse(await fs.readFile(jsonPath, "utf8")), docsDir);
    }
    return emptyState(docsDir);
}
export async function saveCrdtState(root, doc) {
    await ensureDir(stateDir(root));
    const saved = Automerge.save(doc);
    await fs.writeFile(automergePath(root), Buffer.from(saved));
    await fs.writeFile(statePath(root), JSON.stringify(Automerge.toJS(doc), null, 2) + "\n", "utf8");
}
export async function loadState(root, docsDir = "docs") {
    return Automerge.toJS(await loadCrdtState(root, docsDir));
}
export async function saveState(root, state) {
    await saveCrdtState(root, Automerge.from(state));
}
function appendEvent(draft, event) {
    draft.events.push(stripUndefined({
        eventId: randomUUID(),
        at: nowIso(),
        ...event
    }));
}
export function observeBlocks(doc, blocks, eventType) {
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
            if (previous?.implementedHash)
                draft.blocks[blockId].implementedHash = previous.implementedHash;
            if (previous?.implementedAt)
                draft.blocks[blockId].implementedAt = previous.implementedAt;
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
export async function baselineState(root, blocks, docsDir = "docs") {
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
export async function markImplemented(root, blocks, docsDir = "docs") {
    let doc = await loadCrdtState(root, docsDir);
    doc = Automerge.change(doc, (draft) => {
        const seen = new Set();
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
export async function markChangesImplemented(root, changes, docsDir = "docs") {
    let doc = await loadCrdtState(root, docsDir);
    doc = Automerge.change(doc, (draft) => {
        const seen = new Set();
        for (const change of changes) {
            if (!change.block)
                continue;
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
            });
        }
        for (const change of changes) {
            if (change.type !== "removed" || !change.previous)
                continue;
            const blockId = change.blockId ?? change.previous.blockId;
            if (!draft.blocks[blockId])
                continue;
            draft.blocks[blockId].removedAt = nowIso();
            appendEvent(draft, {
                type: "implemented",
                blockId,
                previous: stripUndefined(change.previous),
                similarity: change.similarity,
                reasons: change.reasons
            });
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
//# sourceMappingURL=state.js.map