import shuffle from 'array-shuffle'
import differenceInYears from 'date-fns/difference_in_years'
import Page from '../layouts/Page'
import ThingySlider from '../components/ThingySlider'
import HomeButton from '../components/HomeButton'

export default () => (
  <Page>
    <HomeButton />
    <div className='container'>
      <div>{differenceInYears(new Date(), new Date(1994, 2, 26))} years old</div>
      <div>from Moscow, Russia</div>
      <div>can do <code>alert()</code> stuff</div>
      <div style={{ maxHeight: '20px' }}>
        <ThingySlider things={shuffle([
          ['react lover', '/static/react.svg'],
          ['know about monads', '/static/haskell.svg'],
          ['sad boy', '/static/sad-face.svg'],
          ['happy  devices user'],
          ['Ph.D. student', '/static/master.svg']
        ])} />
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
    `}</style>
  </Page>
)
