export interface BillingPeriodInfo {
  faturaCompetencia: string; // 'YYYY-MM'
  faturaAno: number;         // e.g. 2026
  faturaMes: number;         // e.g. 8
  faturaVencimento: string;  // 'YYYY-MM-DD'
}

export class CreditCardBillingService {
  /**
   * Calculates the invoice billing period and due date for a transaction date.
   *
   * Rules:
   * 1. Extract year, month (1-12), and day from purchaseDate (YYYY-MM-DD).
   * 2. If day <= diaFechamento:
   *      competencia = current month (YYYY-MM)
   *    Else:
   *      competencia = next month (YYYY-MM)
   * 3. Vencimento:
   *    Normally in the competencia month, on diaVencimento.
   *    If diaVencimento <= diaFechamento (e.g. closes on 25th, due on 5th of next month):
   *      vencimento month is the month after competencia.
   *    Else:
   *      vencimento month is the competencia month.
   */
  static calculateBillingPeriod(
    purchaseDate: string,
    diaFechamento: number,
    diaVencimento: number
  ): BillingPeriodInfo {
    const [yStr, mStr, dStr] = purchaseDate.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10); // 1-12
    const day = parseInt(dStr, 10);

    let compYear = year;
    let compMonth = month;

    if (day > diaFechamento) {
      compMonth += 1;
      if (compMonth > 12) {
        compMonth = 1;
        compYear += 1;
      }
    }

    const compMonthPadded = String(compMonth).padStart(2, '0');
    const faturaCompetencia = `${compYear}-${compMonthPadded}`;

    let vencYear = compYear;
    let vencMonth = compMonth;

    if (diaVencimento <= diaFechamento) {
      vencMonth += 1;
      if (vencMonth > 12) {
        vencMonth = 1;
        vencYear += 1;
      }
    }

    const daysInVencMonth = new Date(vencYear, vencMonth, 0).getDate();
    const actualVencDay = Math.min(diaVencimento, daysInVencMonth);
    const vencMonthPadded = String(vencMonth).padStart(2, '0');
    const vencDayPadded = String(actualVencDay).padStart(2, '0');
    const faturaVencimento = `${vencYear}-${vencMonthPadded}-${vencDayPadded}`;

    return {
      faturaCompetencia,
      faturaAno: compYear,
      faturaMes: compMonth,
      faturaVencimento,
    };
  }

  /**
   * Calculates the billing period for installment N (1-indexed).
   * Parcela 1 is calculated based on purchaseDate.
   * Parcela N is offset by (N - 1) months from Parcela 1's competencia.
   */
  static calculateInstallmentBillingPeriod(
    purchaseDate: string,
    installmentNumber: number,
    diaFechamento: number,
    diaVencimento: number
  ): BillingPeriodInfo {
    const basePeriod = this.calculateBillingPeriod(purchaseDate, diaFechamento, diaVencimento);
    if (installmentNumber <= 1) return basePeriod;

    let compYear = basePeriod.faturaAno;
    let compMonth = basePeriod.faturaMes + (installmentNumber - 1);

    while (compMonth > 12) {
      compMonth -= 12;
      compYear += 1;
    }

    const compMonthPadded = String(compMonth).padStart(2, '0');
    const targetDate = `${compYear}-${compMonthPadded}-01`;

    return this.calculateBillingPeriod(targetDate, diaFechamento, diaVencimento);
  }
}
