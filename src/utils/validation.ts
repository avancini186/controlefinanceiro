export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateRequired = (fields: Record<string, any>): ValidationResult => {
  const errors: Record<string, string> = {};
  
  Object.keys(fields).forEach((key) => {
    const val = fields[key];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      errors[key] = 'Este campo é obrigatório';
    } else if (typeof val === 'number' && isNaN(val)) {
      errors[key] = 'Insira um valor numérico válido';
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateNumberRange = (val: number, min: number, max: number): string | null => {
  if (val < min || val > max) {
    return `O valor deve estar entre ${min} e ${max}`;
  }
  return null;
};
