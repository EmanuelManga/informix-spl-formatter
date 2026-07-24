"use strict";

const KEYWORDS = [
    "DROP",
    "PROCEDURE",
    "IF",
    "EXISTS",
    "CREATE",
    "RETURNING",
    "AS",
    "DEFINE",
    "GLOBAL",
    "DEFAULT",
    "LET",
    "CALL",
    "SELECT",
    "INTO",
    "FROM",
    "WHERE",
    "AND",
    "OR",
    "NOT",
    "IN",
    "BETWEEN",
    "IS",
    "NULL",
    "THEN",
    "ELSE",
    "END",
    "FOR",
    "FOREACH",
    "WHILE",
    "DO",
    "TO",
    "STEP",
    "CONTINUE",
    "EXIT",
    "RETURN",
    "INSERT",
    "UPDATE",
    "DELETE",
    "VALUES",
    "SET",
    "COUNT",
    "MONTH",
    "YEAR",
    "TODAY",
    "CURRENT",
    "COALESCE",
    "MAX",
    "MIN",
    "SUM",
    "AVG",
    "BEGIN",
    "WORK",
    "COMMIT",
    "ROLLBACK",
    "WITH",
    "HOLD",
];

const KEYWORD_RE = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "gi");

/** Clause starters aligned with the statement (SELECT/INSERT/...). */
const CLAUSE_RE = /^(INTO|FROM|WHERE|VALUES|SET|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|GROUP|ORDER|HAVING|ON|WHEN|RETURNING)\b/i;

/** Extra indent under a WHERE/HAVING/ON/etc. */
const EXTRA_CONTINUATION_RE = /^(AND|OR|,)/i;

/**
 * @param {string} text
 * @param {{
 *   uppercase?: boolean,
 *   indentSize?: number,
 *   useTabs?: boolean,
 *   blankAfterQuery?: boolean,
 *   blankAfterIf?: boolean,
 *   blankAfterReturning?: boolean,
 *   blankBeforeElseEndIf?: boolean,
 *   keepEndClosersTogether?: boolean,
 * }} options
 */
function formatInformixSpl(text, options = {}) {
    const uppercase = options.uppercase !== false;
    const useTabs = options.useTabs === true;
    const indentSize = options.indentSize ?? 2;
    const unit = useTabs ? "\t" : " ".repeat(indentSize);

    const rawLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const indented = applyBlockIndent(rawLines, unit, uppercase);
    const spaced = applyBlankLineRules(indented, {
        blankAfterQuery: options.blankAfterQuery !== false,
        blankAfterIf: options.blankAfterIf !== false,
        blankAfterReturning: options.blankAfterReturning !== false,
        blankBeforeElseEndIf: options.blankBeforeElseEndIf !== false,
        keepEndClosersTogether: options.keepEndClosersTogether !== false,
    });
    const cleaned = collapseExtraBlankLines(spaced);

    return cleaned.join("\n").replace(/\s+$/, "") + "\n";
}

/**
 * @param {string[]} lines
 * @param {string} unit
 * @param {boolean} uppercase
 */
function applyBlockIndent(lines, unit, uppercase) {
    /** @type {string[]} */
    const out = [];
    /** Block nest depth inside procedure body (IF/FOR/FOREACH/WHILE). */
    let nest = 0;
    /** 0 = outside, 1 = CREATE header, 2 = procedure body */
    let region = 0;
    let pendingThen = false;
    /** Previous non-empty code line (for multi-line VALUES / arg lists). */
    let prevCode = "";
    /**
     * Stack of indent depths (in indent units) for content inside open `(`.
     * @type {number[]}
     */
    let parenStack = [];

    for (const original of lines) {
        const trimmed = original.trim();

        if (!trimmed) {
            out.push("");
            continue;
        }

        const line = isCommentOnly(trimmed) ? trimmed : uppercase ? uppercaseKeywords(trimmed) : trimmed;

        // --- region transitions ---
        if (/^DROP\s+PROCEDURE\b/i.test(line)) {
            region = 0;
            nest = 0;
            pendingThen = false;
            prevCode = "";
            parenStack = [];
            out.push(line);
            continue;
        }

        if (/^CREATE\s+PROCEDURE\b/i.test(line)) {
            region = 1;
            nest = 0;
            pendingThen = false;
            prevCode = line;
            parenStack = [];
            out.push(line);
            continue;
        }

        if (/^END\s+PROCEDURE\b/i.test(line)) {
            region = 0;
            nest = 0;
            pendingThen = false;
            prevCode = "";
            parenStack = [];
            out.push(line);
            continue;
        }

        if (region === 1) {
            if (isProcedureBodyStart(line)) {
                region = 2;
            } else {
                out.push(unit + line);
                prevCode = line;
                if (/RETURNING\b/i.test(line) && /;\s*$/.test(line)) {
                    region = 2;
                }
                continue;
            }
        }

        if (region !== 2) {
            out.push(line);
            prevCode = isCommentOnly(line) ? prevCode : line;
            continue;
        }

        // --- procedure body ---
        const closers = countClosers(line);
        const elseLine = isElseLine(line);
        const elseIfLine = isElseIfLine(line);

        let lineNest = nest;
        if (elseLine || elseIfLine) {
            lineNest = Math.max(0, nest - 1);
            parenStack = [];
        } else if (closers > 0) {
            lineNest = Math.max(0, nest - closers);
            parenStack = [];
        }

        let clauseExtra = 0;
        if (!isBlockKeywordLine(line) && !isCommentOnly(line)) {
            if (EXTRA_CONTINUATION_RE.test(line)) {
                clauseExtra = 2;
            } else if (CLAUSE_RE.test(line)) {
                clauseExtra = 1;
            } else if (prevCode && /,\s*$/.test(prevCode) && parenStack.length === 0) {
                clauseExtra = 1;
            }
        }

        /** @type {number} */
        let depth;
        if (/^\)/.test(line) && parenStack.length > 0) {
            // Closing paren aligns with subquery content (SELECT inside)
            depth = parenStack[parenStack.length - 1];
        } else if (parenStack.length > 0 && !isBlockKeywordLine(line)) {
            // Inside (...) — one level under the opener, plus clause extras
            depth = parenStack[parenStack.length - 1] + clauseExtra;
        } else {
            depth = 1 + lineNest + clauseExtra;
            // Multi-line VALUES / arg lists outside subqueries
            if (!isBlockKeywordLine(line) && !isCommentOnly(line) && clauseExtra === 0 && prevCode && /[,(]\s*$/.test(prevCode) && parenStack.length === 0) {
                depth = 1 + lineNest + 1;
            }
        }

        out.push(unit.repeat(depth) + line);

        // update nest after line
        if (!(elseLine || elseIfLine)) {
            nest = Math.max(0, nest - closers);
        }

        const openers = countOpeners(line);
        if (openers.ifThen) {
            nest += 1;
            pendingThen = false;
        } else if (openers.ifOnly) {
            pendingThen = true;
        } else if (pendingThen && /\bTHEN\b/i.test(line)) {
            nest += 1;
            pendingThen = false;
        }

        if (openers.forLoop) nest += 1;
        if (openers.foreach) nest += 1;
        if (openers.whileDo) nest += 1;

        // Update paren stack from this line's () balance (ignore strings)
        if (!isCommentOnly(line) && !isBlockKeywordLine(line)) {
            updateParenStack(parenStack, line, depth);
        }

        if (!isCommentOnly(line)) {
            prevCode = line;
        }
    }

    return out;
}

/**
 * Push/pop indent bases for nested parentheses.
 * Content inside a `(` opened at end of a line sits one level deeper than that line.
 * @param {number[]} stack
 * @param {string} line
 * @param {number} lineDepth
 */
function updateParenStack(stack, line, lineDepth) {
    const plain = stripStrings(line);
    for (let i = 0; i < plain.length; i++) {
        const ch = plain[i];
        if (ch === "(") {
            // Content inside this paren
            stack.push(lineDepth + 1);
        } else if (ch === ")") {
            if (stack.length) stack.pop();
        }
    }
}

/**
 * @param {string} line
 */
function stripStrings(line) {
    return line.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""');
}

/**
 * @param {string} line
 */
function isProcedureBodyStart(line) {
    if (isCommentOnly(line)) return true;
    return /^(DEFINE|LET|CALL|SELECT|INSERT|UPDATE|DELETE|RETURN|IF|FOR|FOREACH|WHILE|BEGIN)\b/i.test(line);
}

/**
 * @param {string} line
 */
function countOpeners(line) {
    const result = {
        ifThen: false,
        ifOnly: false,
        forLoop: false,
        foreach: false,
        whileDo: false,
    };

    if (/^END\s+(IF|FOR|FOREACH|WHILE|PROCEDURE)\b/i.test(line)) {
        return result;
    }

    if (/^FOREACH\b/i.test(line)) {
        result.foreach = true;
        return result;
    }

    if (/^FOR\b/i.test(line)) {
        result.forLoop = true;
    }

    if (/^WHILE\b/i.test(line)) {
        result.whileDo = true;
    }

    if (/^IF\b/i.test(line)) {
        const hasThen = /\bTHEN\b/i.test(line);
        const hasEndIf = /\bEND\s+IF\b/i.test(line);
        if (hasThen && !hasEndIf) {
            result.ifThen = true;
        } else if (!hasThen && !hasEndIf) {
            result.ifOnly = true;
        }
    }

    return result;
}

/**
 * @param {string} line
 */
function countClosers(line) {
    let n = 0;
    if (/^END\s+IF\b/i.test(line)) n += 1;
    if (/^END\s+FOR\b/i.test(line)) n += 1;
    if (/^END\s+FOREACH\b/i.test(line)) n += 1;
    if (/^END\s+WHILE\b/i.test(line)) n += 1;
    return n;
}

/**
 * @param {string} line
 */
function isElseLine(line) {
    return /^ELSE\b/i.test(line) && !/^ELSE\s+IF\b/i.test(line);
}

/**
 * @param {string} line
 */
function isElseIfLine(line) {
    return /^ELSE\s+IF\b/i.test(line) || /^ELIF\b/i.test(line);
}

/**
 * @param {string} line
 */
function isBlockKeywordLine(line) {
    return /^(IF|ELSE|END|FOR|FOREACH|WHILE|DEFINE|LET|CALL|RETURN|CONTINUE|EXIT|CREATE|DROP|BEGIN|COMMIT|ROLLBACK)\b/i.test(line);
}

/**
 * @param {string} line
 */
function isCommentOnly(line) {
    return /^--/.test(line);
}

/**
 * @param {string} line
 */
function uppercaseKeywords(line) {
    if (isCommentOnly(line)) return line;

    /** @type {string[]} */
    const strings = [];
    const protectedLine = line.replace(/(["'])(?:\\.|(?!\1).)*\1/g, (m) => {
        strings.push(m);
        return `__STR${strings.length - 1}__`;
    });

    const uppered = protectedLine.replace(KEYWORD_RE, (m) => m.toUpperCase());
    return uppered.replace(/__STR(\d+)__/g, (_, i) => strings[Number(i)]);
}

/**
 * @param {string[]} lines
 * @param {{
 *   blankAfterQuery?: boolean,
 *   blankAfterIf?: boolean,
 *   blankAfterReturning?: boolean,
 *   blankBeforeElseEndIf?: boolean,
 *   keepEndClosersTogether?: boolean,
 * }} options
 */
function applyBlankLineRules(lines, options = {}) {
    const blankAfterQuery = options.blankAfterQuery !== false;
    const blankAfterIf = options.blankAfterIf !== false;
    const blankAfterReturning = options.blankAfterReturning !== false;
    const blankBeforeElseEndIf = options.blankBeforeElseEndIf !== false;
    const keepEndClosersTogether = options.keepEndClosersTogether !== false;
    /** @type {string[]} */
    const out = [];
    let inQuery = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) continue;

        // Blank BEFORE ELSE / END IF
        if (blankBeforeElseEndIf && (isElseLine(trimmed) || isElseIfLine(trimmed) || /^END\s+IF\b/i.test(trimmed))) {
            const prev = lastNonBlankTrimmed(out);
            const gluedClosers = keepEndClosersTogether && isBlockCloser(trimmed) && prev && isBlockCloser(prev);

            if (!gluedClosers && out.length && out[out.length - 1].trim() !== "") {
                out.push("");
            }
        }

        out.push(line);

        if (isCommentOnly(trimmed)) continue;

        if (/^(SELECT|INSERT|UPDATE|DELETE)\b/i.test(trimmed)) {
            inQuery = true;
        }

        let wantBlank = false;
        const next = nextMeaningfulSkippingComments(lines, i + 1);

        // DEFINE / LET
        const kind = statementKind(trimmed);
        if (kind === "DEFINE" || kind === "LET") {
            if (next && statementKind(next.trimmed) !== kind && !isBlockCloserOrElse(next.trimmed)) {
                wantBlank = true;
            }
        }

        // After last RETURNING line (before first DEFINE)
        if (blankAfterReturning && next && /;\s*$/.test(trimmed) && /^DEFINE\b/i.test(next.trimmed) && !/^DEFINE\b/i.test(trimmed)) {
            wantBlank = true;
        }

        // End of query
        if (inQuery && /;\s*$/.test(trimmed)) {
            inQuery = false;
            if (blankAfterQuery && next && !isBlockCloserOrElse(next.trimmed)) {
                wantBlank = true;
            }
        }

        // IF / ELSE / END IF — blank AFTER
        if (blankAfterIf && next) {
            const isIfThen = /^IF\b/i.test(trimmed) && /\bTHEN\b/i.test(trimmed) && !/\bEND\s+IF\b/i.test(trimmed);
            const isElse = isElseLine(trimmed) || isElseIfLine(trimmed);
            const isEndIf = /^END\s+IF\b/i.test(trimmed);

            if (isIfThen || isElse) {
                wantBlank = true;
            } else if (isEndIf) {
                // Keep END IF / END FOR / END FOREACH stacks glued
                if (keepEndClosersTogether && isBlockCloser(next.trimmed)) {
                    // no blank
                } else if (!isBlockCloserOrElse(next.trimmed)) {
                    wantBlank = true;
                }
            }
        }

        if (wantBlank) out.push("");
    }

    return out;
}

/**
 * @param {string} trimmed
 * @returns {"DEFINE"|"LET"|"OTHER"}
 */
function statementKind(trimmed) {
    if (/^DEFINE\b/i.test(trimmed)) return "DEFINE";
    if (/^LET\b/i.test(trimmed)) return "LET";
    return "OTHER";
}

/**
 * @param {string[]} lines
 * @param {number} from
 */
function nextMeaningfulSkippingComments(lines, from) {
    for (let i = from; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        if (isCommentOnly(trimmed)) continue;
        return { index: i, trimmed, line: lines[i] };
    }
    return null;
}

/**
 * @param {string} trimmed
 */
function isBlockCloser(trimmed) {
    return /^END\s+(IF|FOR|FOREACH|WHILE)\b/i.test(trimmed);
}

/**
 * @param {string} trimmed
 */
function isBlockCloserOrElse(trimmed) {
    return isBlockCloser(trimmed) || /^(ELSE|ELIF)\b/i.test(trimmed);
}

/**
 * @param {string[]} lines
 */
function lastNonBlankTrimmed(lines) {
    for (let i = lines.length - 1; i >= 0; i--) {
        const t = lines[i].trim();
        if (t) return t;
    }
    return null;
}

/**
 * @param {string[]} lines
 */
function collapseExtraBlankLines(lines) {
    /** @type {string[]} */
    const out = [];
    let blankRun = 0;

    for (const line of lines) {
        if (!line.trim()) {
            blankRun += 1;
            if (blankRun <= 1) out.push("");
            continue;
        }
        blankRun = 0;
        out.push(line);
    }

    while (out.length && !out[0].trim()) out.shift();
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out;
}

module.exports = { formatInformixSpl };
