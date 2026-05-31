import Swal from 'sweetalert2';

export async function confirmDestructiveAction(confirmBeforeDelete, options = {}) {
  if (confirmBeforeDelete === false) return true;
  const result = await Swal.fire({
    icon: options.icon || 'warning',
    title: options.title || '¿Confirmar acción?',
    text: options.text || '',
    html: options.html,
    showCancelButton: true,
    confirmButtonText: options.confirmText || 'Sí, continuar',
    cancelButtonText: options.cancelText || 'Cancelar',
    confirmButtonColor: options.confirmColor || '#b91c1c',
  });
  return Boolean(result.isConfirmed);
}
