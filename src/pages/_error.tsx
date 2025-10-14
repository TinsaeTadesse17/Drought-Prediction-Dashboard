import type { NextPageContext } from 'next'

function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Error {statusCode ?? ''}</h1>
        <p style={{ color: 'var(--muted-foreground, #666)' }}>An error occurred.</p>
      </div>
    </main>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 404
  return { statusCode }
}

export default ErrorPage
