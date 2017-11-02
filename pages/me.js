import shuffle from 'array-shuffle'
import differenceInYears from 'date-fns/difference_in_years'
import { Keyframes, Frame } from 'react-keyframes'
import NoSSR from 'react-no-ssr'
import Page from '../layouts/Page'
import HomeButton from '../components/HomeButton'
import fetch from 'isomorphic-unfetch'

const Me = ({ nodejsLatestVersion }) => (
  <Page>
    <HomeButton />
    <div className='container'>
      <div className='photo' />
      <div>{differenceInYears(new Date(), new Date(1994, 2, 26))} years old</div>
      <div>from Moscow, Russia</div>
      <div>can do <code>alert()</code> stuff</div>
      <NoSSR>
        <div>
          <Keyframes loop className='thingy-container'>
            {shuffle([
              <div className='thingy' key='react'>
                react lover <img src='/static/react.svg' />
              </div>,
              <div className='thingy' key='monads'>
                know about monads <img src='/static/haskell.svg' />
              </div>,
              <div className='thingy' key='sad'>
                sad boy <img src='/static/sad-face.svg' />
              </div>,
              <div className='thingy' key='apple'>
                happy  devices user
              </div>,
              <div className='thingy' key='phd'>
                Ph.D. student <img src='/static/master.svg' />
              </div>,
              <div className='thingy' key='nodejs'>
                node {nodejsLatestVersion} <img src='/static/node.svg' className='gray' />
              </div>,
              <div className='thingy' key='birdperson'>
                birdperson 🦅
              </div>
            ]).map(thingy => <Frame key={thingy} duration={5000}>{thingy}</Frame>)}
          </Keyframes>
        </div>
      </NoSSR>
    </div>

    <style jsx>{`
      .container {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        transition: all 0.5s cubic-bezier(0.445, 0.05, 0.55, 0.95);
        user-select: none;
        height: 100vh;
        font-size: 18px;
        cursor: default;
      }

      .container > div {
        margin: 5px 0;
      }

      .thingy-container {
        max-height: 20px;
      }

      .thingy {
        display: flex;
        align-items: center;
      }

      .thingy > img {
        height: 20px;
        margin-left: 5px;
      }

      .photo {
        min-width: 130px;
        min-height: 130px;
        background-image: url(/static/photo.jpg);
        background-size: cover;
        border-radius: 50%;
      }

      .gray {
        filter: grayscale(100%);
      }
    `}</style>
  </Page>
)

Me.getInitialProps = async ({ req }) => {
  const res = await fetch('https://nodejs.org/dist/index.json')
  const [data] = await res.json()

  return { nodejsLatestVersion: data.version }
}

export default Me
