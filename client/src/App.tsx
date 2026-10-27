import { useState, type ReactElement } from "react";

import styles from "./App.module.css";
import BookingForm from "./components/BookingForm.tsx";
import ResourceList from "./components/ResourceList.tsx";
import UserReservations from "./components/UserReservations.tsx";
import type { Resource } from "./types/api.ts";

/** The API is unauthenticated for now, so the app acts as a single fixed student. */
const CURRENT_USER_ID: string = "user-456";

const App = (): ReactElement => {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  return (
    <main className={styles["layout"]}>
      <h1 className={styles["title"]}>CampusHub</h1>
      <div className={styles["columns"]}>
        <ResourceList
          selectedResourceId={selectedResource === null ? null : selectedResource.id}
          onSelect={setSelectedResource}
        />
        <div className={styles["side"]}>
          <BookingForm
            resource={selectedResource}
            userId={CURRENT_USER_ID}
            onBooked={(): void => setRefreshKey((key: number): number => key + 1)}
          />
          <UserReservations userId={CURRENT_USER_ID} refreshKey={refreshKey} />
        </div>
      </div>
    </main>
  );
};

export default App;
