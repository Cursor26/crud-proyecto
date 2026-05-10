import { Children, useMemo } from 'react';
import Select from 'react-select';

const BRAND_GREEN = { primary: '#14532d', primaryRgb: '20, 83, 45' };

const ACCENT = {
  default: BRAND_GREEN,
  contratos: BRAND_GREEN,
  modal: BRAND_GREEN,
};

function makeAppSelectStyles(variant) {
  const { primary, primaryRgb } = ACCENT[variant] || ACCENT.default;
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
    menu: (base) => ({ ...base, marginTop: 2, zIndex: 20 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? primary : '#ffffff',
      color: state.isFocused ? '#ffffff' : '#111827',
      cursor: 'pointer',
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
  /** 'default' = navy; 'contratos' | 'modal' = verde de marca / modales (#14532d) */
  variant = 'default',
  ...rest
}) {
  const appSelectStyles = useMemo(() => makeAppSelectStyles(variant), [variant]);
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
      menuPortalTarget={menuPortalTarget}
      {...rest}
    />
  );
}

export default AppSelect;
