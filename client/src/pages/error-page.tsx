import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import styles from './error-page.module.css';

/**
 * Safely serialises an unknown value to a JSON string.
 * Handles circular references and non-serialisable values without throwing.
 *
 * Uses a recursive ancestor-stack approach so that shared (non-circular)
 * object references are serialised correctly at every occurrence; only true
 * back-edges in the object graph are replaced with the '[Circular]' sentinel.
 */
function safeSerialize(value: unknown): string {
  function toSerializable(val: unknown, ancestors: object[]): unknown {
    // Error objects have non-enumerable properties — extract them explicitly
    // so they are not silently omitted (JSON.stringify(new Error()) → '{}')
    if (val instanceof Error) {
      if (ancestors.includes(val)) return '[Circular]';
      const nextAncestors = [...ancestors, val];
      // Iterate own enumerable properties to capture custom fields (e.g. `code`)
      const ownProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        ownProps[k] = toSerializable(v, nextAncestors);
      }
      return {
        name: val.name,
        message: val.message,
        ...(val.stack ? { stack: val.stack } : {}),
        ...ownProps,
      };
    }
    if (typeof val === 'object' && val !== null) {
      // Back-edge in the current call-stack path → truly circular
      if (ancestors.includes(val)) return '[Circular]';
      const nextAncestors = [...ancestors, val];
      if (Array.isArray(val)) {
        return val.map((item) => toSerializable(item, nextAncestors));
      }
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        result[k] = toSerializable(v, nextAncestors);
      }
      return result;
    }
    return val;
  }

  try {
    return JSON.stringify(toSerializable(value, []));
  } catch {
    return '[Unserializable Error Data]';
  }
}

export default function ErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Unexpected Error';

  let message: string;
  let isSerializedJson = false;

  if (isRouteErrorResponse(error)) {
    if (typeof error.data === 'string') {
      message = error.data;
    } else if (
      typeof error.data === 'object' &&
      error.data !== null &&
      'message' in error.data &&
      typeof (error.data as Record<string, unknown>).message === 'string'
    ) {
      message = (error.data as { message: string }).message;
    } else if (error.data != null) {
      message = safeSerialize(error.data);
      isSerializedJson = true;
    } else {
      message = 'Something went wrong.';
    }
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = 'An unknown error occurred.';
  }

  return (
    <main className={styles.page}>
      <h1>{title}</h1>
      {isSerializedJson ? (
        <pre className={styles.errorDetail}>{message}</pre>
      ) : (
        <p className={styles.description}>{message}</p>
      )}
      {/* Use a full-page navigation anchor so all React state is discarded on fatal errors */}
      <a className="link" href="/">
        Go home
      </a>
    </main>
  );
}
