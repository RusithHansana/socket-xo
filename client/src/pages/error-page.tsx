import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Unexpected Error';

  const message = isRouteErrorResponse(error)
    ? typeof error.data === 'string'
      ? error.data
      : ((error.data as { message?: string })?.message ?? 'Something went wrong.')
    : error instanceof Error
      ? error.message
      : 'An unknown error occurred.';

  return (
    <main>
      <h1>{title}</h1>
      <p>{message}</p>
      <button type="button" onClick={() => navigate('/')}>
        Go home
      </button>
    </main>
  );
}
