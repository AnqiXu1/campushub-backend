import type { ReactElement } from "react";

import type { UiError } from "../types/ui.ts";
import styles from "./ErrorAlert.module.css";

interface ErrorAlertProps {
  readonly error: UiError;
}

const ErrorAlert = ({ error }: ErrorAlertProps): ReactElement => {
  const className: string = error.isConflict
    ? `${styles["alert"]} ${styles["conflict"]}`
    : `${styles["alert"]}`;
  return (
    <div role="alert" className={className}>
      <strong className={styles["title"]}>{error.isConflict ? "Booking conflict" : "Error"}</strong>
      <span>{error.message}</span>
    </div>
  );
};

export default ErrorAlert;
