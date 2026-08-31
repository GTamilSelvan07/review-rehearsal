// Plain JSON Schemas enforced via Gemini's responseJsonSchema — the model
// cannot return an out-of-range score, an invalid recommendation code, or a
// malformed form. Kept permissive on prose fields, strict on enums/ranges.

import { ACM_CRITERIA, ADR_FLAGS, ADR_REVIEWABILITY, CONTRIBUTION_TYPES, DESK_REJECT_CHECKS } from "./chi2027";
import { ALL_KEYWORD_NAMES, KEYWORD_RULES, PCS_CONTRIBUTIONS, PCS_DOMAINS, PCS_METHODS, PCS_USERS } from "./keywords";

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const score15 = { type: "integer", minimum: 1, maximum: 5 } as const;

const CRITERIA_NAMES = ACM_CRITERIA.map((c) => c.name);

const names = (defs: { name: string }[]) => defs.map((d) => d.name);

const PCS_SCHEMA = {
  type: "object",
  properties: {
    domain: { type: "array", items: { type: "string", enum: names(PCS_DOMAINS) }, minItems: KEYWORD_RULES.domain.min, maxItems: KEYWORD_RULES.domain.max },
    method: { type: "array", items: { type: "string", enum: names(PCS_METHODS) }, minItems: KEYWORD_RULES.method.min, maxItems: KEYWORD_RULES.method.max },
    users: { type: "array", items: { type: "string", enum: names(PCS_USERS) }, maxItems: KEYWORD_RULES.users.max },
    contribution: { type: "string", enum: names(PCS_CONTRIBUTIONS) },
  },
  required: ["domain", "method", "users", "contribution"],
};

export const PAPER_SCHEMA = {
  type: "object",
  properties: {
    title: str,
    abstract: str,
    subcommunity: str,
    pcs: PCS_SCHEMA,
    pages: { type: "integer" },
    words: { type: "integer" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { title: str, page: { type: ["integer", "null"] } },
        required: ["title"],
      },
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: { claim: str, evidence: str, section: str },
        required: ["claim", "evidence", "section"],
      },
    },
    methods: strArr,
    statedLimitations: strArr,
    references: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: str,
          raw: str,
          title: str,
          authors: strArr,
          year: { type: ["integer", "null"] },
          venue: str,
          doi: { type: ["string", "null"] },
        },
        required: ["key", "title", "authors", "year", "venue"],
      },
    },
    fullText: str,
  },
  required: ["title", "abstract", "subcommunity", "pcs", "pages", "words", "sections", "claims", "methods", "statedLimitations", "references", "fullText"],
};

/** The checks the model judges (RV-6 is computed in code from the reference audit). */
export const MODEL_JUDGED_CHECK_IDS = DESK_REJECT_CHECKS.filter((c) => c.basis !== "deterministic").map((c) => c.id);

export const DESK_REJECT_SCHEMA = {
  type: "object",
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: MODEL_JUDGED_CHECK_IDS },
          status: { type: "string", enum: ["pass", "flag", "unverified"] },
          evidence: str,
          reasoning: str,
        },
        required: ["id", "status", "evidence", "reasoning"],
      },
    },
  },
  required: ["checks"],
};

const TRI_STATUS = { type: "string", enum: ["pass", "borderline", "flag"] } as const;

export const ADR_SCHEMA = {
  type: "object",
  properties: {
    contributionTypes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...CONTRIBUTION_TYPES] },
          premise: str,
          validationExpectation: str,
        },
        required: ["type", "premise", "validationExpectation"],
      },
    },
    reviewability: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: ADR_REVIEWABILITY.map((r) => r.name) },
          status: TRI_STATUS,
          rationale: str,
          evidence: str,
        },
        required: ["name", "status", "rationale", "evidence"],
      },
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: CRITERIA_NAMES },
          score: score15,
          note: str,
          evidence: str,
        },
        required: ["name", "score", "note", "evidence"],
      },
    },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: [...ADR_FLAGS] },
          status: TRI_STATUS,
          rationale: str,
          evidence: str,
        },
        required: ["name", "status", "rationale", "evidence"],
      },
    },
    decision: { type: "string", enum: ["advance", "adr"] },
    acNote: str,
  },
  required: ["contributionTypes", "reviewability", "criteria", "flags", "decision", "acNote"],
};

export const PERSONAS_SCHEMA = {
  type: "object",
  properties: {
    personas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["R1", "R2", "R3", "R4", "R5"] },
          archetype: str,
          background: str,
          expertise: { type: "integer", minimum: 1, maximum: 4 },
          focus: strArr,
          style: str,
          biases: str,
          expertiseTags: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tag: { type: "string", enum: ALL_KEYWORD_NAMES },
                level: { type: "integer", minimum: 1, maximum: 4 },
              },
              required: ["tag", "level"],
            },
            minItems: 5,
            maxItems: 12,
          },
        },
        required: ["id", "archetype", "background", "expertise", "focus", "style", "biases", "expertiseTags"],
      },
    },
  },
  required: ["personas"],
};

const AUDIT_ITEMS = {
  type: "array",
  items: {
    type: "object",
    properties: {
      section: str,
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            issue: str,
            severity: { type: "string", enum: ["major", "moderate", "minor"] },
            quote: str,
            anchor: str,
          },
          required: ["issue", "severity", "quote", "anchor"],
        },
      },
    },
    required: ["section", "findings"],
  },
} as const;

export const SCRUTINY_SCHEMA = {
  type: "object",
  properties: { audit: AUDIT_ITEMS },
  required: ["audit"],
};

export function reviewSchema(adversarial: boolean) {
  const properties: Record<string, unknown> = {
    personaId: str,
    archetype: str,
    expertise: { type: "integer", minimum: 1, maximum: 4 },
    summary: str,
    contribution: str,
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: CRITERIA_NAMES },
          score: score15,
          assessment: str,
        },
        required: ["name", "score", "assessment"],
      },
    },
    majorIssues: {
      type: "array",
      items: {
        type: "object",
        properties: { title: str, argument: str, quote: str, anchor: str },
        required: ["title", "argument", "quote", "anchor"],
      },
    },
    minorIssues: strArr,
    questions: strArr,
    revisions: strArr,
    recommendation: { type: "string", enum: ["A", "ARR", "RR", "RRX", "X"] },
    committeeComments: str,
  };
  const required = [
    "personaId", "archetype", "expertise", "summary", "contribution", "criteria",
    "majorIssues", "minorIssues", "questions", "revisions", "recommendation", "committeeComments",
  ];
  if (adversarial) {
    properties.sectionAudit = AUDIT_ITEMS;
    required.push("sectionAudit");
  }
  return { type: "object", properties, required };
}

export const META_SCHEMA = {
  type: "object",
  properties: {
    discussion: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string", enum: ["1AC", "R1", "R2", "R3", "R4", "R5"] },
          text: str,
        },
        required: ["speaker", "text"],
      },
    },
    metaReview: str,
    decision: { type: "string", enum: ["minor", "major", "reject"] },
    decisionRationale: str,
  },
  required: ["discussion", "metaReview", "decision", "decisionRationale"],
};

export const GUIDE_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: str,
          detail: str,
          group: { type: "string", enum: ["track", "criterion", "polish"] },
          criterion: str,
          effort: { type: "string", enum: ["Quick fix", "A day's work", "New data needed"] },
          anchor: str,
        },
        required: ["title", "detail", "group", "criterion", "effort", "anchor"],
      },
    },
    searchQueries: strArr,
  },
  required: ["actions", "searchQueries"],
};
