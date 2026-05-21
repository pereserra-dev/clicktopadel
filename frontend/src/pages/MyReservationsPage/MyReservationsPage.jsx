import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import ReservationCard from "../../components/ReservationCard/ReservationCard";
import LoadingSpinner from "../../components/LoadingSpinner/LoadingSpinner";
import "./MyReservationsPage.css";
import { getErrorMessage } from "../../utils/errorHandler";

function MyReservationsPage() {
    const navigate = useNavigate();
    const topFeedbackRef = useRef(null);
    const summaryRef = useRef(null);
    const segmentedRef = useRef(null);

  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const [hasInteractedWithFilter, setHasInteractedWithFilter] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("success");
  const [confirmingReservationId, setConfirmingReservationId] = useState(null);
  const [cancellingReservationId, setCancellingReservationId] = useState(null);
  const [deletingCancelledReservationId, setDeletingCancelledReservationId] =
    useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [recentlyCancelledReservationId, setRecentlyCancelledReservationId] =
    useState(null);

  // Detectar canvis en la mida de la finestra per adaptar la vista a dispositius mòbils
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Funcions per fer scroll suau cap a feedback i resum després d'interaccions
  const scrollToFeedback = () => {
    if (!topFeedbackRef.current) return;

    const top =
      topFeedbackRef.current.getBoundingClientRect().top + window.scrollY - 150;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  };

  const scrollToSummary = () => {
    if (!segmentedRef.current) return;

    const top =
      segmentedRef.current.getBoundingClientRect().top + window.scrollY - 110;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  };

  const handleFilterChange = (filter) => {
    setHasInteractedWithFilter(true);

    if (activeFilter === filter) {
      setTimeout(() => {
        scrollToSummary();
      }, 60);
      return;
    }

    setActiveFilter(filter);
  };

  const isSessionExpiredError = (err) => err?.response?.status === 401;

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/reservations");
      const reservationsData = response?.data?.data || [];

      setReservations(Array.isArray(reservationsData) ? reservationsData : []);
    } catch (err) {
      console.error(err);

      if (isSessionExpiredError(err)) {
        return;
      }

      setError(getErrorMessage(err, "No s'han pogut carregar les reserves."));
    } finally {
      setLoading(false);
    }
  };

  const showFeedbackMessage = (message, type = "success") => {
    setFeedback(message);
    setFeedbackType(type);

    setTimeout(() => {
      setFeedback("");
    }, 3500);
  };

  const handleCancel = async (id) => {
    try {
      setCancellingReservationId(id);

      const response = await api.delete(`/reservations/${id}`);

      setConfirmingReservationId(null);
      setRecentlyCancelledReservationId(id);

      showFeedbackMessage(
        response?.data?.message || "La reserva s'ha cancel·lat correctament.",
        "success"
      );

      scrollToFeedback();

      await fetchReservations();

      setTimeout(() => {
        setRecentlyCancelledReservationId(null);
      }, 2500);
        } catch (err) {
          console.error(err);

          if (isSessionExpiredError(err)) {
            return;
          }

          const backendError = getErrorMessage(
            err,
            "No s'ha pogut cancel·lar la reserva."
          );

          showFeedbackMessage(backendError, "error");
          scrollToFeedback();
        } finally {
          setCancellingReservationId(null);
        }
  };

  const handleRepeatReservation = () => {
    navigate("/availability");
  };

  const handleDeleteCancelled = async (id) => {
    try {
      setDeletingCancelledReservationId(id);

      const response = await api.delete(`/reservations/${id}/permanent`);

      setReservations((prev) => prev.filter((reservation) => reservation.id !== id));

      if (confirmingReservationId === id) {
        setConfirmingReservationId(null);
      }

      showFeedbackMessage(
        response?.data?.message ||
          "Reserva cancel·lada eliminada correctament.",
        "success"
      );

      scrollToFeedback();
        } catch (err) {
          console.error(err);

          if (isSessionExpiredError(err)) {
            return;
          }

          const backendError = getErrorMessage(
            err,
            "No s'ha pogut eliminar la reserva cancel·lada."
          );

          showFeedbackMessage(backendError, "error");
          scrollToFeedback();
        } finally {
          setDeletingCancelledReservationId(null);
        }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (!hasInteractedWithFilter) return;
    if (!summaryRef.current) return;

    const timeout = setTimeout(() => {
      scrollToSummary();
    }, 60);

    return () => clearTimeout(timeout);
  }, [activeFilter, hasInteractedWithFilter]);

  const getReservationEndDate = (reservation) => {
    // Convertim la data ISO correctament
    const baseDate = new Date(reservation.data_reserva);

    const [hours, minutes, seconds = 0] = String(reservation.hora_fi || "00:00:00")
      .split(":")
      .map(Number);

    // Clonam la data i li aplicam l'hora de finalització
    const endDate = new Date(baseDate);
    endDate.setHours(hours, minutes, seconds, 0);

    return endDate;
  };

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // cada 1 minut

    return () => clearInterval(interval);
  }, []);

  const activeReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const endDate = getReservationEndDate(reservation);
      return reservation.estat === "activa" && endDate >= now;
    });
  }, [reservations, now]);

  const pastReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      const endDate = getReservationEndDate(reservation);
      return reservation.estat === "activa" && endDate < now;
    });
  }, [reservations, now]);

  const cancelledReservations = useMemo(() => {
    return reservations.filter((reservation) => reservation.estat === "cancel·lada");
  }, [reservations]);

  const normalizeReservationDateForFilter = (value) => {
    if (!value) return "";

    const parsedDate = new Date(value);

    if (!Number.isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const day = String(parsedDate.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    const rawValue = String(value).trim();

    const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const localMatch = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (localMatch) {
      return `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}`;
    }

    return rawValue;
  };

  const sortReservationsForView = (list, filter) => {
    const sorted = [...list];

    const getStartDateTime = (reservation) => {
      const baseDate = new Date(reservation.data_reserva);
      const [hours, minutes, seconds = 0] = String(
        reservation.hora_inici || "00:00:00"
      )
        .split(":")
        .map(Number);

      const result = new Date(baseDate);
      result.setHours(hours, minutes, seconds, 0);
      return result;
    };

    sorted.sort((a, b) => {
      const aStart = getStartDateTime(a).getTime();
      const bStart = getStartDateTime(b).getTime();

      if (filter === "active") {
        return aStart - bStart;
      }

      return bStart - aStart;
    });

    return sorted;
  };

  const filteredReservations = useMemo(() => {
    let baseList = reservations;

    if (activeFilter === "active") baseList = activeReservations;
    else if (activeFilter === "past") baseList = pastReservations;
    else if (activeFilter === "cancelled") baseList = cancelledReservations;

    if (selectedDate) {
      baseList = baseList.filter(
        (reservation) =>
          normalizeReservationDateForFilter(reservation.data_reserva) === selectedDate
      );
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch) {
      baseList = baseList.filter((reservation) => {
        const normalizedCourt = String(reservation.nom_pista || "").toLowerCase();
        const normalizedCode = String(reservation.codi_reserva || "").toLowerCase();

        return (
          normalizedCourt.includes(normalizedSearch) ||
          normalizedCode.includes(normalizedSearch)
        );
      });
    }

    return sortReservationsForView(baseList, activeFilter);
  }, [
    activeFilter,
    reservations,
    activeReservations,
    pastReservations,
    cancelledReservations,
    selectedDate,
    searchTerm,
  ]);

  const filterLabel = useMemo(() => {
    if (activeFilter === "active") return "Actives";
    if (activeFilter === "past") return "Finalitzades";
    if (activeFilter === "cancelled") return "Cancel·lades";
    return "Totals";
  }, [activeFilter]);

  const currentSectionTitle = useMemo(() => {
    if (activeFilter === "active") return "Reserves actives";
    if (activeFilter === "past") return "Reserves finalitzades";
    if (activeFilter === "cancelled") return "Reserves cancel·lades";
    return "Totes les reserves";
  }, [activeFilter]);

  const currentSectionText = useMemo(() => {
    if (activeFilter === "active") {
      return "Aquí tens les reserves futures que encara pots gestionar o cancel·lar.";
    }

    if (activeFilter === "past") {
      return "Aquí tens les reserves que ja s'han completat i que pots repetir o eliminar de l'historial.";
    }

    if (activeFilter === "cancelled") {
      return "Aquí tens les reserves cancel·lades que encara vols conservar o eliminar.";
    }

    return "Aquí tens tot l'historial complet de reserves.";
  }, [activeFilter]);

  const activeFilterTags = useMemo(() => {
    const tags = [];

    if (activeFilter === "active") tags.push("Només actives");
    if (activeFilter === "past") tags.push("Només finalitzades");
    if (activeFilter === "cancelled") tags.push("Només cancel·lades");
    if (selectedDate) tags.push(`Data: ${selectedDate}`);
    if (searchTerm.trim()) tags.push(`Cerca: ${searchTerm.trim()}`);

    return tags;
  }, [activeFilter, selectedDate, searchTerm]);

  const filterOptions = [
    { value: "all", label: "Totes", count: reservations.length },
    { value: "active", label: "Actives", count: activeReservations.length },
    { value: "past", label: "Finalitzades", count: pastReservations.length },
    {
      value: "cancelled",
      label: "Cancel·lades",
      count: cancelledReservations.length,
    },
  ];

  return (
    <div className="my-res__page">
      <div
        className={`my-res__container ${isMobileView ? "my-res__container--mobile" : ""}`}
      >
        <section
          className={`fade-in-up my-res__hero ${isMobileView ? "my-res__hero--mobile" : ""}`}
        >
          <div
            className={`my-res__hero-grid ${isMobileView ? "my-res__hero-grid--mobile" : ""}`}
          >
            <div>
              <span className="pb-kicker">Gestió de reserves</span>
              <h1
                className={`my-res__title ${isMobileView ? "my-res__title--mobile" : ""}`}
              >
                Les meves reserves
              </h1>
              <p className="my-res__subtitle">
                Consulta el teu historial, revisa les reserves actives i gestiona
                les cancel·lacions dins una vista més ordenada i agradable.
              </p>
            </div>

            {!loading && !error && reservations.length > 0 && (
              <div className="my-res__hero-stats">
                <div className="my-res__stat-card">
                  <span className="my-res__stat-number">{reservations.length}</span>
                  <span className="my-res__stat-label">Reserves totals</span>
                </div>

                <div className="my-res__stat-card">
                  <span className="my-res__stat-number">{activeReservations.length}</span>
                  <span className="my-res__stat-label">Actives</span>
                </div>

                <div className="my-res__stat-card">
                  <span className="my-res__stat-number">
                    {cancelledReservations.length}
                  </span>
                  <span className="my-res__stat-label">Cancel·lades</span>
                </div>
                <div className="my-res__stat-card">
                    <span className="my-res__stat-number">{pastReservations.length}</span>
                    <span className="my-res__stat-label">Finalitzades</span>
                  </div>
              </div>
            )}
          </div>
        </section>

        <div ref={topFeedbackRef} />

        {feedback && (
          <section className="scale-in my-res__feedback-section">
            <div
              className={`pb-feedback ${
                feedbackType === "success"
                  ? "pb-feedback--success"
                  : "pb-feedback--error"
              }`}
            >
              <p className="pb-feedback__text">{feedback}</p>
            </div>
          </section>
        )}

        {loading && (
          <LoadingSpinner
            text="Carregant les teves reserves..."
            minHeight="240px"
          />
        )}

        {error && (
          <section className="scale-in my-res__feedback-section">
            <div className="pb-feedback pb-feedback--error my-res__error-wrapper">
              <p className="my-res__error-title">No s'han pogut carregar les reserves</p>
              <p className="my-res__error-text">{error}</p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={fetchReservations}
              >
                Tornar-ho a intentar
              </button>
            </div>
          </section>
        )}

        {!loading && !error && reservations.length > 0 && (
          <>
            <section
              ref={summaryRef}
              className="fade-in-up delay-1 pb-surface-card my-res__summary-section"
            >
              <div
                className={`my-res__section-header ${isMobileView ? "my-res__section-header--mobile" : ""}`}
              >
                <div>
                  <h2 className="pb-panel-title">Historial de reserves</h2>
                  <p className="pb-panel-text">
                    Filtra ràpidament entre totes les reserves, les actives i
                    les cancel·lades.
                  </p>
                </div>

                <div className="my-res__summary-total">
                  <span className="pb-badge pb-badge--primary">
                    {filteredReservations.length} Totals
                  </span>
                </div>
              </div>

              <div className="my-res__tools-row">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cercar per codi o pista"
                  className="my-res__search-input"
                />

                <label className="my-res__date-field">
                  <span className="my-res__date-label">Filtrar per data</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="my-res__date-filter"
                  />
                </label>

                {(selectedDate || searchTerm) && (
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => {
                      setSelectedDate("");
                      setSearchTerm("");
                    }}
                  >
                    Netejar
                  </button>
                )}
              </div>

              <div ref={segmentedRef}>
                <select
                  className="my-res__mobile-filter-select"
                  value={activeFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  aria-label="Filtrar reserves"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count})
                    </option>
                  ))}
                </select>

                <div
                  className={`my-res__segmented ${isMobileView ? "my-res__segmented--mobile" : ""}`}
                >
                <button
                  type="button"
                  className={`my-res__segmented-btn ${
                    activeFilter === "all" ? "is-active" : ""
                  }`}
                  onClick={() => handleFilterChange("all")}
                >
                  <span className="my-res__segmented-label">Totes</span>
                  <span className="my-res__segmented-count">{reservations.length}</span>
                </button>

                <button
                  type="button"
                  className={`my-res__segmented-btn ${
                    activeFilter === "active" ? "is-active" : ""
                  }`}
                  onClick={() => handleFilterChange("active")}
                >
                  <span className="my-res__segmented-label">Actives</span>
                  <span className="my-res__segmented-count">{activeReservations.length}</span>
                </button>

                <button
                    type="button"
                    className={`my-res__segmented-btn ${
                      activeFilter === "past" ? "is-active" : ""
                    }`}
                    onClick={() => handleFilterChange("past")}
                  >
                    <span className="my-res__segmented-label">Finalitzades</span>
                    <span className="my-res__segmented-count">{pastReservations.length}</span>
                  </button>

                <button
                  type="button"
                  className={`my-res__segmented-btn ${
                    activeFilter === "cancelled" ? "is-active" : ""
                  }`}
                  onClick={() => handleFilterChange("cancelled")}
                >
                  <span className="my-res__segmented-label">Cancel·lades</span>
                  <span className="my-res__segmented-count">{cancelledReservations.length}</span>
                </button>
                </div>
              </div>
            </section>

            {filteredReservations.length > 0 ? (
              <>
                <section className="fade-in-up delay-2 my-res__results-head">
                  <div className="my-res__results-head-top">
                    <div>
                      <span className="pb-kicker">{filterLabel}</span>
                      <h3 className="my-res__results-title">{currentSectionTitle}</h3>
                      <p className="my-res__results-text">{currentSectionText}</p>
                    </div>

                    <Link to="/availability" className="btn btn-primary">
                      Fer nova reserva
                    </Link>
                  </div>

                  <div className="my-res__results-summary">
                    <span className="my-res__results-summary-text">
                      Mostrant <strong>{filteredReservations.length}</strong> resultat/s
                    </span>

                    {activeFilterTags.length > 0 && (
                      <div className="my-res__active-tags">
                        {activeFilterTags.map((tag) => (
                          <span key={tag} className="my-res__active-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="fade-in-up delay-2 my-res__grid">
                  {filteredReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className={
                        recentlyCancelledReservationId === reservation.id
                          ? "my-res__recently-cancelled-wrapper"
                          : undefined
                      }
                    >
                      <ReservationCard
                        reservation={reservation}
                        onCancel={handleCancel}
                        onDeleteCancelled={handleDeleteCancelled}
                        onRepeatReservation={handleRepeatReservation}
                        isCancelling={cancellingReservationId === reservation.id}
                        isDeletingCancelled={
                          deletingCancelledReservationId === reservation.id
                        }
                        confirmingCancel={confirmingReservationId === reservation.id}
                        onStartCancel={setConfirmingReservationId}
                        onAbortCancel={() => setConfirmingReservationId(null)}
                      />
                    </div>
                  ))}
                </section>
              </>
            ) : (
              <section className="scale-in pb-surface-card my-res__filtered-empty-state">
                <span className="my-res__filtered-empty-icon">
                  {searchTerm ? "🔍" : selectedDate ? "📅" : "📭"}
                </span>
                <h3 className="my-res__filtered-empty-title">
                  No s'han trobat resultats
                </h3>
                <p className="my-res__filtered-empty-text">
                  {searchTerm
                    ? `No hi ha cap reserva que coincideixi amb "${searchTerm}".`
                    : selectedDate
                    ? "No tens reserves per aquesta data."
                    : activeFilter !== "all"
                    ? "No tens reserves en aquest estat."
                    : "No hi ha resultats amb els filtres aplicats."}
                </p>

                <div className="my-res__filtered-empty-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedDate("");
                      handleFilterChange("all");
                    }}
                  >
                    Netejar filtres
                  </button>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <Link to="/availability" className="btn btn-light">
                    Fer una nova reserva
                  </Link>
                </div>
              </section>
            )}
          </>
        )}

        {!loading && !error && reservations.length === 0 && (
          <section className="scale-in pb-surface-card my-res__empty-state">
            <span className="my-res__empty-icon">📅</span>
            <h3 className="my-res__empty-title">
              Encara no has fet cap reserva
            </h3>
            <p className="my-res__empty-text">
              Quan facis la teva primera reserva, aquí podràs veure tot l’historial,
              consultar la informació i gestionar-la fàcilment.
            </p>

            <div
              className={`my-res__empty-actions ${isMobileView ? "my-res__empty-actions--mobile" : ""}`}
            >
              <Link
                to="/availability"
                className="btn btn-primary"
              >
                Veure disponibilitat
              </Link>

              <Link
                to="/"
                className="btn btn-light"
              >
                Tornar a inici
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default MyReservationsPage;
