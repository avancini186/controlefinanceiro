import { describe, it, expect } from 'vitest';
import {
  extractBaseDescription,
  buildInstallmentDescription,
  parseInstallmentFromDescription,
} from '../../utils/installmentParser';

describe('installmentParser - Unit Tests', () => {
  describe('extractBaseDescription', () => {
    it('should extract base description from "Hering - Parcela 2/6"', () => {
      expect(extractBaseDescription('Hering - Parcela 2/6')).toBe('Hering');
    });

    it('should extract base description from "Amazon (3/12)"', () => {
      expect(extractBaseDescription('Amazon (3/12)')).toBe('Amazon');
    });

    it('should extract base description from "Magazine Luiza - Parcela 5/10"', () => {
      expect(extractBaseDescription('Magazine Luiza - Parcela 5/10')).toBe('Magazine Luiza');
    });

    it('should clean corrupted/chained installment tags "Hering - Parcela 2/6 - Parcela 1/6"', () => {
      expect(extractBaseDescription('Hering - Parcela 2/6 - Parcela 1/6')).toBe('Hering');
    });

    it('should clean corrupted/chained installment tags "Hering - Parcela 1/6 (1/6)"', () => {
      expect(extractBaseDescription('Hering - Parcela 1/6 (1/6)')).toBe('Hering');
    });

    it('should leave simple single transaction descriptions untouched', () => {
      expect(extractBaseDescription('Supermercado Carrefour')).toBe('Supermercado Carrefour');
      expect(extractBaseDescription('Salario Mensal')).toBe('Salario Mensal');
      expect(extractBaseDescription('Transferencia para Poupança')).toBe('Transferencia para Poupança');
    });
  });

  describe('buildInstallmentDescription', () => {
    it('should build description for "Hering - Parcela 2/6" when editing to installment 1 of 6', () => {
      expect(buildInstallmentDescription('Hering - Parcela 2/6', 1, 6)).toBe('Hering - Parcela 1/6');
    });

    it('should build description for "Amazon (3/12)" when editing to installment 1 of 12', () => {
      expect(buildInstallmentDescription('Amazon (3/12)', 1, 12)).toBe('Amazon - Parcela 1/12');
    });

    it('should build description for "Magazine Luiza - Parcela 5/10" when editing to installment 4 of 10', () => {
      expect(buildInstallmentDescription('Magazine Luiza - Parcela 5/10', 4, 10)).toBe('Magazine Luiza - Parcela 4/10');
    });

    it('should return clean base description if totalInstallments <= 1', () => {
      expect(buildInstallmentDescription('Hering - Parcela 2/6', 1, 1)).toBe('Hering');
    });
  });

  describe('parseInstallmentFromDescription', () => {
    it('should return correct installment numbers and clean base description', () => {
      const res = parseInstallmentFromDescription('Hering - Parcela 2/6');
      expect(res.numeroParcela).toBe(2);
      expect(res.totalParcelas).toBe(6);
      expect(res.baseDescription).toBe('Hering');
    });

    it('should parse "Amazon (3/12)" correctly', () => {
      const res = parseInstallmentFromDescription('Amazon (3/12)');
      expect(res.numeroParcela).toBe(3);
      expect(res.totalParcelas).toBe(12);
      expect(res.baseDescription).toBe('Amazon');
    });
  });
});
