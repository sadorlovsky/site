import Link from 'next/link'

export default () => (
  <div className='home-button'>
    <Link href='/'>
      <img src='/static/sad-face.svg' />
    </Link>

    <style jsx>{`
      .home-button {
        cursor: pointer;
        padding: 15px;
        position: absolute;
      }

      .home-button > img {
        width: 35px;
      }
    `}</style>
  </div>
)
