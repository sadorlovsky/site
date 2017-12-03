import shuffle from 'array-shuffle'
import differenceInYears from 'date-fns/difference_in_years'
import { Keyframes, Frame } from 'react-keyframes'
import fetch from 'isomorphic-unfetch'
import Page from '../layouts/Page'
import Icon from '../components/Icon'
import HomeButton from '../components/HomeButton'
import ReactIcon from '../static/react-icon.svg'
import Haskell from '../static/haskell.svg'
import SadFace from '../static/sad-face.svg'
import PhD from '../static/master.svg'
import Node from '../static/node.svg'

const Me = ({ nodejsLatestVersion }) => (
  <Page>
    <HomeButton />
    <div className='container'>
      <div className='photo' />
      <div>{differenceInYears(new Date(), new Date(1994, 2, 26))} years old</div>
      <div>from Moscow, Russia</div>
      <div>can do <code>alert()</code> stuff</div>
      <div>
        <Keyframes loop className='thingy-container'>
          {shuffle([
            <div className='thingy' key='react'>
              react lover <Icon Svg={ReactIcon} />
            </div>,
            <div className='thingy' key='monads'>
              know about monads <Icon Svg={Haskell} />
            </div>,
            <div className='thingy' key='sad'>
              sad boy <Icon Svg={SadFace} />
            </div>,
            <div className='thingy' key='apple'>
              happy  devices user
            </div>,
            <div className='thingy' key='phd'>
              Ph.D. student <Icon Svg={PhD} />
            </div>,
            <div className='thingy' key='nodejs'>
              node {nodejsLatestVersion} <Icon Svg={Node} />
            </div>,
            <div className='thingy' key='birdperson'>
              birdperson 🦅
            </div>
          ]).map(thingy => <Frame key={thingy} duration={5000}>{thingy}</Frame>)}
        </Keyframes>
      </div>
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

      .img {
        width: 20px;
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
