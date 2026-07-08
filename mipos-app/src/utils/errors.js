export const translateSupabaseError = (msg) => {
  if (!msg) return 'Ocurrió un error inesperado.';
  
  const lowerMsg = msg.toLowerCase();
  
  if (lowerMsg.includes('invalid login credentials')) return 'Email, usuario o contraseña incorrectos.';
  if (lowerMsg.includes('user already registered')) return 'Este usuario o email ya se encuentra registrado.';
  if (lowerMsg.includes('duplicate key value') || lowerMsg.includes('unique constraint')) return 'Este nombre de usuario o email ya está en uso por otra persona.';
  if (lowerMsg.includes('password should be')) return 'La contraseña es demasiado débil o corta.';
  if (lowerMsg.includes('not found')) return 'No se encontraron resultados.';
  if (lowerMsg.includes('failed to fetch')) return 'Error de conexión. Revisá tu internet.';
  if (lowerMsg.includes('user not found')) return 'Usuario no encontrado.';
  if (lowerMsg.includes('rate limit')) return 'Demasiados intentos. Por favor, esperá unos minutos.';
  
  return msg; // Fallback al mensaje original
};
