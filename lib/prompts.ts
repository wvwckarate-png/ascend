// Formatting rules appended to the AI prompts so math and chemistry come back in a form the app can typeset.
// (Rendered by lib/parseKaTeX + KaTeXRenderer / RichText / GuideHtml.)
export const MATH_FORMAT_RULES =
  ' MATH & CHEMISTRY FORMATTING — Write every mathematical expression, equation, variable and unit that needs special symbols in LaTeX between single dollar signs, e.g. $x^2 + 3x = 7$ (use $$…$$ for a standalone display equation). Write chemical formulas and reactions with \\ce{}, e.g. $\\ce{2H2 + O2 -> 2H2O}$. Use plain text for ordinary words and never use dollar signs for money.';

export const MATH_FORMAT_RULES_JSON = MATH_FORMAT_RULES + ' Because your answer is JSON, escape every backslash inside strings (write \\\\frac, not \\frac).';

// The product rule behind every generated resource: Ascend is an A-hunting tool for ONE class, built only from what the
// student uploaded. (Flagging of possible mistakes is added per resource type by the checking step.)
export const CLASS_RULES =
  ' CLASS-FIRST RULES — This tool exists to help the student earn an A in THIS specific class, so: (1) Stay inside the class: cover everything the uploaded materials teach — be comprehensive and leave nothing out — and add nothing they do not contain; if the class skips a topic, skip it too. (2) Old exams, quizzes, practice tests and graded handouts among the materials are the strongest evidence of what gets tested and how: mirror their question style, format, difficulty and wording, and weight topics the way they do — but never use them as a reason to leave other material out. (3) The professor\'s own materials (slides, lecture notes and recordings, handouts, old exams) are authoritative; outside sources such as YouTube videos or textbook excerpts are secondary. When sources disagree, follow the professor\'s version. (4) If the professor\'s material seems to contain a mistake or contradiction, still use the class\'s version — that is what will be tested.';
