/** Campo `activo` desde MySQL (1, '1', 0, '0'). */
export function registroActivo(activo) {
  return activo === 1 || activo === '1';
}

export function registroInactivo(activo) {
  return activo === 0 || activo === '0' || activo === false;
}

export function registroActivoONulo(activo) {
  return activo === null || activo === undefined || registroActivo(activo);
}
