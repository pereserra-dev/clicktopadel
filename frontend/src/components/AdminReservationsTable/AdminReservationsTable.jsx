import { useMemo, useRef, useState } from "react";
import api from "../../api/axios";
import "./AdminReservationsTable.css";

function AdminReservationsTable({ reservations = [] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("totes");

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const reservationCardRefs = useRef({});
  const expandedDetailRefs = useRef({});
  const [closingReservationId, setClosingReservationId] = useState(null);

  // Normalitza i ordena les reserves per data i hora de forma descendente
  const normalizedReservations = useMemo(() => {
    return [...reservations].sort((a, b) => {
      const dateA = new Date(
        `${a.data_reserva || ""}T${a.hora_inici || "00:00"}`
      ).getTime();
      const dateB = new Date(
        `${b.data_reserva || ""}T${b.hora_inici || "00:00"}`
      ).getTime();
      return dateB - dateA;
    });
  }, [reservations]);


// Funcions auxiliars per formatar i etiquetar dades de manera consistent
 function paymentMethodLabel(method) {
  if (method === "online_simulat") return "Pagament online";
  if (method === "al_club") return "Pagament al club";
  return "No definit";
}

// Funció per convertir l'estat de pagament a una etiqueta llegible
function paymentStatusLabel(status) {
  if (status === "pagat") return "Pagat";
  if (status === "pendent") return "Pendent";
  return "No definit";
}

// Funció per formatar la data en un format llegible i consistent
function formatDate(date) {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("ca-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Funció per formatar l'hora en format HH:mm, assumint que el valor d'entrada és una cadena "HH:mm:ss" o similar
function formatTime(time) {
  if (!time) return "-";
  return String(time).slice(0, 5);
}

  // Filtra les reserves basant-se en la cerca i l'estat seleccionat, combinant múltiples camps per una cerca més completa
  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return normalizedReservations.filter((reservation) => {
      const userName = (reservation.nom_usuari || "").toLowerCase();
      const email = (reservation.email || "").toLowerCase();
      const courtName = (reservation.nom_pista || "").toLowerCase();
      const reservationCode = (reservation.codi_reserva || "").toLowerCase();
      const status = (reservation.estat || "").toLowerCase();
      const paymentStatus = (reservation.estat_pagament || "").toLowerCase();
      const paymentMethod = (reservation.metode_pagament || "").toLowerCase();
      const formattedPaymentMethod = paymentMethodLabel(
        reservation.metode_pagament
      ).toLowerCase();
      const formattedPaymentStatus = paymentStatusLabel(
        reservation.estat_pagament
      ).toLowerCase();
      const formattedDate = formatDate(reservation.data_reserva).toLowerCase();
      const startTime = formatTime(reservation.hora_inici).toLowerCase();
      const endTime = formatTime(reservation.hora_fi).toLowerCase();
      const fullTimeRange = `${startTime} - ${endTime}`.toLowerCase();

      const reservationPrice =
        reservation.preu_total != null
          ? `${Number(reservation.preu_total).toFixed(2)} €`
          : reservation.preu != null
            ? `${Number(reservation.preu).toFixed(2)} €`
            : "-";

      const priceText = reservationPrice.toLowerCase();

      const searchableText = [
        userName,
        email,
        courtName,
        reservationCode,
        status,
        paymentStatus,
        paymentMethod,
        formattedPaymentMethod,
        formattedPaymentStatus,
        formattedDate,
        startTime,
        endTime,
        fullTimeRange,
        priceText,
      ].join(" ");

      const matchesSearch = !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "totes" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [normalizedReservations, search, statusFilter]);

  // Comptabilitza el nombre de reserves actives i cancel·lades per mostrar un resum a l'usuari
  const activeCount = useMemo(() => {
    return reservations.filter((reservation) => {
      const status = (reservation.estat || "").toLowerCase();
      return status === "activa" || status === "active";
    }).length;
  }, [reservations]);

  // Comptabilitza el nombre de reserves cancel·lades basant-se en l'estat de la reserva, assumint que qualsevol estat que no sigui "activa" o "active" es considera cancel·lat
  const cancelledCount = useMemo(() => {
    return reservations.filter((reservation) => {
      const status = (reservation.estat || "").toLowerCase();
      return status !== "activa" && status !== "active";
    }).length;
  }, [reservations]);

  // Funció per restablir els filtres a les seves condicions inicials, facilitant a l'usuari tornar a la vista completa de les reserves
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("totes");
  };

  const scrollToReservationCard = (reservationId) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const reservationCard = reservationCardRefs.current[reservationId];

        if (reservationCard) {
          const topOffset = 132;
          const cardTop =
            reservationCard.getBoundingClientRect().top + window.scrollY - topOffset;

          window.scrollTo({
            top: Math.max(cardTop, 0),
            behavior: "smooth",
          });
        }
      }, 80);
    });
  };

  const scrollToExpandedDetail = (reservationId) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const expandedDetail = expandedDetailRefs.current[reservationId];

        if (expandedDetail) {
          const topOffset = 132;
          const detailTop =
            expandedDetail.getBoundingClientRect().top + window.scrollY - topOffset;

          window.scrollTo({
            top: Math.max(detailTop, 0),
            behavior: "smooth",
          });
        }
      }, 180);
    });
  };

  const closeReservationDetail = (reservationId = selectedReservation?.id) => {
    if (!reservationId) return;

    scrollToReservationCard(reservationId);
    setClosingReservationId(reservationId);

    window.setTimeout(() => {
      setSelectedReservation((current) =>
        current?.id === reservationId ? null : current
      );
      setClosingReservationId((current) =>
        current === reservationId ? null : current
      );
    }, 280);
  };

  const handleViewReservationDetail = async (id) => {
    if (selectedReservation?.id === id) {
      closeReservationDetail(id);
      return;
    }

    try {
      setDetailLoadingId(id);
      setClosingReservationId(null);

      const res = await api.get(`/admin/reservations/${id}`);
      const reservationDetail = res.data?.data || res.data;

      setSelectedReservation(reservationDetail);

      scrollToExpandedDetail(id);
    } catch (err) {
      console.error(err);
      alert("Error carregant el detall de la reserva");
    } finally {
      setDetailLoadingId(null);
    }
  };

  // Funcions per determinar les classes CSS basades en els valors dels camps, permetent una estilització condicional que millora la llegibilitat i l'impacte visual de la informació mostrada
  const getReservationStatusClass = (value) => {
    const normalized = (value || "").toLowerCase();
    return normalized === "activa" || normalized === "active"
      ? "admin-res__pill admin-res__pill--active"
      : "admin-res__pill admin-res__pill--cancelled";
  };

  // Funció per determinar la classe CSS de l'estat de pagament, destacant visualment les reserves pagades i pendents
  const getPaymentStatusClass = (value) => {
    const normalized = (value || "").toLowerCase();
    return normalized === "pagat"
      ? "admin-res__pill admin-res__pill--paid"
      : "admin-res__pill admin-res__pill--pending";
  };

  // Funció per determinar la classe CSS de la forma de pagament, diferenciant visualment entre pagaments online i al club
  const getPaymentMethodClass = (value) => {
    const normalized = (value || "").toLowerCase();
    return normalized === "online_simulat"
      ? "admin-res__pill admin-res__pill--info"
      : "admin-res__pill admin-res__pill--neutral";
  };

  // Si no hi ha reserves, mostra un estat buit amb un missatge informatiu i una icona, animant a l'usuari a esperar que arribin les reserves o a revisar la configuració del sistema
  if (!reservations.length) {
    return (
      <div className="admin-res__empty-state">
        <span className="admin-res__empty-icon">📋</span>
        <h3 className="admin-res__empty-title">No hi ha reserves registrades</h3>
        <p className="admin-res__empty-text">
          Quan els usuaris facin reserves, apareixeran aquí perquè les puguis
          consultar des del panell d&apos;administració.
        </p>
      </div>
    );
  }

  const renderExpandedDetail = (reservationId) => {
    const shouldRender =
      selectedReservation?.id === reservationId ||
      closingReservationId === reservationId;

    if (!shouldRender) return null;

    const r = selectedReservation;

    if (!r || r.id !== reservationId) return null;

    return (
      <div
        className={`admin-res__expandable-wrap ${
          closingReservationId === reservationId
            ? "admin-res__expandable-wrap--closing"
            : ""
        }`}
        ref={(node) => {
          if (node) {
            expandedDetailRefs.current[reservationId] = node;
          } else {
            delete expandedDetailRefs.current[reservationId];
          }
        }}
      >
        <div className="admin-res__expandable-card">
          <div className="admin-res__expandable-head">
            <div className="admin-res__expandable-title-block">
              <span className="admin-res__expandable-kicker">
                Detall de reserva
              </span>
              <h4 className="admin-res__expandable-title">
                {r.codi_reserva || "Sense codi"}
              </h4>
            </div>

            <button
              type="button"
              className="btn btn-light btn-sm admin-res__expandable-close"
              onClick={() => closeReservationDetail(reservationId)}
            >
              Amagar detall
            </button>
          </div>

          <div className="admin-res__expandable-summary">
            <span className={getReservationStatusClass(r.estat)}>
              {r.estat || "Sense estat"}
            </span>
            <span className={getPaymentStatusClass(r.estat_pagament)}>
              {paymentStatusLabel(r.estat_pagament)}
            </span>
            <span className={getPaymentMethodClass(r.metode_pagament)}>
              {paymentMethodLabel(r.metode_pagament)}
            </span>
          </div>

          <div className="admin-res__expandable-grid">
            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Usuari</span>
              <span className="admin-res__expandable-value">
                {r.usuari_nom || "-"}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Email</span>
              <span className="admin-res__expandable-value">
                {r.usuari_email || "-"}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Telèfon</span>
              <span className="admin-res__expandable-value">
                {r.usuari_telefon || "-"}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Pista</span>
              <span className="admin-res__expandable-value">
                {r.nom_pista || "-"}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Franja</span>
              <span className="admin-res__expandable-value">
                {formatTime(r.hora_inici)} - {formatTime(r.hora_fi)}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Data</span>
              <span className="admin-res__expandable-value">
                {formatDate(r.data_reserva)}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">Import</span>
              <span className="admin-res__expandable-value admin-res__expandable-value--price">
                {r.preu_total != null ? `${Number(r.preu_total).toFixed(2)} €` : "-"}
              </span>
            </div>

            <div className="admin-res__expandable-item">
              <span className="admin-res__expandable-label">
                Data de creació
              </span>
              <span className="admin-res__expandable-value">
                {r.created_at
                  ? new Date(r.created_at).toLocaleString("ca-ES")
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="admin-res__wrapper">
      <div className="admin-res__header">
        <div>
          <span className="admin-res__eyebrow">Control administratiu</span>
          <h3 className="admin-res__title">Reserves registrades</h3>
          <p className="admin-res__subtitle">
            Vista clara de les reserves del sistema, amb filtres simples i una
            lectura molt més ràpida.
          </p>
        </div>

        <span className="admin-res__count-badge">
          {filteredReservations.length} visibles
        </span>
      </div>

      <div className="admin-res__summary-grid">
        <article className="admin-res__summary-card">
          <span className="admin-res__summary-label">Totals</span>
          <span className="admin-res__summary-value">{reservations.length}</span>
        </article>

        <article className="admin-res__summary-card">
          <span className="admin-res__summary-label">Actives</span>
          <span className="admin-res__summary-value">{activeCount}</span>
        </article>

        <article className="admin-res__summary-card">
          <span className="admin-res__summary-label">Cancel·lades</span>
          <span className="admin-res__summary-value">{cancelledCount}</span>
        </article>

        <article className="admin-res__summary-card">
          <span className="admin-res__summary-label">Mostrades</span>
          <span className="admin-res__summary-value">{filteredReservations.length}</span>
        </article>
      </div>

      <div className="admin-res__tools-grid">
        <div className="admin-res__field admin-res__field--search">
          <label htmlFor="reservationSearch" className="admin-res__label">
            Cercar reserva
          </label>
          <input
            id="reservationSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Codi, usuari, correu o pista..."
            className="pb-input"
          />
        </div>

        <div className="admin-res__field">
          <label htmlFor="reservationStatus" className="admin-res__label">
            Estat
          </label>
          <select
            id="reservationStatus"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pb-input"
          >
            <option value="totes">Totes</option>
            <option value="activa">Actives</option>
            <option value="cancel·lada">Cancel·lades</option>
          </select>
        </div>

        <div className="admin-res__field-action">
          <button type="button" className="btn btn-light" onClick={clearFilters}>
            Netejar filtres
          </button>
        </div>
      </div>

      {filteredReservations.length > 0 ? (
        <div className="admin-res__list">
          {filteredReservations.map((reservation) => {
            const formattedDate = formatDate(reservation.data_reserva);
            const reservationPrice =
              reservation.preu_total != null
                ? `${Number(reservation.preu_total).toFixed(2)} €`
                : reservation.preu != null
                  ? `${Number(reservation.preu).toFixed(2)} €`
                  : "-";

            const isExpanded = selectedReservation?.id === reservation.id;
            const isLoadingThisDetail = detailLoadingId === reservation.id;

            return (
              <article
                key={reservation.id}
                className="admin-res__card"
                ref={(node) => {
                  if (node) {
                    reservationCardRefs.current[reservation.id] = node;
                  } else {
                    delete reservationCardRefs.current[reservation.id];
                  }
                }}
              >
                <div className="admin-res__card-top">
                  <div className="admin-res__identity-block">
                    <span className="admin-res__code-badge">
                      {reservation.codi_reserva || "Sense codi"}
                    </span>

                    <div className="admin-res__user-row">
                      <span className="admin-res__user-avatar">
                        {(reservation.nom_usuari || reservation.email || "U").charAt(0).toUpperCase()}
                      </span>

                      <div className="admin-res__user-meta">
                        <p className="admin-res__primary-text">
                          {reservation.nom_usuari || "Usuari sense nom"}
                        </p>
                        <p className="admin-res__secondary-text admin-res__secondary-text--compact">
                          {reservation.email || "Correu no disponible"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-res__status-stack">
                    <span className={getReservationStatusClass(reservation.estat)}>
                      {reservation.estat || "Sense estat"}
                    </span>
                    <span className={getPaymentStatusClass(reservation.estat_pagament)}>
                      {paymentStatusLabel(reservation.estat_pagament)}
                    </span>
                  </div>
                </div>

                <div className="admin-res__details-grid">
                  <div className="admin-res__detail-item">
                    <span className="admin-res__detail-label">Pista</span>
                    <span className="admin-res__detail-value">
                      {reservation.nom_pista || "No indicada"}
                    </span>
                  </div>

                  <div className="admin-res__detail-item">
                    <span className="admin-res__detail-label">Data</span>
                    <span className="admin-res__detail-value">{formattedDate}</span>
                  </div>

                  <div className="admin-res__detail-item">
                    <span className="admin-res__detail-label">Hora</span>
                    <span className="admin-res__time-badge">
                      {formatTime(reservation.hora_inici)} - {formatTime(reservation.hora_fi)}
                    </span>
                  </div>

                  <div className="admin-res__detail-item">
                    <span className="admin-res__detail-label">Import</span>
                    <span className="admin-res__detail-value admin-res__detail-value--price">
                      {reservationPrice}
                    </span>
                  </div>
                </div>

                <div className="admin-res__card-footer">
                  <div className="admin-res__card-footer-row">
                    <button
                      type="button"
                      className={`btn btn-light admin-res__toggle-detail-btn ${
                        isExpanded ? "admin-res__toggle-detail-btn--active" : ""
                      }`}
                      onClick={() => handleViewReservationDetail(reservation.id)}
                    >
                      {isLoadingThisDetail
                        ? "Carregant..."
                        : isExpanded
                          ? "Amagar detall"
                          : "Veure detall"}
                    </button>

                    <div className="admin-res__payment-block">
                      <span className="admin-res__payment-label">Forma de pagament</span>

                      <span
                        className={`admin-res__payment-method ${
                          reservation.metode_pagament === "online_simulat"
                            ? "admin-res__payment-method--online"
                            : "admin-res__payment-method--club"
                        }`}
                      >
                        {reservation.metode_pagament === "online_simulat"
                          ? "Pagament online"
                          : reservation.metode_pagament === "al_club"
                            ? "Pagament al club"
                            : paymentMethodLabel(reservation.metode_pagament)}
                      </span>
                    </div>
                  </div>
                </div>

                {renderExpandedDetail(reservation.id)}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-res__empty-filtered-state">
          <p className="admin-res__empty-filtered-title">No s&apos;ha trobat cap reserva</p>
          <p className="admin-res__empty-filtered-text">
            Ajusta la cerca o l&apos;estat seleccionat per tornar a veure resultats.
          </p>

          <button type="button" className="btn btn-light" onClick={clearFilters}>
            Mostrar totes les reserves
          </button>
        </div>
      )}
    </div>
    </>
  );
}

export default AdminReservationsTable;
