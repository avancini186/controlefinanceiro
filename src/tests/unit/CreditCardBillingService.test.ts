import { describe, it, expect } from 'vitest';
import { CreditCardBillingService } from '../../services/financial/CreditCardBillingService';

describe('CreditCardBillingService', () => {
  const diaFechamento = 3;
  const diaVencimento = 10;

  it('assigns purchase on or before closing date to current month competencia', () => {
    // 02/07 -> 2026-07 (antes do fechamento)
    const result1 = CreditCardBillingService.calculateBillingPeriod('2026-07-02', diaFechamento, diaVencimento);
    expect(result1.faturaCompetencia).toBe('2026-07');
    expect(result1.faturaAno).toBe(2026);
    expect(result1.faturaMes).toBe(7);
    expect(result1.faturaVencimento).toBe('2026-07-10');

    // 03/07 -> 2026-07 (exatamente no dia do fechamento)
    const result2 = CreditCardBillingService.calculateBillingPeriod('2026-07-03', diaFechamento, diaVencimento);
    expect(result2.faturaCompetencia).toBe('2026-07');
    expect(result2.faturaVencimento).toBe('2026-07-10');
  });

  it('assigns purchase after closing date to next month competencia', () => {
    // 04/07 -> 2026-08 (após o fechamento)
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

  it('handles cards with different closing and due dates correctly', () => {
    // Cartão A: Fecha 3, Vence 10 (Compra 04/07 -> Fatura 2026-08-10)
    const cardA = CreditCardBillingService.calculateBillingPeriod('2026-07-04', 3, 10);
    expect(cardA.faturaCompetencia).toBe('2026-08');
    expect(cardA.faturaVencimento).toBe('2026-08-10');

    // Cartão B: Fecha 20, Vence 5 (Compra 04/07 -> Fatura 2026-07-05)
    const cardB = CreditCardBillingService.calculateBillingPeriod('2026-07-04', 20, 5);
    expect(cardB.faturaCompetencia).toBe('2026-07');
    expect(cardB.faturaVencimento).toBe('2026-08-05');
  });

  it('generateInstallmentSchedule creates full schedule with exact rounding', () => {
    const schedule = CreditCardBillingService.generateInstallmentSchedule(
      '2026-07-15',
      4,
      1000,
      3,
      10
    );

    expect(schedule).toHaveLength(4);
    // 1000 / 4 = 250.00 each
    expect(schedule[0].valor).toBe(250.0);
    expect(schedule[0].faturaCompetencia).toBe('2026-08');
    expect(schedule[1].faturaCompetencia).toBe('2026-09');
    expect(schedule[2].faturaCompetencia).toBe('2026-10');
    expect(schedule[3].faturaCompetencia).toBe('2026-11');
  });
});
