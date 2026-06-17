import { jaccard } from "./utils.js";
function titlePathKey(block) {
    return `${block.file}#${block.titlePath.join(" > ")}`;
}
function fileTitleScore(current, previous) {
    let score = 0;
    if (current.file === previous.file)
        score += 0.25;
    if (titlePathKey(current) === titlePathKey(previous))
        score += 0.35;
    if (current.semanticHash === previous.semanticHash)
        score += 0.3;
    score += jaccard(current.keywords, previous.keywords) * 0.4;
    return Math.min(score, 1);
}
function classifyMatched(block, previous, similarity) {
    const reasons = [];
    if (block.file !== previous.file)
        reasons.push("file moved");
    if (block.titlePath.join(" > ") !== previous.titlePath.join(" > "))
        reasons.push("heading changed");
    if (block.hash !== previous.hash)
        reasons.push("content changed");
    if (previous.removedAt)
        reasons.push("previously removed block reappeared");
    if (previous.removedAt) {
        return { type: "resurrected", block, previous, similarity, blockId: previous.blockId, reasons };
    }
    if (block.hash === previous.hash && (block.file !== previous.file || block.titlePath.join("\n") !== previous.titlePath.join("\n"))) {
        return { type: block.file !== previous.file ? "moved" : "renamed", block, previous, similarity, blockId: previous.blockId, reasons };
    }
    if (block.hash !== previous.hash) {
        return { type: "modified", block, previous, similarity, blockId: previous.blockId, reasons };
    }
    return { type: "unchanged", block, previous, similarity, blockId: previous.blockId, reasons };
}
export function diffBlocks(current, previous, keyIndex = {}) {
    const changes = [];
    const consumedPrevious = new Set();
    const previousList = Object.values(previous);
    const previousByPath = new Map();
    for (const item of previousList) {
        previousByPath.set(titlePathKey(item), item);
    }
    for (const block of current) {
        const indexedId = keyIndex[block.key];
        const direct = (indexedId ? previous[indexedId] : undefined) ?? previousByPath.get(titlePathKey(block));
        if (direct) {
            consumedPrevious.add(direct.blockId);
            changes.push(classifyMatched(block, direct, fileTitleScore(block, direct)));
            continue;
        }
        let best;
        for (const candidate of previousList) {
            if (consumedPrevious.has(candidate.blockId))
                continue;
            const score = fileTitleScore(block, candidate);
            if (score > (best?.similarity ?? 0)) {
                best = { previous: candidate, similarity: score };
            }
        }
        if (best && best.similarity >= 0.66) {
            consumedPrevious.add(best.previous.blockId);
            changes.push(classifyMatched(block, best.previous, best.similarity));
        }
        else {
            changes.push({ type: "added", block, blockId: undefined, reasons: ["no matching CRDT block identity"] });
        }
    }
    for (const item of previousList) {
        if (!consumedPrevious.has(item.blockId) && !item.removedAt) {
            changes.push({ type: "removed", previous: item, blockId: item.blockId, reasons: ["not observed in current docs scan"] });
        }
    }
    return changes
        .filter((change) => change.type !== "unchanged")
        .sort((a, b) => {
        const left = a.block?.file ?? a.previous?.file ?? "";
        const right = b.block?.file ?? b.previous?.file ?? "";
        return left.localeCompare(right);
    });
}
//# sourceMappingURL=diff.js.map