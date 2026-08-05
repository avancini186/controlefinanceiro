import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OFXImportService,
  IGNORED_DESCRIPTION_PATTERNS,
  normalizeText,
} from '../../services/financial/OFXImportService';

vi.mock('../../services/DataService');

describe('OFXImportService - Pre-selection Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizeText', () => {
    it('should convert text to lowercase, remove accents, and trim multiple spaces', () => {
      expect(normalizeText('  CRÉDITO   EM   FATURA  ')).toBe('credito em fatura');
      expect(normalizeText('REVERSÃO')).toBe('reversao');
      expect(normalizeText('PAGAMÊNTO   FATURÁ')).toBe('pagamento fatura');
    });
  });

  describe('IGNORED_DESCRIPTION_PATTERNS', () => {
    it('should contain default ignored patterns', () => {
      expect(IGNORED_DESCRIPTION_PATTERNS).toContain('ESTORNO');
      expect(IGNORED_DESCRIPTION_PATTERNS).toContain('PAGAMENTO FATURA');
      expect(IGNORED_DESCRIPTION_PATTERNS).toContain('CRÉDITO FATURA');
      expect(IGNORED_DESCRIPTION_PATTERNS).toContain('AJUSTE');
    });
  });

  describe('shouldPreselectTransaction & getUnselectReason', () => {
    it('Caso 1: should unselect duplicated transactions (isDuplicate == true)', () => {
      const tx = {
        descricao: 'AMAZON BRASIL',
        isDuplicate: true,
      };

      expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(false);
      expect(OFXImportService.getUnselectReason(tx)).toBe('Duplicada');
    });

    it('Caso 2: should unselect invoice payments', () => {
      const examples = [
        'PAGAMENTO FATURA',
        'PAGTO FATURA',
        'PAGAMENTO CARTÃO',
        'PAGAMENTO CARTAO',
        'PAGTO CARTAO',
      ];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(false);
        expect(OFXImportService.getUnselectReason(tx)).toBe('Pagamento de fatura');
      }
    });

    it('Caso 3: should unselect credit card invoice credits', () => {
      const examples = [
        'CRÉDITO',
        'CREDITO FATURA',
        'CRÉDITO EM FATURA',
        'PAGAMENTO RECEBIDO',
      ];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(false);
        expect(OFXImportService.getUnselectReason(tx)).toBe('Crédito da fatura');
      }
    });

    it('Caso 4: should unselect reversals and refunds (estornos)', () => {
      const examples = [
        'ESTORNO',
        'ESTORNO PIX',
        'ESTORNO COMPRA',
        'ESTORNO CARTÃO',
        'REVERSÃO',
        'REVERSAO',
      ];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(false);
        expect(OFXImportService.getUnselectReason(tx)).toBe('Estorno');
      }
    });

    it('Caso 5: should preselect normal purchases', () => {
      const examples = [
        'AMAZON',
        'IFOOD',
        'SUPERMERCADO',
        'POSTO',
        'PADARIA',
        'FARMÁCIA',
      ];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(true);
        expect(OFXImportService.getUnselectReason(tx)).toBeUndefined();
      }
    });

    it('Caso 6: should preselect real revenues', () => {
      const examples = ['SALÁRIO', 'SALARIO', 'RENDIMENTO'];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(true);
        expect(OFXImportService.getUnselectReason(tx)).toBeUndefined();
      }
    });

    it('Caso 7: should preselect sent PIX, TED, DOC', () => {
      const examples = ['PIX ENVIADO', 'TED', 'DOC'];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(true);
        expect(OFXImportService.getUnselectReason(tx)).toBeUndefined();
      }
    });

    it('Caso 8: should preselect received PIX, TED, Transfers', () => {
      const examples = ['PIX RECEBIDO', 'TED RECEBIDA', 'TRANSFERÊNCIA RECEBIDA'];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(true);
        expect(OFXImportService.getUnselectReason(tx)).toBeUndefined();
      }
    });

    it('Regra 5: should unselect adjustments', () => {
      const examples = [
        'AJUSTE',
        'AJUSTE FINANCEIRO',
        'AJUSTE DE LIMITE',
        'AJUSTE CONTÁBIL',
      ];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(false);
        expect(OFXImportService.getUnselectReason(tx)).toBe('Ajuste');
      }
    });

    it('Regra 6: should preselect bank fees (tarifas)', () => {
      const examples = ['TARIFA BANCARIA', 'MANUTENCAO CONTA', 'TARIFA EXTRATO'];

      for (const desc of examples) {
        const tx = { descricao: desc, isDuplicate: false };
        expect(OFXImportService.shouldPreselectTransaction(tx)).toBe(true);
        expect(OFXImportService.getUnselectReason(tx)).toBeUndefined();
      }
    });
  });

  describe('parseOFX integration with preselection', () => {
    it('should parse OFX content and correctly preselect/unselect transactions', () => {
      const sampleOFX = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRN>
      <TRNTYPE>OTHER</TRNTYPE>
      <DTPOSTED>20260801</DTPOSTED>
      <TRNAMT>-150.00</TRNAMT>
      <FITID>001</FITID>
      <NAME>COMPRA AMAZON</NAME>
    </STMTTRN>
    <STMTTRN>
      <TRNTYPE>OTHER</TRNTYPE>
      <DTPOSTED>20260802</DTPOSTED>
      <TRNAMT>-500.00</TRNAMT>
      <FITID>002</FITID>
      <NAME>PAGAMENTO FATURA</NAME>
    </STMTTRN>
    <STMTTRN>
      <TRNTYPE>OTHER</TRNTYPE>
      <DTPOSTED>20260803</DTPOSTED>
      <TRNAMT>100.00</TRNAMT>
      <FITID>003</FITID>
      <NAME>ESTORNO PIX</NAME>
    </STMTTRN>
  </BANKMSGSRSV1>
</OFX>
      `;

      const parsed = OFXImportService.parseOFX(sampleOFX);
      expect(parsed).toHaveLength(3);

      // 1: Compra Amazon -> selected
      expect(parsed[0].descricao).toBe('COMPRA AMAZON');
      expect(parsed[0].selected).toBe(true);
      expect(parsed[0].ignoreReason).toBeUndefined();

      // 2: Pagamento Fatura -> unselected
      expect(parsed[1].descricao).toBe('PAGAMENTO FATURA');
      expect(parsed[1].selected).toBe(false);
      expect(parsed[1].ignoreReason).toBe('Pagamento de fatura');

      // 3: Estorno Pix -> unselected
      expect(parsed[2].descricao).toBe('ESTORNO PIX');
      expect(parsed[2].selected).toBe(false);
      expect(parsed[2].ignoreReason).toBe('Estorno');
    });
  });
});
