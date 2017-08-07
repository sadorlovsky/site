import Link from 'next/link'
import Page from '../layouts/Page'
import { colors } from '../themes'

const Error = ({ statusCode }) => (
  <Page>
    <div>
      <Link href='/'>
        <a><img src='/static/sad-face.png' /></a>
      </Link>
      <h1>{statusCode}</h1>
      {/* <h1>{errorCode}</h1> */}

      <style jsx>{`
        div {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          transition: all 0.5s cubic-bezier(0.445, 0.05, 0.55, 0.95);
          user-select: none;
        }

        img {
          width: 35px;
        }

        h1 {
          margin: 0;
          font-weight: 200;
          cursor: default;
          color: ${colors.text};
        }
      `}</style>
    </div>
  </Page>
)

Error.getInitialProps = ({ res, jsonPageRes }) => {
  const statusCode = res ? res.statusCode : (jsonPageRes ? jsonPageRes.status : null)
  return { statusCode }
}

export default Error
