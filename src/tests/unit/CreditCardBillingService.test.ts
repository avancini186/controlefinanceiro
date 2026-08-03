import { describe, it, expect } from 'vitest';
import { CreditCardBillingService } from '../../services/financial/CreditCardBillingService';

describe('CreditCardBillingService', () => {
  const diaFechamento = 3;
  const diaVencimento = 10;

  it('assigns purchase on or before closing date to current month competencia', () => {
    // 02/07 -> 2026-07
    const result1 = CreditCardBillingService.calculateBillingPeriod('2026-07-02', diaFechamento, diaVencimento);
    expect(result1.faturaCompetencia).toBe('2026-07');
    expect(result1.faturaAno).toBe(2026);
    expect(result1.faturaMes).toBe(7);
    expect(result1.faturaVencimento).toBe('2026-07-10');

    // 03/07 -> 2026-07
    const result2 = CreditCardBillingService.calculateBillingPeriod('2026-07-03', diaFechamento, diaVencimento);
    expect(result2.faturaCompetencia).toBe('2026-07');
    expect(result2.faturaVencimento).toBe('2026-07-10');
  });

  it('assigns purchase after closing date to next month competencia', () => {
    // 04/07 -> 2026-08
    const result1 = CreditCardBillingService.calculateBillingPeriod('2026-07-04', diaFechamento, diaVencimento);
    expect(result1.faturaCompetencia).toBe('2026-08');
    expect(result1.faturaAno).toBe(2026);
    expect(result1.faturaMes).toBe(8);
    expect(result1.faturaVencimento).toBe('2026-08-10');

    // 15/07 -> 2026-08
    const result2 = CreditCardBillingService.calculateBillingPeriod('2026-07-15', diaFechamento, diaVencimento);
    expect(result2.faturaCompetencia).toBe('2026-08');

    // 31/07 -> 2026-08
    const result3 = CreditCardBillingService.calculateBillingPeriod('2026-07-31', diaFechamento, diaVencimento);
    expect(result3.faturaCompetencia).toBe('2026-08');
  });

  it('handles year rollover at end of December correctly', () => {
    // 15/12 -> 2027-01
    const result = CreditCardBillingService.calculateBillingPeriod('2026-12-15', diaFechamento, diaVencimento);
    expect(result.faturaCompetencia).toBe('2027-01');
    expect(result.faturaAno).toBe(2027);
    expect(result.faturaMes).toBe(1);
    expect(result.faturaVencimento).toBe('2027-01-10');
  });

  it('calculates 12x installment competencias sequentially from purchase date', () => {
    // Purchase 15/07 (Fecha 3, Vence 10) -> Parcela 1 = 2026-08
    const p1 = CreditCardBillingService.calculateInstallmentBillingPeriod('2026-07-15', 1, diaFechamento, diaVencimento);
    expect(p1.faturaCompetencia).toBe('2026-08');

    const p2 = CreditCardBillingService.calculateInstallmentBillingPeriod('2026-07-15', 2, diaFechamento, diaVencimento);
    expect(p2.faturaCompetencia).toBe('2026-09');

    const p3 = CreditCardBillingService.calculateInstallmentBillingPeriod('2026-07-15', 3, diaFechamento, diaVencimento);
    expect(p3.faturaCompetencia).toBe('2026-10');

    const p12 = CreditCardBillingService.calculateInstallmentBillingPeriod('2026-07-15', 12, diaFechamento, diaVencimento);
    expect(p12.faturaCompetencia).toBe('2027-07');
  });

  it('handles cards where diaVencimento is before or equal to diaFechamento (e.g. Closes 25th, Vences 5th)', () => {
    // Fecha 25, Vence 5
    // Purchase 10/07 (10 <= 25) -> Comp 2026-07 -> Vencimento 05/08/2026
    const res = CreditCardBillingService.calculateBillingPeriod('2026-07-10', 25, 5);
    expect(res.faturaCompetencia).toBe('2026-07');
    expect(res.faturaVencimento).toBe('2026-08-05');
  });
});
