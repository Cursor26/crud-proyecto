import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import ModuleTitleBar from './ModuleTitleBar';
import {
  BORDER_RADIUS_OPTIONS,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHT_OPTIONS,
  SIDEBAR_WIDTH_OPTIONS,
  THEME_PRESETS,
  UI_SCALE_OPTIONS,
} from '../lib/appPreferences';
import { DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from '../lib/formatAppDate';
import { useAppPreferences } from '../context/AppPreferencesContext';

function OptionCard({ active, title, description, swatch, onClick, previewVars }) {
  return (
    <button
      type="button"
      className={`app-config-option-card${active ? ' is-active' : ''}`}
      onClick={onClick}
      style={previewVars}
    >
      <span className="app-config-option-card__preview" aria-hidden="true">
        <span className="app-config-option-card__preview-topbar" />
        <span className="app-config-option-card__preview-body">
          <span className="app-config-option-card__preview-sidebar" />
          <span className="app-config-option-card__preview-card" />
        </span>
      </span>
      {swatch?.length ? (
        <span className="app-config-option-card__swatch" aria-hidden="true">
          {swatch.map((color) => (
            <span key={color} style={{ backgroundColor: color }} />
          ))}
        </span>
      ) : null}
      <span className="app-config-option-card__title">{title}</span>
      {description ? <span className="app-config-option-card__desc">{description}</span> : null}
    </button>
  );
}

function ConfigSection({ title, description, children }) {
  return (
    <section className="app-config-section card shadow-sm border-0">
      <div className="card-body">
        <h5 className="app-config-section__title">{title}</h5>
        {description ? <p className="app-config-section__desc text-muted small mb-3">{description}</p> : null}
        {children}
      </div>
    </section>
  );
}

function ColorPickRow({ label, value, fallback, onChange, onReset }) {
  return (
    <div className="row g-3 align-items-center mb-3">
      <div className="col-md-4">
        <label className="form-label small fw-semibold">{label}</label>
        <input
          type="color"
          className="form-control form-control-color w-100 app-config-color-input"
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="col-md-8 d-flex flex-wrap gap-2 align-items-center">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onReset}>
          Usar color del tema
        </button>
        <span className="text-muted small">Actual: {value || 'color del tema'}</span>
      </div>
    </div>
  );
}

function AppConfiguracion({ embedded = false }) {
  const { preferences, resolved, syncState, updatePreference, resetPreferences, syncNow } =
    useAppPreferences();
  const [personalizacionOpen, setPersonalizacionOpen] = useState(false);
  const themeList = useMemo(() => Object.values(THEME_PRESETS), []);
  const fontList = useMemo(() => Object.values(FONT_FAMILIES), []);
  const fontSizeList = useMemo(() => Object.values(FONT_SIZES), []);
  const radiusList = useMemo(() => Object.values(BORDER_RADIUS_OPTIONS), []);

  const sidebarWidthList = useMemo(() => Object.values(SIDEBAR_WIDTH_OPTIONS), []);
  const uiScaleList = useMemo(() => Object.values(UI_SCALE_OPTIONS), []);
  const lineHeightList = useMemo(() => Object.values(LINE_HEIGHT_OPTIONS), []);

  const syncLabel =    syncState === 'syncing'
      ? 'Sincronizando…'
      : syncState === 'synced'
        ? 'Sincronizado con el servidor'
        : syncState === 'error'
          ? 'Error al sincronizar (solo local)'
          : 'Guardado local';

  const handleReset = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Restablecer apariencia',
      text: 'Se volverán los valores predeterminados de la aplicación.',
      showCancelButton: true,
      confirmButtonText: 'Restablecer',
      cancelButtonText: 'Cancelar',
    });
    if (result.isConfirmed) {
      resetPreferences();
      await Swal.fire('Listo', 'Preferencias restablecidas.', 'success');
    }
  };

  const actionBar = (
    <>
      <span className="badge text-bg-light border me-2 align-self-center">{syncLabel}</span>
      <button type="button" className="btn btn-outline-primary btn-sm me-2" onClick={syncNow}>
        Sincronizar ahora
      </button>
      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleReset}>
        Restablecer predeterminados
      </button>
    </>
  );

  return (
    <div className="container-fluid px-0 app-config-page">
      {embedded ? (
        <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 mb-3">{actionBar}</div>
      ) : (
        <ModuleTitleBar title="Configuración de la aplicación" actions={actionBar} />
      )}

      <div className="alert alert-light border small mb-3">
        Los cambios se aplican al instante. Se guardan en este navegador y se sincronizan con tu cuenta en el servidor
        para usar la misma apariencia en otro equipo.
      </div>

      <div className="app-config-preview card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h6 className="mb-0">Vista previa</h6>
            <span className="badge text-bg-secondary">Tema: {resolved.theme.label}</span>
          </div>
          <div className="app-config-preview__mock">
            <div className="app-config-preview__sidebar" data-tone={preferences.sidebarTone}>
              <span />
              <span />
              <span />
            </div>
            <div className="app-config-preview__main">
              <div className="app-config-preview__topbar" />
              <div className="app-config-preview__card">
                <strong>Ejemplo de contenido</strong>
                <p>Así se verán fondo, tipografía y bordes en los módulos.</p>
                <button type="button" className="btn btn-primary btn-sm">
                  Acción
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="app-config-grid">
        <ConfigSection title="Tema de color" description="Paleta general de la interfaz (fondo, tarjetas y acentos).">
          <div className="app-config-option-grid">
            {themeList.map((theme) => (
              <OptionCard
                key={theme.id}
                active={preferences.themeId === theme.id}
                title={theme.label}
                description={theme.description}
                swatch={theme.swatch}
                previewVars={{
                  '--opt-bg': theme.vars['--dashboard-bg'],
                  '--opt-surface': theme.vars['--dashboard-surface'],
                  '--opt-border': theme.vars['--dashboard-border'],
                  '--opt-text': theme.vars['--dashboard-text'],
                  '--opt-muted': theme.vars['--dashboard-muted'],
                  '--opt-accent': theme.id === 'institutional' ? '#14532d' : theme.vars['--ui-primary'],
                  '--opt-accent-deep': theme.id === 'institutional' ? '#0f3d24' : theme.vars['--ui-primary-deep'],
                  '--opt-accent-rgb': theme.id === 'institutional' ? '20, 83, 45' : theme.vars['--ui-primary-rgb'],
                }}
                onClick={() => updatePreference('themeId', theme.id)}
              />
            ))}
          </div>
        </ConfigSection>

        <ConfigSection
          title="Personalización"
          description="Colores del diseño (fondo, texto, acento y menú). Haz clic para desplegar."
        >
          <button
            type="button"
            className={`app-config-disclosure${personalizacionOpen ? ' is-open' : ''}`}
            onClick={() => setPersonalizacionOpen((v) => !v)}
            aria-expanded={personalizacionOpen}
          >
            <span className="app-config-disclosure__chev" aria-hidden="true">
              {personalizacionOpen ? '▾' : '▸'}
            </span>
            <span className="app-config-disclosure__label">
              {personalizacionOpen ? 'Ocultar opciones de colores' : 'Mostrar opciones de colores'}
            </span>
          </button>

          {personalizacionOpen ? (
            <div className="mt-3">
              <h6 className="fw-bold mb-2">Colores principales</h6>
              <ColorPickRow
                label="Fondo (área principal)"
                value={preferences.backgroundColor}
                fallback={resolved.theme.vars['--dashboard-bg']}
                onChange={(v) => updatePreference('backgroundColor', v)}
                onReset={() => updatePreference('backgroundColor', '')}
              />
              <ColorPickRow
                label="Texto"
                value={preferences.textColor}
                fallback={resolved.theme.vars['--dashboard-text']}
                onChange={(v) => updatePreference('textColor', v)}
                onReset={() => updatePreference('textColor', '')}
              />
              <ColorPickRow
                label="Tarjetas / superficies"
                value={preferences.surfaceColor}
                fallback={resolved.theme.vars['--dashboard-surface']}
                onChange={(v) => updatePreference('surfaceColor', v)}
                onReset={() => updatePreference('surfaceColor', '')}
              />
              <ColorPickRow
                label="Acento / botones principales"
                value={preferences.accentColor}
                fallback={resolved.theme.vars['--ui-primary']}
                onChange={(v) => updatePreference('accentColor', v)}
                onReset={() => updatePreference('accentColor', '')}
              />
              <ColorPickRow
                label="Texto secundario"
                value={preferences.mutedTextColor}
                fallback={resolved.theme.vars['--dashboard-muted']}
                onChange={(v) => updatePreference('mutedTextColor', v)}
                onReset={() => updatePreference('mutedTextColor', '')}
              />

              <h6 className="fw-bold mt-4 mb-2">Menú lateral</h6>
              <ColorPickRow
                label="Fondo del menú lateral"
                value={preferences.sidebarBg}
                fallback="#111111"
                onChange={(v) => updatePreference('sidebarBg', v)}
                onReset={() => updatePreference('sidebarBg', '')}
              />
              <ColorPickRow
                label="Fondo del item (normal)"
                value={preferences.sidebarItemBg}
                fallback="#111111"
                onChange={(v) => updatePreference('sidebarItemBg', v)}
                onReset={() => updatePreference('sidebarItemBg', '')}
              />
              <ColorPickRow
                label="Texto del item (normal)"
                value={preferences.sidebarItemTextColor}
                fallback="#f4f4f5"
                onChange={(v) => updatePreference('sidebarItemTextColor', v)}
                onReset={() => updatePreference('sidebarItemTextColor', '')}
              />
              <ColorPickRow
                label="Fondo del item (hover)"
                value={preferences.sidebarHoverBg}
                fallback={resolved.theme.vars['--ui-primary']}
                onChange={(v) => updatePreference('sidebarHoverBg', v)}
                onReset={() => updatePreference('sidebarHoverBg', '')}
              />
              <ColorPickRow
                label="Texto del item (hover)"
                value={preferences.sidebarHoverTextColor}
                fallback="#ffffff"
                onChange={(v) => updatePreference('sidebarHoverTextColor', v)}
                onReset={() => updatePreference('sidebarHoverTextColor', '')}
              />
              <ColorPickRow
                label="Fondo del item activo"
                value={preferences.sidebarActiveBg}
                fallback={resolved.theme.vars['--brand-red']}
                onChange={(v) => updatePreference('sidebarActiveBg', v)}
                onReset={() => updatePreference('sidebarActiveBg', '')}
              />
              <ColorPickRow
                label="Texto del item activo"
                value={preferences.sidebarActiveTextColor}
                fallback="#ffffff"
                onChange={(v) => updatePreference('sidebarActiveTextColor', v)}
                onReset={() => updatePreference('sidebarActiveTextColor', '')}
              />
              <ColorPickRow
                label='Botón "Configuración" (activo) — color'
                value={preferences.sidebarConfigActiveFrom}
                fallback={resolved.theme.vars['--brand-red']}
                onChange={(v) => updatePreference('sidebarConfigActiveFrom', v)}
                onReset={() => updatePreference('sidebarConfigActiveFrom', '')}
              />
            </div>
          ) : null}
        </ConfigSection>

        <ConfigSection title="Tipografía" description="Familia y tamaño base del texto en toda la aplicación.">
          <label className="form-label small fw-semibold">Fuente</label>
          <div className="app-config-chip-row mb-3">
            {fontList.map((font) => (
              <button
                key={font.id}
                type="button"
                className={`app-config-chip${preferences.fontFamily === font.id ? ' is-active' : ''}`}
                style={{ fontFamily: font.stack }}
                onClick={() => updatePreference('fontFamily', font.id)}
              >
                {font.label}
              </button>
            ))}
          </div>
          <label className="form-label small fw-semibold">Tamaño</label>
          <div className="app-config-chip-row">
            {fontSizeList.map((size) => (
              <button
                key={size.id}
                type="button"
                className={`app-config-chip${preferences.fontSize === size.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('fontSize', size.id)}
              >
                {size.label}
              </button>
            ))}
          </div>
        </ConfigSection>

        <ConfigSection title="Escala y menú lateral">
          <label className="form-label small fw-semibold">Escala de interfaz</label>
          <div className="app-config-chip-row mb-3">
            {uiScaleList.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`app-config-chip${preferences.uiScale === opt.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('uiScale', opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="form-label small fw-semibold">Ancho del menú lateral</label>
          <div className="app-config-chip-row mb-3">
            {sidebarWidthList.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`app-config-chip${preferences.sidebarWidth === opt.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('sidebarWidth', opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="pref-auto-theme"
              checked={preferences.autoTheme}
              onChange={(e) => updatePreference('autoTheme', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="pref-auto-theme">
              Tema automático según el sistema (claro / oscuro)
            </label>
          </div>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="pref-sidebar-collapsed"
              checked={preferences.sidebarCollapsed}
              onChange={(e) => updatePreference('sidebarCollapsed', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="pref-sidebar-collapsed">
              Menú lateral colapsado (solo iconos)
            </label>
          </div>
        </ConfigSection>

        <ConfigSection title="Navegación" description="Comportamiento al usar el menú lateral.">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="pref-remember"
              checked={preferences.rememberSection}
              onChange={(e) => updatePreference('rememberSection', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="pref-remember">
              Recordar última sección al recargar
            </label>
          </div>
        </ConfigSection>

        <ConfigSection title="Hora y fechas">
          <label className="form-label small fw-semibold">Formato de fecha</label>
          <div className="app-config-chip-row mb-3">
            {Object.values(DATE_FORMAT_OPTIONS).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`app-config-chip${preferences.dateFormat === opt.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('dateFormat', opt.id)}
              >
                {opt.label} ({opt.example})
              </button>
            ))}
          </div>
          <label className="form-label small fw-semibold">Formato de hora</label>
          <div className="app-config-chip-row">
            {Object.values(TIME_FORMAT_OPTIONS).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`app-config-chip${preferences.timeFormat === opt.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('timeFormat', opt.id)}
              >
                {opt.label} ({opt.example})
              </button>
            ))}
          </div>
        </ConfigSection>

        <ConfigSection title="Accesibilidad">          <label className="form-label small fw-semibold">Espaciado entre líneas</label>
          <div className="app-config-chip-row mb-3">
            {lineHeightList.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`app-config-chip${preferences.lineHeight === opt.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('lineHeight', opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="app-config-toggle-list">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-underline"
                checked={preferences.underlineLinks}
                onChange={(e) => updatePreference('underlineLinks', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="pref-underline">
                Subrayar enlaces y botones de texto
              </label>
            </div>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-large-click"
                checked={preferences.largeClickTargets}
                onChange={(e) => updatePreference('largeClickTargets', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="pref-large-click">
                Botones más grandes (mejor para pantallas táctiles)
              </label>
            </div>
          </div>
        </ConfigSection>

        <ConfigSection title="Interfaz" description="Densidad, bordes y accesibilidad visual.">
          <label className="form-label small fw-semibold">Bordes redondeados</label>
          <div className="app-config-chip-row mb-3">
            {radiusList.map((radius) => (
              <button
                key={radius.id}
                type="button"
                className={`app-config-chip${preferences.borderRadius === radius.id ? ' is-active' : ''}`}
                onClick={() => updatePreference('borderRadius', radius.id)}
              >
                {radius.label}
              </button>
            ))}
          </div>

          <div className="app-config-toggle-list">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-compact"
                checked={preferences.compactMode}
                onChange={(e) => updatePreference('compactMode', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="pref-compact">
                Modo compacto (menos espaciado en tablas y formularios)
              </label>
            </div>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-motion"
                checked={preferences.reduceMotion}
                onChange={(e) => updatePreference('reduceMotion', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="pref-motion">
                Reducir animaciones
              </label>
            </div>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="pref-contrast"
                checked={preferences.highContrast}
                onChange={(e) => updatePreference('highContrast', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="pref-contrast">
                Alto contraste (bordes y textos más marcados)
              </label>
            </div>
          </div>
        </ConfigSection>
      </div>
    </div>
  );
}

export default AppConfiguracion;
