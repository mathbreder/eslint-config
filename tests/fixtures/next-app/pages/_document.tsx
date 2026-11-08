import Head from 'next/head';
import Document, { Html, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head />
        <Head />
        <body>
          <script src="/legacy.js" />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
