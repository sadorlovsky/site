import { Component } from 'react'
import Head from 'next/head'
import { version } from '../package'
import { colors } from '../themes'
import ReactGA from 'react-ga'

const log = ({ message, color }) => {
  // eslint-disable-next-line no-console
  console.log(`%c${message}`, `color: ${color}; font-size: 12px;`)
}

if (global.document) {
  const info = [
    `Version: ${version}`,
    `You can find the code here: https://github.com/sadorlovsky/orlovsky`,
    `Have a great day!☺️`
  ]

  for (const message of info) {
    log({ message, color: colors.other })
  }
}

export default class extends Component {
  componentDidMount () {
    if (!window.GA_INITIALIZED) {
      ReactGA.initialize('UA-104409622-1')
      window.GA_INITIALIZED = true
    }
    ReactGA.set({ page: window.location.pathname })
    ReactGA.pageview(window.location.pathname)
  }

  render () {
    return (
      <main>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, user-scalable=no"
          />
          <link rel="apple-touch-icon" sizes="180x180" href="/static/favicons/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/static/favicons/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/static/favicons/favicon-16x16.png" />
          <link rel="manifest" href="/static/favicons/manifest.json" />
          <link rel="mask-icon" href="/static/favicons/safari-pinned-tab.svg" color="#8a8a8a" />
          <link rel="shortcut icon" href="/static/favicons/favicon.ico" />
          <meta name="msapplication-config" content="/static/favicons/browserconfig.xml" />
          <meta name="theme-color" content="#f9fafd" />
          <title>Zach Orlovsky</title>
        </Head>

        {this.props.children}

        <style jsx global>{`
            body {
              background: ${colors.background};
              color: ${colors.text};
              font-weight: 200;
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
          `}</style>
      </main>
    )
  }
}
