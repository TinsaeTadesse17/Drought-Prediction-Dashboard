import NextErrorComponent from 'next/error'
import type { NextPageContext } from 'next'

type Props = { statusCode?: number }

function ErrorPage({ statusCode }: Props) {
	return <NextErrorComponent statusCode={statusCode ?? 500} />
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
	const statusCode = res?.statusCode ?? (err as any)?.statusCode ?? 404
	return { statusCode }
}

export default ErrorPage

