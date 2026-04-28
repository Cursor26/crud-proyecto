import { useState, useEffect, useRef, useMemo } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';

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
  const [logoSrc, setLogoSrc] = useState('/images/LOGOTIPO.png');
  const timerRef = useRef(null);

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
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, []);

  useEffect(() => {
    if (!isResetMode) return;
    if (timerRef.current) clearInterval(timerRef.current);
  }, [isResetMode]);

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
    const email = formData.get('email');
    const password = formData.get('password');
    if (!validateCaptcha()) return;
    const result = await onLogin(email, password);
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
      const response = await Axios.post('http://localhost:3001/auth/forgot-password', { email });
      const { message, devResetUrl } = response.data || {};
      if (devResetUrl) {
        const result = await Swal.fire({
          icon: 'info',
          title: 'Modo desarrollo',
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

      await Swal.fire('Solicitud enviada', message || 'Revisa tu correo para continuar.', 'success');
    } catch (error) {
      await Swal.fire('Error', error.response?.data?.message || 'No se pudo enviar el correo de recuperacin.', 'error');
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
      const response = await Axios.post('http://localhost:3001/auth/reset-password', {
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
      <div className="login-card">
        <div className="login-logo-wrap">
          <img
            src={logoSrc}
            alt="PECUARIA GENETICA Valle del Peru"
            className="login-logo-img"
            onError={() => setLogoSrc('/images/usuario.png')}
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
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field-row">
              <i className="bi bi-person login-field-icon" aria-hidden />
              <input
                type="email"
                name="email"
                className="login-input"
                placeholder="Usuario"
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field-row">
              <i className="bi bi-lock login-field-icon" aria-hidden />
              <input
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
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
