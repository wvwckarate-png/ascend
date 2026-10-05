// Formatting rules appended to the AI prompts so math and chemistry come back in a form the app can typeset.
// (Rendered by lib/parseKaTeX + KaTeXRenderer / RichText / GuideHtml.)
export const MATH_FORMAT_RULES =
  ' MATH & CHEMISTRY FORMATTING — Write every mathematical expression, equation, variable and unit that needs special symbols in LaTeX between single dollar signs, e.g. $x^2 + 3x = 7$ (use $$…$$ for a standalone display equation). Write chemical formulas and reactions with \\ce{}, e.g. $\\ce{2H2 + O2 -> 2H2O}$. Use plain text for ordinary words and never use dollar signs for money.';

export const MATH_FORMAT_RULES_JSON = MATH_FORMAT_RULES + ' Because your answer is JSON, escape every backslash inside strings (write \\\\frac, not \\frac).';
