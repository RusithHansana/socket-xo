import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Unexpected Error';

  const message = isRouteErrorResponse(error)
    ? typeof error.data === 'string'
      ? error.data
      : ((error.data as { message?: string })?.message ??
        (error.data != null ? JSON.stringify(error.data) : 'Something went wrong.'))
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
