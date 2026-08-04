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

export function parseInstallmentFromDescription(description: string): ParsedInstallmentInfo {
  if (!description) {
    return { baseDescription: '' };
  }

  // Regex patterns:
  // 1. " - Parcela 1/3" or " Parcela 01/10" or " (Parcela 2/5)"
  // 2. " 1/3" or " 01/10" at end of string or before parentheses
  // 3. " - 1 de 3" or " 1 de 10"
  const patterns = [
    /(?:[\s-(]*)(?:parcela|parc\.?)\s*(\d{1,2})\s*[/|de]\s*(\d{1,2})\s*\)?/i,
    /(?:\s+|-)(\d{1,2})\s*[/]\s*(\d{1,2})(?:\s*|\))$/i,
    /(?:\s+|-)(\d{1,2})\s+de\s+(\d{1,2})(?:\s*|\))$/i,
  ];

  for (const regex of patterns) {
    const match = description.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      const tot = parseInt(match[2], 10);

      if (num >= 1 && tot >= 2 && num <= tot && tot <= 99) {
        // Remove the matched installment suffix to find the base description
        const baseDescription = description.replace(regex, '').trim();
        return {
          numeroParcela: num,
          totalParcelas: tot,
          baseDescription: baseDescription || description,
        };
      }
    }
  }

  return { baseDescription: description };
}
