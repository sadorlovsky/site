import { useState, useEffect, MouseEventHandler } from 'react'
import { NextSeo } from 'next-seo'
import Github from '@geist-ui/react-icons/github'
import Twitter from '@geist-ui/react-icons/twitter'
import Instagram from '@geist-ui/react-icons/instagram'
import Mail from '@geist-ui/react-icons/mail'

type Coords = {
  x: number
  y: number
}

const IndexPage = () => {
  const [coords, setCoords] = useState<Coords>({ x: 0, y: 0})
  const [rotateX, setRotateX] = useState<number>(0)
  const [rotateY, setRotateY] = useState<number>(0)
  const [translateZ, setTranslateZ] = useState<number>(0)
  const [transition, toggleTransition] = useState<boolean>(false)

  useEffect(() => {
    if (coords.y !== 0) {
      setRotateX((window.innerHeight / 2 - coords.y) / 30)
    }
  }, [coords.y])

  useEffect(() => {
    if (coords.x !== 0) {
      setRotateY(-(window.innerWidth / 2 - coords.x) / 15)
    }
  }, [coords.x])



  const handleMouseMove: MouseEventHandler<HTMLDivElement> = event => {
    setCoords({ x: event.pageX, y: event.pageY })
  }

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = event => {
    toggleTransition(false)
    setTranslateZ(30)
  }

  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = event => {
    toggleTransition(true)
    setRotateX(0)
    setRotateY(0)
    setTranslateZ(0)
  }

  return (
    <>
      <NextSeo
        title='Zach Orlovsky'
        description='Zach Orlovsky personal page'
      />

      <main>
        <div
          className="container"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="card"
            style={{
              transition: transition ? 'transform 0.2s ease-in' : 'none',
              transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
            }}
          >
            <div className="photo" style={{ transform: `translateZ(${translateZ}px)` }}>
              {/* <div className="photo-bg"> */}
              <img src="/zach.svg" style={{ width: '105%', height: '105%' }} />
              {/* </div> */}
            </div>


            <h1 className="title" style={{ transform: `translateZ(${translateZ}px)` }}>Zach Orlovsky</h1>
            <div className="description" style={{ transform: `translateZ(${translateZ}px)` }}>software engineer</div>
            <div className="work" style={{ transform: `translateZ(${translateZ}px)` }}>work at X5 Retail Group</div>

            <div role="separator" className="divider" />

            <div className="social">
              <div className="social-icons">
                <div><a href="https://github.com/sadorlovsky"><Github /></a></div>
                <div><a href="https://twitter.com/sadorlovsky"><Twitter /></a></div>
                <div><a href="https://instagram.com/sadorlovsky"><Instagram /></a></div>
                <div>@sadorlovsky</div>
              </div>
              <div role="separator" className="divider" />
              <div>Telegram <a href="https://t.me/sadorlovsky">t.me/sadorlovsky</a></div>
              <div role="separator" className="divider" />
              <div className="mail">
                <div><Mail /></div>
                <div><a href="mailto:sadorlovsky@gmail.com">sadorlovsky@gmail.com</a></div>
              </div>
            </div>
          </div>
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
          perspective: 1000px;
        }

        .container {
          width: 800px;
          height: 800px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .card {
          background-color: var(--background);
          border: 1px solid rgb(51, 51, 51);
          box-shadow: 0 0 10px 1px rgba(255, 255, 255, 0.2);
          width: 400px;
          height: 600px;
          border-radius: 30px;
          box-sizing: border-box;
          padding: 50px;
          transform-style: preserve-3d;
        }

        .photo {
          width: 150px;
          height: 150px;
          border-radius: 15px;
          background-image: linear-gradient(90deg,#ed6292 25%,#ed5760 87.5%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-bg {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background-image: linear-gradient(to bottom right, #f81ce5, #7928ca);
        }

        .social {
          margin-top: 22px;
        }

        {/* .social > div {
          padding: 10px 0;
        } */}

        .social-icons {
          display: flex;
          align-items: center;
        }

        .social-icons > div {
          margin-right: 5px;
        }

        .mail {
          display: flex;
          align-items: center;
        }

        .mail > div {
          height: 100%;
          margin-right: 5px;
        }

        .divider {
          width: auto;
          max-width: 100%;
          height: calc(1px);
          background-color: rgb(51, 51, 51);
          margin: calc(20.3333px) 0px;
          position: relative;
        }

        .title, .description, .work, .photo {
          transition: transform 0.2s ease-out;
        }
      `}
      </style>
    </>
  )
}

export default IndexPage
