import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import "./LoginPage.css";
import { getErrorMessage } from "../../utils/errorHandler"; 

function renderPasswordToggleIcon(isVisible) {
  if (isVisible) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10.58 10.58C10.22 10.94 10 11.44 10 12C10 13.1 10.9 14 12 14C12.56 14 13.06 13.78 13.42 13.42"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.36 5.35C10.2 5.12 11.08 5 12 5C16.5 5 20.27 7.91 21.5 12C21.16 13.12 20.58 14.15 19.82 15.02"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.62 6.62C4.69 7.82 3.22 9.7 2.5 12C3.73 16.09 7.5 19 12 19C13.78 19 15.42 18.55 16.83 17.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 12C3.73 7.91 7.5 5 12 5C16.5 5 20.27 7.91 21.5 12C20.27 16.09 16.5 19 12 19C7.5 19 3.73 16.09 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LoginPage() {
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 900);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [sendingInitialVerification, setSendingInitialVerification] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const feedbackRef = useRef(null);
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  const searchParams = new URLSearchParams(location.search);
  const sessionExpired = searchParams.get("session") === "expired";

  // Detectar cambios en el tamaño de la ventana para adaptar el diseño
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldown]);

  // Hacer scroll suave hacia el mensaje de error cuando se actualice el estado de error
  useEffect(() => {
    if (!error || !feedbackRef.current) return;

    const top =
      feedbackRef.current.getBoundingClientRect().top + window.scrollY - 120;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }, [error]);

  const handleCapsLock = (e) => {
    setCapsLock(e.getModifierState("CapsLock"));
  };

  // Detectar el estado de Caps Lock para mostrar una advertencia al usuario
  const formatCooldownTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const handleResendVerification = async () => {
    try {
      setVerificationInfo("");
      setError("");
      setResendingVerification(true);

      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        setError("Introdueix el teu correu electrònic per reenviar la verificació.");
        return;
      }

      const response = await api.post("/auth/resend-verification", {
        email: normalizedEmail,
        mode: "resend",
      });

      const message =
        response?.data?.message ||
        response?.data?.data?.message ||
        "T'hem reenviat el correu de verificació.";

      setVerificationInfo(message);
      setResendCooldown(120);
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(
          err,
          "No s'ha pogut reenviar el correu de verificació."
        )
      );
    } finally {
      setResendingVerification(false);
    }
  };

  // Función para resetear el widget de Turnstile en caso de error o al desmontar el componente
  const resetTurnstile = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.turnstile &&
      turnstileWidgetIdRef.current !== null
    ) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }

    setTurnstileToken("");
  }, []);

  // Inicializar el widget de Turnstile al montar el componente y limpiar al desmontar
  useEffect(() => {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    if (!siteKey) {
      console.warn("Turnstile desactivat: falta VITE_TURNSTILE_SITE_KEY");
      setTurnstileReady(true);
      setTurnstileToken("turnstile-disabled");
      return;
    }

    if (!turnstileContainerRef.current) return;

    let attempts = 0;
    let intervalId = null;

    const renderWidget = () => {
      if (
        typeof window === "undefined" ||
        !window.turnstile ||
        turnstileWidgetIdRef.current !== null
      ) {
        return;
      }

      turnstileWidgetIdRef.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => {
            setTurnstileToken(token || "");
            setError("");
          },
          "expired-callback": () => {
            setTurnstileToken("");
          },
          "error-callback": () => {
            setTurnstileToken("");
            setError("No s'ha pogut validar el captcha. Torna-ho a provar.");
          },
        }
      );

      setTurnstileReady(true);
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    intervalId = window.setInterval(() => {
      attempts += 1;

      if (window.turnstile) {
        renderWidget();
        window.clearInterval(intervalId);
      }

      if (attempts > 50) {
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (
        typeof window !== "undefined" &&
        window.turnstile &&
        turnstileWidgetIdRef.current !== null
      ) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  // Función para manejar el envío del formulario de login
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setVerificationInfo("");
      setShowVerificationHelp(false);
      setLoading(true);

      if (!turnstileToken && import.meta.env.VITE_TURNSTILE_SITE_KEY) {
        setError("Has de completar la verificació de seguretat.");
        setLoading(false);
        return;
      }

      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        turnstileToken,
      });

      const token = response?.data?.data?.token || "";
      const user = response?.data?.data?.user || null;

      if (!token) {
        throw new Error("No s'ha rebut el token de sessió");
      }

      localStorage.setItem("token", token);

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      window.dispatchEvent(new Event("profile-updated"));

      setTimeout(() => {
        navigate("/availability");
      }, 800);
    } catch (err) {
      console.error(err);

      const loginError = getErrorMessage(err, "No s'ha pogut iniciar sessió.");
      const normalizedError = String(loginError).toLowerCase();

      const isUnverifiedEmailError =
        normalizedError.includes("verificar el teu correu") ||
        normalizedError.includes("correu abans d'iniciar sessió");

      setError(loginError);
      setShowVerificationHelp(isUnverifiedEmailError);

      if (isUnverifiedEmailError) {
        try {
          setSendingInitialVerification(true);

          const resendResponse = await api.post("/auth/resend-verification", {
            email: email.trim().toLowerCase(),
            mode: "initial",
          });

          const resendMessage =
            resendResponse?.data?.message ||
            resendResponse?.data?.data?.message ||
            "T'hem reenviat el correu de verificació.";

          setVerificationInfo(resendMessage);
          setResendCooldown(120);
        } catch (resendErr) {
          console.error(resendErr);

          setVerificationInfo("");
          setError(
            getErrorMessage(
              resendErr,
              "No s'ha pogut reenviar el correu de verificació automàticament."
            )
          );
        } finally {
          setSendingInitialVerification(false);
        }
      }

      resetTurnstile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login__page ${isMobileView ? "login__page--mobile" : ""}`}>
      <div
        className={`login__wrapper ${isMobileView ? "login__wrapper--mobile" : ""}`}
      >
        {!isMobileView && (
        <section
          className={`fade-in-up login__visual-panel ${
            isMobileView ? "login__visual-panel--mobile" : ""
          }`}
        >
          <div className="login__visual-glow-one" />
          <div className="login__visual-glow-two" />

          <div className="login__visual-content">
            <span className="login__badge">Accés segur</span>

            <h1
              className={`login__title ${isMobileView ? "login__title--mobile" : ""}`}
            >
              Torna a entrar i continua gestionant les teves reserves
            </h1>

            <p className="login__text">
              Accedeix a PadelBook per consultar disponibilitat, reservar pistes i
              revisar el teu historial amb una experiència més clara i agradable.
            </p>

            <div className="login__feature-stack">
              <div className="login__feature-card">
                <span className="login__feature-icon">🎾</span>
                <div>
                  <strong className="login__feature-title">Disponibilitat al moment</strong>
                  <p className="login__feature-text">
                    Consulta pistes i franges disponibles de manera ràpida.
                  </p>
                </div>
              </div>

              <div className="login__feature-card">
                <span className="login__feature-icon">📅</span>
                <div>
                  <strong className="login__feature-title">Reserves sota control</strong>
                  <p className="login__feature-text">
                    Revisa, confirma o cancel·la les teves reserves des del mateix espai.
                  </p>
                </div>
              </div>

              <div className="login__feature-card">
                <span className="login__feature-icon">✨</span>
                <div>
                  <strong className="login__feature-title">Experiència més cuidada</strong>
                  <p className="login__feature-text">
                    Navegació més neta, feedback visible i millor sensació general.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        <section
          className={`scale-in delay-1 login__form-card ${
            isMobileView ? "login__form-card--mobile" : ""
          }`}
        >
          <div className="login__form-top pb-auth-header">
            <h2 className="login__form-title pb-auth-title">
              Benvingut a{" "}
              <span className="pb-auth-brand">PadelBook</span>
            </h2>
            <span className="pb-auth-title-line" aria-hidden="true" />
            <p className="login__form-text pb-auth-text">
              Inicia sessió amb el teu compte i continua reservant pistes.
            </p>
          </div>

          <div ref={feedbackRef} />

          {sessionExpired && !error && (
            <div
              className="scale-in login__error-box"
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <p
                className="login__error-text"
                style={{ color: "#1e3a8a" }}
              >
                La teva sessió ha caducat. Torna a iniciar sessió.
              </p>
            </div>
          )}

          {error && !showVerificationHelp && (
            <div className="scale-in login__error-box">
              <p className="login__error-text">{error}</p>
            </div>
          )}

          {showVerificationHelp && (
            <div className="scale-in login__verification-box">
              <p className="login__verification-title">
                Verifica el teu correu per continuar
              </p>

              <p className="login__verification-text">
                Aquest compte encara no té el correu verificat. T’hem reenviat automàticament
                un correu de verificació. Revisa la safata d’entrada i, si no el trobes,
                espera un moment abans de tornar-lo a reenviar.
              </p>

              {verificationInfo && (
                <div className="login__verification-success">
                  {verificationInfo}
                </div>
              )}

              <div className="login__verification-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleResendVerification}
                  disabled={
                    sendingInitialVerification ||
                    resendingVerification ||
                    !email.trim() ||
                    resendCooldown > 0
                  }
                >
                  {sendingInitialVerification
                    ? "Enviant verificació..."
                    : resendingVerification
                    ? "Reenviant verificació..."
                    : resendCooldown > 0
                    ? `Reenviar verificació (${formatCooldownTime(resendCooldown)})`
                    : "Reenviar verificació"}
                </button>

                <Link to="/register" className="btn btn-light">
                  Crear un altre compte
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="login__form">
            <div className="login__field">
              <label htmlFor="email" className="login__label">
                Correu electrònic
              </label>

              <input
                id="email"
                type="email"
                placeholder="exemple@correu.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setShowVerificationHelp(false);
                  setVerificationInfo("");
                }}
                className="login__input"
                autoComplete="email"
                autoFocus
                required
              />
            </div>

            <div className="login__field">
              <label htmlFor="password" className="login__label">
                Contrasenya
              </label>

              <div
                className={`login__password-wrapper ${
                  isMobileView ? "login__password-wrapper--mobile" : ""
                }`}
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Introdueix la teva contrasenya"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  className="login__input login__input--password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className={`login__show-button ${
                    isMobileView ? "login__show-button--mobile" : ""
                  }`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contrasenya" : "Mostrar contrasenya"}
                >
                  {renderPasswordToggleIcon(showPassword)}
                </button>
              </div>

              {capsLock && (
                <span className="login__caps-warning">
                  ⚠️ Tens el bloqueig de majúscules activat
                </span>
              )}
            </div>

            <div className="login__field">
              <label className="login__label">Verificació de seguretat</label>

              <div className="login__turnstile-box">
                <div ref={turnstileContainerRef} />
              </div>

              {!turnstileReady && (
                <span className="login__turnstile-help">
                  Carregant verificació...
                </span>
              )}
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-full login__submit-button ${
                loading || !turnstileToken ? "login__submit-button--disabled" : ""
              } ${loading ? "login__submit-button--loading" : ""}`}
              disabled={loading || !turnstileToken}
              aria-busy={loading}
            >
              {loading ? "Iniciant sessió..." : "Entrar a PadelBook"}
            </button>
          </form>

          <div className="login__separator">
            <span className="login__separator-line" />
            <span className="login__separator-text">o</span>
            <span className="login__separator-line" />
          </div>

          <div className="login__footer-box">
            <p className="login__footer-text">Encara no tens compte?</p>

            <Link to="/register" className="btn btn-light btn-full">
              Crear compte
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
