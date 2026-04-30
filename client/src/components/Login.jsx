import { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import Swal from 'sweetalert2';
import { isValidEmail } from '../utils/validation';

function Login({ onLogin }) {
  const [captchaPregunta, setCaptchaPregunta] = useState('');
  const [respuestaEsperada, setRespuestaEsperada] = useState(null);
  const [userRespuesta, setUserRespuesta] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [showPassword, setShowPassword] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/images/LOGOTIPO.png');
  const timerRef = useRef(null);

  const generarResta = () => {
    const b = 1 + Math.floor(Math.random() * 9);
    const dif = 1 + Math.floor(Math.random() * 20);
    const a = b + dif;
    setCaptchaPregunta(`${a} − ${b}`);
    setRespuestaEsperada(dif);
    setUserRespuesta('');
  };

  const resetCaptcha = () => {
    generarResta();
    setTimeLeft(120);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          generarResta();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    generarResta();
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const validateCaptcha = () => {
    const n = parseInt(String(userRespuesta).trim(), 10);
    if (Number.isNaN(n) || n !== respuestaEsperada) {
      Swal.fire('Verificación incorrecta', 'Resolvé la resta y escribí el resultado.', 'error');
      setUserRespuesta('');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = String(formData.get('email') || '').trim();
    const password = formData.get('password');
    if (!isValidEmail(email)) {
      Swal.fire('Email inválido', 'Ingresá un correo con formato válido (ej. usuario@dominio.com).', 'warning');
      return;
    }
    if (!password || String(password).length < 1) {
      Swal.fire('Datos incompletos', 'Ingresá la contraseña.', 'warning');
      return;
    }
    if (!validateCaptcha()) return;
    const result = await onLogin(email, password);
    if (!result.success) Swal.fire('Error', result.message, 'error');
  };

  const handleForgotPassword = async () => {
    const { value: email } = await Swal.fire({
      title: 'Recuperar contraseña',
      text: 'Ingresá tu correo para enviarte un enlace de recuperación.',
      input: 'email',
      inputPlaceholder: 'correo@empresa.com',
      showCancelButton: true,
      confirmButtonText: 'Enviar enlace',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value) return 'Debés ingresar un correo';
        return null;
      },
    });

    if (!email) return;

    try {
      const response = await Axios.post('/auth/forgot-password', { email });
      const { message, devResetUrl, deliveryWarning } = response.data || {};
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
        deliveryWarning ? 'Atención' : 'Solicitud enviada',
        message || 'Revisá tu correo para continuar.',
        deliveryWarning ? 'warning' : 'success'
      );
    } catch (error) {
      await Swal.fire('Error', error.response?.data?.message || 'No se pudo enviar el correo de recuperación.', 'error');
    }
  };

  const timerDeg = `${(timeLeft / 120) * 360}deg`;
  const timerPhase = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warn' : 'safe';

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

        <h1 className="login-title">Iniciar Sesión</h1>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field-row">
            <i className="bi bi-person login-field-icon" aria-hidden />
            <input
              type="email"
              name="email"
              className="login-input"
              placeholder="Correo electrónico"
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

          <p className="text-muted small mb-2 mt-1">Resolvé la resta (números pequeños):</p>
          <div className="login-captcha-row">
            <div className="login-captcha-code" style={{ minWidth: 140, fontSize: '1.15rem' }} aria-live="polite">
              {captchaPregunta || '—'}
            </div>
            <div className="login-captcha-side">
              <div
                className={`login-timer login-timer--${timerPhase}`}
                style={{ '--timer-deg': timerDeg }}
              >
                <div className="login-timer-inner">
                  <span className={`login-timer-text login-timer-text--${timerPhase}`}>{timeLeft}s</span>
                </div>
              </div>
              <button
                type="button"
                className="login-refresh"
                onClick={() => {
                  resetCaptcha();
                  startTimer();
                }}
                aria-label="Nueva operación"
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
              placeholder="Resultado (número)"
              value={userRespuesta}
              onChange={(e) => setUserRespuesta(e.target.value.replace(/\D/g, '').slice(0, 3))}
              maxLength={4}
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className="login-submit">
            Iniciar Sesión
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
              ¿Olvidaste tu contraseña?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
