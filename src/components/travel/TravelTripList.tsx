import type { ReactNode } from 'react';
import "flag-icons/css/flag-icons.min.css";
import { trips } from "@lib/travel";
import styles from './TravelTripList.module.css';

export default () => {
  const getCountryFlag = (code: string): ReactNode => {
    const parts = code.split("-");
    if (parts.length > 1) {
      return (
        <div className={styles.multiple}>
          <div className={[styles.flag, "fi", `fi-${parts[0]}`].join(' ')} />
          <div className={[styles.flag, "fi", `fi-${code}`].join(' ')} />
        </div>
      );
    }

    return <span className={[styles.flag, "fi", `fi-${code}`].join(' ')} />;
  };
  return (
    <div>
      {
        trips.map((trip) => {
          return (
            <div className={styles.trip}>
              <div className={styles.date}>{trip.date}</div>
              <div className={styles.destination}>
                {trip.destination.map((destination) => (
                  <>
                    <div className={styles.city}>
                      {getCountryFlag(destination.country[0])}
                      {destination.city}
                    </div>
                  </>
                ))}
              </div>
            </div>
          );
        })
      }
    </div>
  );
}