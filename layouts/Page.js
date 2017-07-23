import Head from 'next/head'
import { version } from '../package'

if (global.document) {
  const info = [
    `Version: ${version}`,
    `You can find the code here: https://github.com/sadorlovsky/orlovsky`,
    `Have a great day!☺️`
  ]

  for (const message of info) {
    console.log(`%c${message}`, 'color: #DCCDE8; font-size: 12px;');
  }
}

export default ({ children }) => (
  <main>
    <Head>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, user-scalable=no"
      />
      <title>Zach Orlovsky</title>
    </Head>

    {children}

    <style jsx global>{`
        body {
          background: #000;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }

        html,
        body {
          height: 100%;
        }

        main {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
      `}</style>
  </main>
)
