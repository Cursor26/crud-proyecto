import { useState, useEffect, useRef, useMemo } from 'react';
import Axios, { API_BASE } from '../axiosConfig';
import Swal from 'sweetalert2';
import { DEFAULT_LOGIN_LOGO } from '../lib/profilePhoto';
import {
  clearTrustedDeviceProfile,
  getTrustedDeviceProfile,
  getTrustedPhotoForIdentifier,
  hasTrustedDeviceProfile,
} from '../lib/trustedDeviceProfile';
import MailServiceUnavailableBanner from './MailServiceUnavailableBanner';
import {
  isMailUnavailableResponse,
  mailUnavailableMessage,
  MAIL_QUEUED_MESSAGE,
  mailQueueBannerMessage,
} from '../lib/mailServiceMessages';

function Login({ onLogin }) {
  const [captchaText, setCaptchaText] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState(() => {
    const trusted = getTrustedDeviceProfile();
    return trusted?.email || '';
  });
  const [rememberedDevice, setRememberedDevice] = useState(() => hasTrustedDeviceProfile());
  const [profilePhotoSrc, setProfilePhotoSrc] = useState(null);
  const [isProfileReveal, setIsProfileReveal] = useState(false);
  const timerRef = useRef(null);
  const avatarLookupTimerRef = useRef(null);
  const profileHideTimerRef = useRef(null);
  const loginInputRef = useRef(null);
  const loginPasswordRef = useRef(null);
  const [mailStatus, setMailStatus] = useState({
    smtp_disponible: true,
    mensaje: null,
    correos_pendientes: 0,
  });

  const PROFILE_ANIM_MS = 560;

  useEffect(() => {
    Axios.get(`${API_BASE}/auth/mail-estado`)
      .then((res) => {
        setMailStatus({
          smtp_disponible: res.data?.smtp_disponible !== false,
          mensaje: res.data?.mensaje || null,
          correos_pendientes: Number(res.data?.correos_pendientes) || 0,
        });
      })
      .catch(() => {});
  }, []);

  const revealProfilePhoto = (foto) => {
    if (profileHideTimerRef.current) {
      clearTimeout(profileHideTimerRef.current);
      profileHideTimerRef.current = null;
    }
    setProfilePhotoSrc(foto);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsProfileReveal(true));
    });
  };

  const hideProfilePhoto = () => {
    if (profileHideTimerRef.current) {
      clearTimeout(profileHideTimerRef.current);
    }
    setIsProfileReveal(false);
    profileHideTimerRef.current = setTimeout(() => {
      setProfilePhotoSrc(null);
      profileHideTimerRef.current = null;
    }, PROFILE_ANIM_MS);
  };

  const isResetMode = useMemo(() => Boolean(resetToken && resetEmail), [resetToken, resetEmail]);

  const clearResetUrl = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const exitResetMode = () => {
    setResetToken('');
    setResetEmail('');
    setResetPassword('');
    setConfirmResetPassword('');
    clearResetUrl();
  };

  const generateCaptcha = () => {
    const letters = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const targetLength = 6;
    const half = targetLength / 2;
    const out = [];

    for (let i = 0; i < half; i += 1) {
      out.push(letters.charAt(Math.floor(Math.random() * letters.length)));
      out.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
    }

    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }

    return out.join('');
  };

  const resetCaptcha = () => {
    const newCaptcha = generateCaptcha();
    setCaptchaText(newCaptcha);
    setUserCaptcha('');
    setTimeLeft(60);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          resetCaptcha();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Inicializa captcha e intervalo solo al montar (no en modo reset de contraseña)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = String(params.get('resetToken') || '').trim();
    const email = String(params.get('email') || '').trim();

    if (token && email) {
      setResetToken(token);
      setResetEmail(email);
      return undefined;
    }

    resetCaptcha();
    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- init captcha una vez al montar

  useEffect(() => {
    if (!isResetMode) return;
    if (timerRef.current) clearInterval(timerRef.current);
  }, [isResetMode]);

  // El autocompletado del navegador no dispara onChange; sincronizamos estado (avatar) desde el DOM.
  useEffect(() => {
    if (isResetMode) return undefined;

    const syncIdentifierFromDom = () => {
      const el = loginInputRef.current;
      if (!el) return;
      const domValue = String(el.value || '');
      setLoginIdentifier((prev) => (prev === domValue ? prev : domValue));
    };

    const el = loginInputRef.current;
    const onAutoFill = (e) => {
      if (e.animationName === 'loginInputAutofillStart') syncIdentifierFromDom();
    };
    const onInput = () => syncIdentifierFromDom();
    const onChange = () => syncIdentifierFromDom();

    el?.addEventListener('animationstart', onAutoFill);
    el?.addEventListener('input', onInput);
    el?.addEventListener('change', onChange);

    // El gestor de contraseñas puede rellenar con retardo tras la selección del usuario.
    const timers = [50, 150, 400, 800, 1500].map((ms) => setTimeout(syncIdentifierFromDom, ms));

    return () => {
      timers.forEach(clearTimeout);
      el?.removeEventListener('animationstart', onAutoFill);
      el?.removeEventListener('input', onInput);
      el?.removeEventListener('change', onChange);
    };
  }, [isResetMode]);

  useEffect(() => {
    if (isResetMode) return undefined;

    const trimmed = String(loginIdentifier || '').trim();
    if (avatarLookupTimerRef.current) clearTimeout(avatarLookupTimerRef.current);

    if (!trimmed) {
      hideProfilePhoto();
      return undefined;
    }

    avatarLookupTimerRef.current = setTimeout(() => {
      const foto = getTrustedPhotoForIdentifier(trimmed);
      if (foto) {
        revealProfilePhoto(foto);
      } else {
        hideProfilePhoto();
      }
    }, 200);

    return () => {
      if (avatarLookupTimerRef.current) clearTimeout(avatarLookupTimerRef.current);
    };
  }, [loginIdentifier, isResetMode]);

  useEffect(
    () => () => {
      if (profileHideTimerRef.current) clearTimeout(profileHideTimerRef.current);
    },
    []
  );

  const handleUseAnotherAccount = () => {
    clearTrustedDeviceProfile();
    setRememberedDevice(false);
    setLoginIdentifier('');
    if (loginInputRef.current) loginInputRef.current.value = '';
    if (loginPasswordRef.current) loginPasswordRef.current.value = '';
    hideProfilePhoto();
  };

  const validateCaptcha = () => {
    if (String(userCaptcha || '').trim() !== String(captchaText || '').trim()) {
      Swal.fire('Captcha incorrecto', 'Verifica el c\u00f3digo de verificaci\u00f3n', 'error');
      setUserCaptcha('');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const identifier = formData.get('identifier');
    const password = formData.get('password');
    if (!validateCaptcha()) return;
    const result = await onLogin(identifier, password);
    if (!result.success) Swal.fire('Error', result.message, 'error');
  };

  const handleForgotPassword = async () => {
    const { value: email } = await Swal.fire({
      title: 'Recuperar contrase\u00f1a',
      text: 'Ingresa tu correo para enviarte un enlace de recuperaci\u00f3n.',
      input: 'email',
      inputPlaceholder: 'correo@empresa.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar enlace',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) return 'Debes ingresar un correo';
        return null;
      },
    });

    if (!email) return;

    try {
      const response = await Axios.post(`${API_BASE}/auth/forgot-password`, { email });
      const { message, devResetUrl, deliveryWarning, queued } = response.data || {};
      if (devResetUrl) {
        const result = await Swal.fire({
          icon: deliveryWarning ? 'warning' : 'info',
          title: deliveryWarning ? 'Enlace temporal disponible' : 'Modo desarrollo',
          html: `
            <p>${message || 'Solicitud procesada.'}</p>
            <p style="word-break:break-all;"><strong>Enlace:</strong><br/>${devResetUrl}</p>
          `,
          showCancelButton: true,
          confirmButtonText: 'Abrir enlace',
          cancelButtonText: 'Cerrar',
          reverseButtons: true,
        });
        if (result.isConfirmed) {
          window.location.href = devResetUrl;
        }
        return;
      }

      await Swal.fire(
        queued ? 'Correo en cola' : deliveryWarning ? 'Atención' : 'Solicitud enviada',
        queued ? MAIL_QUEUED_MESSAGE : message || 'Revisa tu correo para continuar.',
        queued || deliveryWarning ? 'warning' : 'success'
      );
    } catch (error) {
      const title = isMailUnavailableResponse(error) ? 'Correo no disponible' : 'Error';
      await Swal.fire(title, mailUnavailableMessage(error), isMailUnavailableResponse(error) ? 'warning' : 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetPassword || !confirmResetPassword) {
      Swal.fire('Faltan datos', 'Debes completar ambos campos de contrase\u00f1a.', 'warning');
      return;
    }
    if (resetPassword.length < 8) {
      Swal.fire('Contrase\u00f1a d\u00e9bil', 'La nueva contrase\u00f1a debe tener al menos 8 caracteres.', 'warning');
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      Swal.fire('No coincide', 'La confirmaci\u00f3n de contrase\u00f1a no coincide.', 'warning');
      return;
    }

    try {
      setSubmittingReset(true);
      const response = await Axios.post('/auth/reset-password', {
        email: resetEmail,
        token: resetToken,
        newPassword: resetPassword,
      });
      await Swal.fire('Contrase\u00f1a actualizada', response.data?.message || 'Ya puedes iniciar sesi\u00f3n con tu nueva contrase\u00f1a.', 'success');
      exitResetMode();
      resetCaptcha();
      startTimer();
    } catch (error) {
      await Swal.fire('Error', error.response?.data?.message || 'No se pudo restablecer la contrase\u00f1a.', 'error');
    } finally {
      setSubmittingReset(false);
    }
  };

  const timerDeg = `${(timeLeft / 60) * 360}deg`;
  const timerPhase = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warn' : 'safe';
  const captchaGlyphs = useMemo(() => {
    return String(captchaText || '')
      .split('')
      .map((char, index) => {
        const seedBase = `${captchaText}-${index}-${char}`;
        const seed = Array.from(seedBase).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const rot = ((seed % 27) - 13);
        const y = ((seed % 7) - 3);
        const x = ((seed % 5) - 2);
        const scale = 0.92 + ((seed % 9) * 0.015);
        const sizePx = 18 + (seed % 6);
        return {
          char,
          style: {
            transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
            fontSize: `${sizePx}px`,
          },
        };
      });
  }, [captchaText]);

  return (
    <div className="login-page">
      <MailServiceUnavailableBanner
        visible={
          mailStatus.smtp_disponible === false || (mailStatus.correos_pendientes || 0) > 0
        }
        message={mailQueueBannerMessage(mailStatus)}
      />
      <div className="login-card">
        <div className={`login-logo-wrap${isProfileReveal ? ' login-logo-wrap--profile-visible' : ''}`}>
          {profilePhotoSrc ? (
            <img
              src={profilePhotoSrc}
              alt=""
              className="login-logo-profile"
              aria-hidden="true"
              onError={hideProfilePhoto}
            />
          ) : null}
          <img
            src={DEFAULT_LOGIN_LOGO}
            alt="PECUARIA GENETICA Valle del Peru"
            className="login-logo-brand"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/images/usuario.png';
            }}
          />
        </div>

        <h1 className="login-title">{isResetMode ? 'Restablecer contrase\u00f1a' : 'Iniciar Sesi\u00f3n'}</h1>

        {isResetMode ? (
          <form className="login-form" onSubmit={handleResetPassword} noValidate>
            <div className="login-field-row">
              <i className="bi bi-envelope login-field-icon" aria-hidden />
              <input type="email" className="login-input" value={resetEmail} readOnly />
            </div>

            <div className="login-field-row">
              <i className="bi bi-shield-lock login-field-icon" aria-hidden />
              <input
                type="password"
                className="login-input"
                placeholder="Nueva contrasena"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="login-field-row login-field-row--verify">
              <i className="bi bi-check2-circle login-field-icon" aria-hidden />
              <input
                type="password"
                className="login-input"
                placeholder="Confirmar nueva contrasena"
                value={confirmResetPassword}
                onChange={(e) => setConfirmResetPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="login-submit" disabled={submittingReset}>
              {submittingReset ? 'Guardando...' : 'Guardar nueva contrasena'}
            </button>

            <p className="login-forgot">
              <button type="button" className="login-forgot-link login-forgot-link--btn" onClick={exitResetMode}>
                Volver a iniciar sesion
              </button>
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSubmit} noValidate autoComplete="on">
            <div className="login-field-row">
              <i className="bi bi-person login-field-icon" aria-hidden />
              <input
                ref={loginInputRef}
                type="text"
                name="identifier"
                className="login-input"
                placeholder="Usuario o correo"
                autoComplete="username"
                defaultValue={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                onInput={(e) => setLoginIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="login-field-row">
              <i className="bi bi-lock login-field-icon" aria-hidden />
              <input
                ref={loginPasswordRef}
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="login-input login-input--has-trailing"
                placeholder="Contrasena"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                tabIndex={-1}
              >
                <i className={showPassword ? 'bi bi-eye' : 'bi bi-eye-slash'} aria-hidden />
              </button>
            </div>

            <div className="login-captcha-row">
              <div className="login-captcha-code" aria-live="polite">
                {captchaText
                  ? captchaGlyphs.map((g, idx) => (
                      <span key={`${g.char}-${idx}`} className="login-captcha-code__glyph" style={g.style}>
                        {g.char}
                      </span>
                    ))
                  : '------'}
              </div>
              <div className="login-captcha-side">
                <div className={`login-timer login-timer--${timerPhase}`} style={{ '--timer-deg': timerDeg }}>
                  <div className="login-timer-inner">
                    <span className={`login-timer-text login-timer-text--${timerPhase}`}>{Math.ceil(timeLeft)}s</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="login-refresh"
                  onClick={() => {
                    resetCaptcha();
                    startTimer();
                  }}
                  aria-label="Generar nuevo codigo"
                >
                  <i className="bi bi-arrow-clockwise" aria-hidden />
                </button>
              </div>
            </div>

            <div className="login-field-row login-field-row--verify">
              <i className="bi bi-shield-check login-field-icon" aria-hidden />
              <input
                type="text"
                name="captcha"
                inputMode="text"
                className="login-input"
                placeholder="Escriba aqui el codigo alfanumerico..."
                value={userCaptcha}
                onChange={(e) => setUserCaptcha(String(e.target.value || '').replace(/\s/g, '').slice(0, 6))}
                maxLength={6}
                autoComplete="off"
                required
              />
            </div>

            <button type="submit" className="login-submit">
              Iniciar Sesion
            </button>

            <p className="login-forgot">
              <a
                href="#recuperar"
                className="login-forgot-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleForgotPassword();
                }}
              >
                Olvidaste tu contrasena?
              </a>
              {rememberedDevice ? (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="login-forgot-link login-forgot-link--btn"
                    onClick={handleUseAnotherAccount}
                  >
                    Usar otra cuenta
                  </button>
                </>
              ) : null}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
