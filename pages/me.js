import Link from 'next/link'
import shuffle from 'array-shuffle'
import differenceInYears from 'date-fns/difference_in_years'
import Page from '../layouts/Page'
import Slider from '../components/Slider'

export default () => (
  <Page>
    <div className='home-button'>
      <Link href='/'>
        <img src='/static/sad-face.png' />
      </Link>
    </div>
    <div className='container'>
      <div>{differenceInYears(new Date(), new Date(1994, 2, 26))} years old</div>
      <div>from Moscow, Russia</div>
      <div>can do <code>alert()</code> stuff</div>
      <div className='thing'>
        <Slider things={[
          <div className='react'>
            <img src='/static/react.svg' /> react lover
          </div>,
          ...shuffle([
            <div className='monads'>
              know about monads <img src='/static/haskell.svg' />
            </div>,
            <div className='english'>
              <img src='/static/sad-face.png' /> pretty shitty english
            </div>
          ])]} />
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
      }

      .container > div {
        margin: 5px 0;
      }

      .home-button {
        cursor: pointer;
        padding: 15px;
        position: absolute;
      }

      .home-button > img {
        width: 35px;
      }

      .react {
        display: flex;
        align-items: center;
      }

      .react > img {
        width: 25px;
        margin-right: 5px;
      }

      .monads {
        display: flex;
        align-items: center;
      }

      .monads > img {
        width: 25px;
      }

      .english {
        display: flex;
        align-items: center;
      }

      .english > img {
        margin-right: 5px;
        width: 20px;
      }
}
    `}</style>
  </Page>
)
