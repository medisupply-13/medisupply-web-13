/**
 * Utilidad para validar correos electrónicos según el formato especificado:
 * 
 * Formato: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
 * 
 * Desglose:
 * - Parte local (antes de @): letras, números, ., _, %, +, - (uno o más)
 * - @ (arroba obligatoria)
 * - Dominio (después de @): letras, números, ., - (uno o más)
 * - . (punto literal antes del TLD)
 * - TLD: solo letras, mínimo 2 caracteres
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Valida un correo electrónico según el formato especificado
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.trim().length === 0) {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validador para formularios de Angular
 * Devuelve null si el email es válido, o un objeto con el error si es inválido
 */
export function emailValidator(control: { value: string }): { [key: string]: boolean } | null {
  if (!control.value || control.value.trim().length === 0) {
    return null; // Dejamos que el validador 'required' maneje el caso vacío
  }
  return isValidEmail(control.value) ? null : { 'invalidEmail': true };
}

