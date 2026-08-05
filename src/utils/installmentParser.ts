/**
 * Utility to parse installment numbers and total installments from transaction descriptions.
 * E.g. "Raia262 - Parcela 1/3" -> { numeroParcela: 1, totalParcelas: 3, baseDescription: "Raia262" }
 * E.g. "Posthaus *56746194 - Parcela 1/10" -> { numeroParcela: 1, totalParcelas: 10, baseDescription: "Posthaus *56746194" }
 */
export interface ParsedInstallmentInfo {
  numeroParcela?: number;
  totalParcelas?: number;
  baseDescription: string;
}

/**
 * Iteratively extracts the clean base description of a purchase, stripping all installment
 * suffix patterns (e.g. "- Parcela 2/6", "(3/12)", "1 de 10", etc.) including chained/corrupted tags.
 * E.g. "Hering - Parcela 2/6" -> "Hering"
 * E.g. "Amazon (3/12)" -> "Amazon"
 * E.g. "Magazine Luiza - Parcela 5/10" -> "Magazine Luiza"
 * E.g. "Hering - Parcela 2/6 - Parcela 1/6" -> "Hering"
 * E.g. "Hering - Parcela 1/6 (1/6)" -> "Hering"
 */
export function extractBaseDescription(description: string): string {
  if (!description) {
    return '';
  }

  let current = description.trim();
  let previous = '';

  const stripPatterns = [
    /(?:[\s-(]*)(?:parcela|parc\.?)\s*\d{1,2}\s*[/|de]\s*\d{1,2}\s*\)?/gi,
    /(?:\s+|-|\()\s*\d{1,2}\s*[/]\s*\d{1,2}\s*\)?$/gi,
    /(?:\s+|-|\()\s*\d{1,2}\s+de\s+\d{1,2}\s*\)?$/gi,
    /\s*\(\d{1,2}\/\d{1,2}\)$/gi,
  ];

  while (current !== previous) {
    previous = current;
    for (const pattern of stripPatterns) {
      current = current.replace(pattern, '').trim();
    }
  }

  return current || description.trim();
}

/**
 * Builds the canonical installment description starting strictly from the extracted base description.
 * E.g. buildInstallmentDescription("Hering - Parcela 2/6", 1, 6) -> "Hering - Parcela 1/6"
 * E.g. buildInstallmentDescription("Amazon (3/12)", 1, 12) -> "Amazon - Parcela 1/12"
 */
export function buildInstallmentDescription(
  baseDescription: string,
  currentInstallment: number,
  totalInstallments: number
): string {
  const cleanBase = extractBaseDescription(baseDescription);
  if (!cleanBase) {
    return '';
  }

  if (totalInstallments <= 1) {
    return cleanBase;
  }

  return `${cleanBase} - Parcela ${currentInstallment}/${totalInstallments}`;
}

export function parseInstallmentFromDescription(description: string): ParsedInstallmentInfo {
  if (!description) {
    return { baseDescription: '' };
  }

  const cleanBase = extractBaseDescription(description);

  const patterns = [
    /(?:[\s-(]*)(?:parcela|parc\.?)\s*(\d{1,2})\s*[/|de]\s*(\d{1,2})\s*\)?/i,
    /(?:\s+|-|\()\s*(\d{1,2})\s*[/]\s*(\d{1,2})(?:\s*|\))$/i,
    /(?:\s+|-|\()\s*(\d{1,2})\s+de\s+(\d{1,2})(?:\s*|\))$/i,
  ];

  for (const regex of patterns) {
    const match = description.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      const tot = parseInt(match[2], 10);

      if (num >= 1 && tot >= 2 && num <= tot && tot <= 99) {
        return {
          numeroParcela: num,
          totalParcelas: tot,
          baseDescription: cleanBase,
        };
      }
    }
  }

  return { baseDescription: cleanBase };
}
