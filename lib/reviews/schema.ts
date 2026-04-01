export const reviewJsonSchema = {
  name: "review_generation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      reviewDraft: {
        type: "string",
        description: "Natural first-person review draft between 70 and 140 words.",
      },
      shortReview: {
        type: "string",
        description: "Short 8-18 word summary version.",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      flags: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    required: ["reviewDraft", "shortReview", "confidence", "flags"],
  },
} as const;
