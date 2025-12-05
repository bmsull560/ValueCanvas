import React from 'react';

const normalizeBaseUrl = (baseUrl: string | undefined) => {
  if (!baseUrl) {
    return '';
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

export function ApiDocsPage() {
  const fallbackBaseUrl = 'http://localhost:3000';
  const resolvedBaseUrl =
    normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (typeof window !== 'undefined' ? normalizeBaseUrl(window.location.origin) : '') ||
    fallbackBaseUrl;
  const specUrl = `${resolvedBaseUrl}/api/openapi.yaml`;
  const swaggerUrl = `${resolvedBaseUrl}/api/docs`;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-wide text-green-700 font-semibold">API Reference</p>
          <h1 className="text-3xl font-bold mt-2">OpenAPI-powered documentation</h1>
          <p className="mt-3 text-gray-700 max-w-3xl">
            The reference below is rendered directly from our maintained <code>openapi.yaml</code>. Examples are
            tenant-aware (include <code>X-Tenant-ID</code>) and highlight authentication and throttling expectations.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-blue-700">
            <span className="font-semibold">Spec URL:</span>
            <a className="underline" href={specUrl} target="_blank" rel="noreferrer">
              {specUrl}
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">Interactive spec</p>
              <p className="text-xs text-gray-600">Backed by the live OpenAPI definition with curl examples per endpoint.</p>
            </div>
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-green-700"
            >
              Open in new tab
            </a>
          </div>
          <iframe
            title="ValueCanvas API documentation"
            src={swaggerUrl}
            className="w-full"
            style={{ minHeight: '75vh', border: 'none' }}
            sandbox="allow-same-origin allow-scripts allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </div>
  );
}

export default ApiDocsPage;
