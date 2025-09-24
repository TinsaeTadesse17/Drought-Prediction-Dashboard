import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document'

// Provide a proper custom Document only to silence the warning that was
// produced by the placeholder file. Since the App Router (src/app) is used
// for the actual UI, this Document simply renders the required wrappers.
// Keeping it minimal avoids any side-effects. If not needed later, the file
// can be removed entirely once the build cache on the host is cleared.
export default class AppDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
