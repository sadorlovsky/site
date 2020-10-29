import { useState, useCallback, MouseEventHandler } from 'react'
import { NextSeo } from 'next-seo'

const IndexPage = () => {
  const [coords, setCoords] = useState<number[]>([0, 0])

  const handleMouseMove: MouseEventHandler = event => {
    setCoords([event.pageX, event.pageY])
  }

  const handleMouseLeave: MouseEventHandler = () => {
    setCoords([0, 0])
  }

  const getRotateY = useCallback(() => {
    if (coords[0] === 0) {
      return 0
    }
    return (coords[0] > (window.innerWidth / 2))
      ? coords[0] / 150
      : (window.innerWidth - coords[0]) / 150 * -1
  }, [coords[0]])

  const getRotateX = useCallback(() => {
    if (coords[1] === 0) {
      return 0
    }
    return (coords[1] > (window.innerHeight / 2))
      ? coords[1] / 50
      : (window.innerHeight - coords[1]) / 50 * -1
  }, [coords[1]])

  return (
    <>
      <NextSeo
        title='Zach Orlovsky'
        description='Zach Orlovsky personal page'
      />

      <main onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div>
          <h1 style={{
            transform: `perspective(1000px) rotateX(${getRotateX()}deg) rotateY(${getRotateY()}deg) scale3d(1, 1, 1)`,
            background: getRotateX() === 0 ? 'none' : `linear-gradient(${getRotateX() + getRotateY()}deg, var(--background), rgba(210, 210, 212, 0.3)`
          }}
          >
            Zach Orlovsky
          </h1>
        </div>

        <div className='social'>
          <a href='https://github.com/sadorlovsky'>👨‍💻 Code</a>
          <a href='https://instagram.com/sadorlovsky'>🏙 Pictures</a>
          <a href='https://twitter.com/sadorlovsky'>🐦 Tweets</a>
          <a href='https://t.me/sadorlovsky'>💌 Messages</a>
        </div>
      </main>

      <style jsx>{`
        main {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        h1 {
          display: block;
          margin: 0.5em 0;
          cursor: default;
          text-align: center;
          font-weight: 800;
          padding: 0.5em;
          font-size: 5em;
          border: 0.05em solid var(--foreground);
          will-change: transform;
          transition-property: transform;
          transition-duration: 0.3s;
          transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .social > a {
          margin-right: 1em;
        }
      `}
      </style>
    </>
  )
}

export default IndexPage
