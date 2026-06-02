import { Children, useMemo } from 'react';
import Select from 'react-select';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { getThemeAccentFromDocument } from '../lib/appPreferences';

function makeAppSelectStyles({ primary, primaryRgb }) {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: '38px',
      borderColor: state.isFocused ? primary : '#cfd5dd',
      boxShadow: state.isFocused ? `0 0 0 0.2rem rgba(${primaryRgb},.18)` : 'none',
      '&:hover': { borderColor: primary },
    }),
    valueContainer: (base) => ({ ...base, padding: '2px 10px' }),
    indicatorsContainer: (base) => ({ ...base, backgroundColor: primary, width: '1.6rem' }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#ffffff',
      padding: 0,
      '&:hover': { color: '#ffffff' },
    }),
    menu: (base) => ({
      ...base,
      marginTop: 2,
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused
        ? primary
        : state.isSelected
          ? '#ecfdf5'
          : '#ffffff',
      color: state.isFocused ? '#ffffff' : state.isSelected ? primary : '#111827',
      cursor: 'pointer',
      transition: 'none',
      ':active': {
        backgroundColor: primary,
        color: '#ffffff',
      },
    }),
  };
}

const parseChildrenOptions = (children) => {
  let placeholderFromOption = '';
  const options = Children.toArray(children)
    .filter((child) => child?.type === 'option')
    .reduce((acc, child) => {
      const rawValue = child.props.value ?? child.props.children;
      const value = rawValue == null ? '' : String(rawValue);
      const label = child.props.children;
      const isPlaceholderCandidate = value === '' && (Boolean(child.props.disabled) || Boolean(child.props.hidden));

      if (isPlaceholderCandidate) {
        placeholderFromOption = String(label || '');
        return acc;
      }

      acc.push({
        value: rawValue,
        label,
        isDisabled: Boolean(child.props.disabled),
      });
      return acc;
    }, []);

  return { options, placeholderFromOption };
};

function AppSelect({
  value,
  onChange,
  children,
  className,
  disabled,
  placeholder,
  isClearable,
  options,
  menuPortalTarget,
  isSearchable = false,
  /** Reservado para compatibilidad; el color sigue el tema activo */
  variant = 'default',
  menuPosition = 'fixed',
  ...rest
}) {
  const { preferences } = useAppPreferences();
  const appSelectStyles = useMemo(() => {
    const accent = getThemeAccentFromDocument();
    return makeAppSelectStyles(accent);
  }, [preferences.themeId, preferences.accentColor]);
  const resolvedPortal =
    menuPortalTarget !== undefined
      ? menuPortalTarget
      : typeof document !== 'undefined'
        ? document.body
        : null;
  const { options: optionsFromChildren, placeholderFromOption } = parseChildrenOptions(children);
  const resolvedOptions = options && options.length ? options : optionsFromChildren;
  const selectedOption = resolvedOptions.find((option) => String(option.value) === String(value)) || null;
  const resolvedPlaceholder = placeholder || placeholderFromOption;

  const handleChange = (option) => {
    const nextValue = option?.value ?? '';
    if (onChange) {
      onChange({ target: { value: nextValue } });
    }
  };

  return (
    <Select
      className={className}
      classNamePrefix='app-select'
      isDisabled={disabled}
      value={selectedOption}
      onChange={handleChange}
      options={resolvedOptions}
      placeholder={resolvedPlaceholder}
      isClearable={Boolean(isClearable)}
      isSearchable={isSearchable}
      styles={appSelectStyles}
      menuPortalTarget={resolvedPortal}
      menuPosition={menuPosition}
      menuShouldScrollIntoView={false}
      {...rest}
    />
  );
}

export default AppSelect;
