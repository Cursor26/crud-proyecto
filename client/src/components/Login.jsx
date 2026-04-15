import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

function Login({ onLogin }) {
  const [captchaText, setCaptchaText] = useState('');
  const [userCaptcha, setUserCaptcha] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [showPassword, setShowPassword] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/images/login-brand.png');
  const timerRef = useRef(null);

  const generateCaptcha = () => {
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += String(Math.floor(Math.random() * 10));
    }
    return captcha;
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
          clearInterval(timerRef.current);
          resetCaptcha();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    resetCaptcha();
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const validateCaptcha = () => {
    if (userCaptcha !== captchaText) {
      Swal.fire('Captcha incorrecto', 'Verifica el código de verificación', 'error');
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

  const timerDeg = `${(timeLeft / 60) * 360}deg`;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img
            src={logoSrc}
            alt="PECUARIA GENÉTICA Valle del Perú"
            className="login-logo-img"
            onError={() => setLogoSrc('/images/usuario.png')}
          />
        </div>

        <h1 className="login-title">Iniciar Sesión</h1>

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
              placeholder="Contraseña"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="login-eye-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              tabIndex={-1}
            >
              <i className={showPassword ? 'bi bi-eye' : 'bi bi-eye-slash'} aria-hidden />
            </button>
          </div>

          <div className="login-captcha-row">
            <div className="login-captcha-code" aria-live="polite">
              {captchaText || '------'}
            </div>
            <div className="login-captcha-side">
              <div className="login-timer" style={{ '--timer-deg': timerDeg }}>
                <div className="login-timer-inner">
                  <span className="login-timer-text">{Math.ceil(timeLeft)}s</span>
                </div>
              </div>
              <button
                type="button"
                className="login-refresh"
                onClick={() => {
                  resetCaptcha();
                  startTimer();
                }}
                aria-label="Generar nuevo código"
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
              inputMode="numeric"
              className="login-input"
              placeholder="Escriba Aquí el Código de Verificación..."
              value={userCaptcha}
              onChange={(e) => setUserCaptcha(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className="login-submit">
            Iniciar Sesión
          </button>

          <p className="login-forgot">
            <a href="#recuperar" className="login-forgot-link" onClick={(e) => e.preventDefault()}>
              ¿Olvidaste tu contraseña?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
