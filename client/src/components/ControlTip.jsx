import { cloneElement, isValidElement } from 'react';

/**
 * Tooltip nativo (atributo title) para botones, inputs y selectores.
 * Si el hijo ya tiene title, no lo sobrescribe.
 */
export default function ControlTip({ title, children }) {
  if (!title) return children;

  if (isValidElement(children)) {
    return cloneElement(children, {
      title: children.props.title ?? title,
      'aria-label': children.props['aria-label'] ?? title,
    });
  }

  return (
    <span title={title} style={{ display: 'inline-flex' }}>
      {children}
    </span>
  );
}
