import { Children, useCallback, useMemo, useState } from 'react';
import Select from 'react-select';
import { resolveAppSelectMenuPortal } from '../lib/appSelectMenuPortal';

function childrenOptionsKey(children) {
  return Children.toArray(children)
    .filter((child) => child?.type === 'option')
    .map((child) => {
      const v = child.props.value ?? child.props.children;
      return `${v}|${child.props.disabled ? 1 : 0}|${child.props.hidden ? 1 : 0}|${child.props.children}`;
    })
    .join(';');
}

const parseChildrenOptions = (children) => {
  let placeholderFromOption = '';
  const options = Children.toArray(children)
    .filter((child) => child?.type === 'option')
    .reduce((acc, child) => {
      const rawValue = child.props.value ?? child.props.children;
      const value = rawValue == null ? '' : String(rawValue);
      const label = child.props.children;
      const isPlaceholderCandidate =
        value === '' && (Boolean(child.props.disabled) || Boolean(child.props.hidden));

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

/**
 * Select nativo en modales: sin portal ni react-select → hover estable, sin parpadeo.
 */
function MinimalNativeSelect({
  value,
  onChange,
  children,
  className = '',
  disabled,
  placeholder,
  options: optionsProp,
}) {
  const childrenKey = childrenOptionsKey(children);
  const { options: fromChildren, placeholderFromOption } = useMemo(
    () => parseChildrenOptions(children),
    [childrenKey]
  );
  const resolvedOptions = optionsProp?.length ? optionsProp : fromChildren;
  const resolvedPlaceholder = placeholder || placeholderFromOption;
  const selected = value == null ? '' : String(value);

  return (
    <select
      className={`minimal-select minimal-native-select ${selected ? 'is-selected' : ''} ${className}`.trim()}
      value={selected}
      disabled={disabled}
      onChange={onChange}
    >
      {resolvedPlaceholder ? <option value="">{resolvedPlaceholder}</option> : null}
      {resolvedOptions.map((opt) => (
        <option key={String(opt.value)} value={opt.value} disabled={opt.isDisabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

const selectClassNames = {
  control: ({ isFocused, isDisabled }) =>
    [
      'app-select__control',
      isFocused ? 'app-select__control--is-focused' : '',
      isDisabled ? 'app-select__control--is-disabled' : '',
    ]
      .filter(Boolean)
      .join(' '),
  valueContainer: () => 'app-select__value-container',
  singleValue: () => 'app-select__single-value',
  placeholder: () => 'app-select__placeholder',
  input: () => 'app-select__input',
  indicatorsContainer: () => 'app-select__indicators-container',
  dropdownIndicator: () => 'app-select__dropdown-indicator',
  menu: () => 'app-select__menu',
  menuList: () => 'app-select__menu-list',
  option: ({ isFocused, isSelected, isDisabled }) =>
    [
      'app-select__option',
      isFocused ? 'app-select__option--is-focused' : '',
      isSelected ? 'app-select__option--is-selected' : '',
      isDisabled ? 'app-select__option--is-disabled' : '',
    ]
      .filter(Boolean)
      .join(' '),
};

const FILTER_MENU_STYLES = {
  menu: (base) => ({
    ...base,
    width: 'max-content',
    minWidth: '100%',
    maxWidth: 'min(92vw, 18rem)',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base) => ({
    ...base,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  }),
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
  variant = 'default',
  menuPosition,
  menuPlacement: menuPlacementProp = 'bottom',
  title,
  ...rest
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [preferNative, setPreferNative] = useState(() => variant === 'modal');

  const setAnchorRef = useCallback((node) => {
    if (node?.closest?.('.modal')) {
      setPreferNative(true);
      setAnchorEl(node);
      return;
    }
    if (node) {
      setAnchorEl(node);
    }
  }, []);

  const useNativeInModal = preferNative || variant === 'modal';

  const childrenKey = childrenOptionsKey(children);
  const { options: optionsFromChildren, placeholderFromOption } = useMemo(
    () => parseChildrenOptions(children),
    [childrenKey]
  );

  const resolvedOptions = useMemo(() => {
    if (options?.length) return options;
    return optionsFromChildren;
  }, [options, optionsFromChildren]);

  const menuHost = useMemo(
    () => resolveAppSelectMenuPortal(anchorEl, menuPortalTarget, menuPosition),
    [anchorEl, menuPortalTarget, menuPosition]
  );

  const selectedOption = useMemo(
    () => resolvedOptions.find((option) => String(option.value) === String(value)) || null,
    [resolvedOptions, value]
  );

  const resolvedPlaceholder = placeholder || placeholderFromOption;

  const handleChange = (option) => {
    const nextValue = option?.value ?? '';
    if (onChange) {
      onChange({ target: { value: nextValue } });
    }
  };

  if (useNativeInModal) {
    return (
      <div className="app-select-wrap" title={title}>
        <MinimalNativeSelect
          value={value}
          onChange={onChange}
          className={className}
          disabled={disabled}
          placeholder={resolvedPlaceholder}
          options={resolvedOptions}
        />
      </div>
    );
  }

  return (
    <div ref={setAnchorRef} className="app-select-wrap" title={title}>
      <Select
        unstyled
        className={className}
        classNamePrefix="app-select"
        classNames={selectClassNames}
        isDisabled={disabled}
        value={selectedOption}
        onChange={handleChange}
        options={resolvedOptions}
        placeholder={resolvedPlaceholder}
        isClearable={Boolean(isClearable)}
        isSearchable={isSearchable}
        menuPortalTarget={menuHost.portal}
        menuPosition={menuHost.position}
        menuPlacement={menuPlacementProp || menuHost.placement}
        menuShouldScrollIntoView={false}
        captureMenuScroll={false}
        closeMenuOnScroll={false}
        blurInputOnSelect
        {...rest}
        styles={
          variant === 'contratos' || variant === 'filter'
            ? FILTER_MENU_STYLES
            : rest.styles
        }
      />
    </div>
  );
}

export default AppSelect;
