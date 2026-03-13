// ─────────────────────────────────────────────────────────────────────────────
// PROMPT ASSEMBLER — Composes the system prompt from modular rule files.
// Instead of one 270-line monolith, this loads base + shapes + animations
// always, and conditionally loads advanced rules based on spec content.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RULES = require("./base");
const SHAPE_RULES = require("./shapes");
const ANIMATION_RULES = require("./animations");
const { getAdvancedRules } = require("./advanced");
const { getDatavizRules } = require("./dataviz");

/**
 * Assemble a system prompt tailored to the given spec.
 * @param {object} specData — The parsed sparse motion spec JSON
 * @returns {string} — The assembled system prompt
 */
function assemblePrompt(specData) {
  const parts = [
    BASE_RULES,
    "",
    SHAPE_RULES,
    "",
    ANIMATION_RULES,
  ];

  // Conditionally add advanced rules based on spec content
  const advancedRules = getAdvancedRules(specData);
  if (advancedRules.length > 0) {
    parts.push("");
    parts.push("ADVANCED ANIMATION RULES (specific to this spec):");
    for (const rule of advancedRules) {
      parts.push("");
      parts.push(rule);
    }
  }

  // Conditionally add dataviz rules based on spec content
  const datavizRules = getDatavizRules(specData);
  if (datavizRules.length > 0) {
    parts.push("");
    parts.push("DATA VISUALIZATION RULES (specific to this spec):");
    for (const rule of datavizRules) {
      parts.push("");
      parts.push(rule);
    }
  }

  // Final validation checklist (always included)
  parts.push("");
  parts.push(`FINAL VALIDATION CHECKLIST
Before producing your output, ensure:
- No external libraries.
- No loops (for, while, .map, Array.from).
- No template literals, no backticks, no dollar symbol.
- All interpolate ranges are valid (exactly 2 increasing values).
- All variables are declared before use.
- JSX braces and parentheses are balanced.
- All shapes are div elements (except polyline shapes which use inline SVG).
- There is exactly one AbsoluteFill root.
- The AbsoluteFill has a backgroundColor matching the spec "bg" field.

OUTPUT REQUIREMENT
Return only the JSX component body. No explanations, comments, or non-code text.
MULTI-OBJECT RULE: Each object in the spec gets its own div with correct timing.`);

  return parts.join("\n");
}

/**
 * Get a summary of what rules were loaded (for logging).
 */
function getPromptSummary(specData) {
  const advancedRules = getAdvancedRules(specData);
  const datavizRules = getDatavizRules(specData);
  const baseCount = 3; // base + shapes + animations
  return {
    totalModules: baseCount + advancedRules.length + datavizRules.length,
    advancedModules: advancedRules.length + datavizRules.length,
    advancedTypes: advancedRules.concat(datavizRules).map(r => {
      // Extract first line as type name
      const firstLine = r.split("\n")[0];
      return firstLine.replace(/[^A-Za-z& ]/g, "").trim();
    })
  };
}

module.exports = { assemblePrompt, getPromptSummary };
