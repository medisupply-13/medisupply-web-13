/**
 * Utilidad para validar contraseñas según la política de seguridad:
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula (A-Z)
 * - Al menos una minúscula (a-z)
 * - Al menos un número (0-9)
 * - Al menos un carácter especial: !@#$%^&*()_+-=[]{}|;:,.<>?
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valida una contraseña y devuelve los errores específicos si no cumple los requisitos
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length === 0) {
    errors.push('passwordRequired');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('passwordMinLength');
  }

  const hasUpperCase = /[A-Z]/.test(password);
  if (!hasUpperCase) {
    errors.push('passwordUppercase');
  }

  const hasLowerCase = /[a-z]/.test(password);
  if (!hasLowerCase) {
    errors.push('passwordLowercase');
  }

  const hasNumber = /[0-9]/.test(password);
  if (!hasNumber) {
    errors.push('passwordNumber');
  }

  // Caracteres especiales permitidos: !@#$%^&*()_+-=[]{}|;:,.<>?
  // El - debe ir al final de la clase para evitar necesidad de escape
  const hasSpecialChar = /[!@#$%^&*()_+=\[\]{}|;:,.<>?\-]/.test(password);
  if (!hasSpecialChar) {
    errors.push('passwordSpecialChar');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

