import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import AvailabilityPage from "./pages/AvailabilityPage/AvailabilityPage";
import MyReservationsPage from "./pages/MyReservationsPage/MyReservationsPage";
import AdminPage from "./pages/AdminPage/AdminPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";
import VerifyEmailPage from "./pages/VerifyEmailPage/VerifyEmailPage";
import BackToTopButton from "./components/BackToTopButton/BackToTopButton";
import Footer from "./components/Footer/Footer";
import BottomNavigation from "./components/BottomNavigation/BottomNavigation";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleExpired = () => {
      const isLogin = location.pathname === "/login";
      const hasExpiredParam = location.search.includes("session=expired");

      if (!isLogin || (isLogin && !hasExpiredParam)) {
        navigate("/login?session=expired", { replace: true });
      }
    };

    window.addEventListener("session-expired", handleExpired);

    return () => {
      window.removeEventListener("session-expired", handleExpired);
    };
  }, [navigate, location.pathname]);

  return (
    <>
      <ScrollToTop />
      <Navbar />

      <main className="pb-app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />

          <Route
            path="/my-account"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-reservations"
            element={
              <ProtectedRoute>
                <MyReservationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Routes>
      </main>

      <Footer />

      <BackToTopButton />
      <BottomNavigation />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
