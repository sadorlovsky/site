import Page from '../layouts/Page'
import { colors } from '../themes'

export default () => (
  <Page>
    <div>
      <img src='/static/sad-face.png' />
      <h1>500</h1>

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
