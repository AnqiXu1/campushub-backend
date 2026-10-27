import { useState, type ChangeEvent, type ReactElement } from "react";

import { useResources } from "../hooks/use-resources.ts";
import type { Resource, ResourceType } from "../types/api.ts";
import ErrorAlert from "./ErrorAlert.tsx";
import styles from "./ResourceList.module.css";

const ALL_TYPES = "ALL";
const FILTER_OPTIONS: readonly (ResourceType | typeof ALL_TYPES)[] = [
  ALL_TYPES,
  "ROOM",
  "EQUIPMENT",
  "LAB",
];

type TypeFilter = ResourceType | typeof ALL_TYPES;

const isTypeFilter = (value: string): value is TypeFilter => {
  return FILTER_OPTIONS.some((option: TypeFilter): boolean => option === value);
};

interface ResourceListProps {
  readonly selectedResourceId: string | null;
  readonly onSelect: (resource: Resource) => void;
}

const ResourceList = ({ selectedResourceId, onSelect }: ResourceListProps): ReactElement => {
  const [filter, setFilter] = useState<TypeFilter>(ALL_TYPES);
  const {
    data: resources,
    isLoading,
    error,
    reload,
  } = useResources(filter === ALL_TYPES ? undefined : filter);

  const handleFilterChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const value: string = event.target.value;
    if (isTypeFilter(value)) {
      setFilter(value);
    }
  };

  return (
    <section className={styles["section"]} aria-busy={isLoading}>
      <header className={styles["header"]}>
        <h2 className={styles["heading"]}>Resources</h2>
        <label className={styles["filter"]}>
          Type
          <select value={filter} onChange={handleFilterChange}>
            {FILTER_OPTIONS.map((option: TypeFilter): ReactElement => (
              <option key={option} value={option}>
                {option === ALL_TYPES ? "All types" : option}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error !== null && (
        <div className={styles["feedback"]}>
          <ErrorAlert error={error} />
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {isLoading && <p className={styles["status"]}>Loading resources...</p>}
      {!isLoading && error === null && resources.length === 0 && (
        <p className={styles["status"]}>No resources found.</p>
      )}

      <ul className={styles["grid"]}>
        {resources.map((resource: Resource): ReactElement => (
          <li
            key={resource.id}
            className={
              resource.id === selectedResourceId
                ? `${styles["card"]} ${styles["selected"]}`
                : `${styles["card"]}`
            }
          >
            <div className={styles["cardHeader"]}>
              <h3 className={styles["name"]}>{resource.name}</h3>
              <span className={styles["type"]}>{resource.type}</span>
            </div>
            <p className={styles["location"]}>{resource.location}</p>
            <div className={styles["cardFooter"]}>
              <span className={resource.isAvailable ? styles["open"] : styles["closed"]}>
                {resource.isAvailable ? "Available" : "Unavailable"}
              </span>
              <button
                type="button"
                disabled={!resource.isAvailable}
                onClick={(): void => onSelect(resource)}
              >
                {resource.id === selectedResourceId ? "Selected" : "Book"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ResourceList;
