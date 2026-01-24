import { useMemo } from "react";
import type { WishlistItem, Reservation } from "./types";

interface ReservationsModalProps {
  isOpen: boolean;
  reservations: Map<number, Reservation>;
  items: WishlistItem[];
  cdnDomain: string;
  onClose: () => void;
}

export function ReservationsModal({
  isOpen,
  reservations,
  items,
  cdnDomain,
  onClose,
}: ReservationsModalProps) {
  // Group reservations by user
  const reservationsByUser = useMemo(() => {
    const grouped = new Map<
      string,
      { reservation: Reservation; item: WishlistItem }[]
    >();

    reservations.forEach((reservation) => {
      const item = items.find((i) => i.id === reservation.itemId);
      if (!item) return;

      const user = reservation.reservedBy;
      if (!grouped.has(user)) {
        grouped.set(user, []);
      }
      grouped.get(user)!.push({ reservation, item });
    });

    // Sort by user name
    return new Map(
      [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    );
  }, [reservations, items]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal reservations-modal">
        <div className="modal-header">
          <h2>Reservations by User</h2>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="modal-body">
          {reservationsByUser.size === 0 ? (
            <p className="no-items">No reservations yet.</p>
          ) : (
            <div className="reservations-list">
              {[...reservationsByUser.entries()].map(([user, userItems]) => (
                <div key={user} className="reservation-group">
                  <div className="reservation-user">
                    <span className="user-name">
                      {user === "admin" ? "Admin" : user}
                    </span>
                    <span className="user-count">
                      {userItems.length} item{userItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="reservation-items">
                    {userItems.map(({ item }) => (
                      <div key={item.id} className="reservation-item">
                        <img
                          src={`https://${cdnDomain}/${item.imageUrl}`}
                          alt={item.title}
                        />
                        <div className="reservation-item-info">
                          <span className="reservation-item-title">
                            {item.title}
                          </span>
                          <span className="reservation-item-price">
                            {item.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
