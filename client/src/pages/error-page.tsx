import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';

/**
 * Safely serialises an unknown value to a JSON string.
 * Handles circular references and non-serialisable values without throwing.
 */
function safeSerialize(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_, v: unknown) => {
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v as object)) return '[Circular]';
        seen.add(v as object);
      }
      return v;
    });
  } catch {
    return '[Unserializable Error Data]';
  }
}

export default function ErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Unexpected Error';

  const message = isRouteErrorResponse(error)
    ? typeof error.data === 'string'
      ? error.data
      : typeof error.data === 'object' &&
          error.data !== null &&
          'message' in error.data &&
          typeof (error.data as Record<string, unknown>).message === 'string'
        ? (error.data as { message: string }).message
        : error.data != null
          ? safeSerialize(error.data)
          : 'Something went wrong.'
    : error instanceof Error
      ? error.message
      : 'An unknown error occurred.';

  return (
    <main className="page">
      <h1>{title}</h1>
      <p className="page__description">{message}</p>
      <Link to="/">Go home</Link>
    </main>
  );
}
