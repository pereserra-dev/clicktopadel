import { Link, useLocation } from "react-router-dom";
import "./BottomNavigation.css";

const navItems = [
  {
    to: "/",
    label: "Inici",
    match: (pathname) => pathname === "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 10.8L12 4L20 10.8V20H15.5V14.5H8.5V20H4V10.8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: "/availability",
    label: "Disponibilitat",
    match: (pathname) => pathname.startsWith("/availability"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 3.8V6.2M17 3.8V6.2M4.8 9.2H19.2M6.6 5H17.4C18.3941 5 19.2 5.80589 19.2 6.8V18.2C19.2 19.1941 18.3941 20 17.4 20H6.6C5.60589 20 4.8 19.1941 4.8 18.2V6.8C4.8 5.80589 5.60589 5 6.6 5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 13H9.2M11.4 13H12.6M14.8 13H16M8 16H9.2M11.4 16H12.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: "/my-reservations",
    label: "Reserves",
    match: (pathname) => pathname.startsWith("/my-reservations"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 6.4H17M7 11.2H17M7 16H12.4M5.8 3.8H18.2C19.1941 3.8 20 4.60589 20 5.6V18.4C20 19.3941 19.1941 20.2 18.2 20.2H5.8C4.80589 20.2 4 19.3941 4 18.4V5.6C4 4.60589 4.80589 3.8 5.8 3.8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: "/my-account",
    label: "Perfil",
    match: (pathname) => pathname.startsWith("/my-account") || pathname.startsWith("/profile"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M5 20C5.93853 16.9885 8.57936 15 12 15C15.4206 15 18.0615 16.9885 19 20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

function BottomNavigation() {
  const location = useLocation();

  const handleNavClick = (event, path) => {
    if (location.pathname === path) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav className="pb-bottom-nav" aria-label="Navegació principal mòbil">
      <div className="pb-bottom-nav__inner">
        {navItems.map((item) => {
          const isActive = item.match(location.pathname);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`pb-bottom-nav__item ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => handleNavClick(event, item.to)}
            >
              <span className="pb-bottom-nav__icon">{item.icon}</span>
              <span className="pb-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
