import { Request, Response, NextFunction } from "express";

export function isValidCnpjFormat(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // todos dígitos iguais

  const calcCheckDigit = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((acc, digit, i) => acc + parseInt(digit, 10) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digit1 = calcCheckDigit(digits.slice(0, 12), weights1);
  const digit2 = calcCheckDigit(digits.slice(0, 12) + digit1, weights2);

  return digits.slice(12) === `${digit1}${digit2}`;
}

export function validateCnpjBody(req: Request, res: Response, next: NextFunction) {
  const { cnpj } = req.body;
  if (!cnpj || typeof cnpj !== "string") {
    return res.status(400).json({ error: "Campo 'cnpj' é obrigatório." });
  }
  if (!isValidCnpjFormat(cnpj)) {
    return res.status(400).json({ error: "CNPJ inválido. Verifique o formato e os dígitos verificadores." });
  }
  next();
}
