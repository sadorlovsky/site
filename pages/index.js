import Link from 'next/link'
import Page from '../layouts/Page'
import { colors } from '../themes'

export default () => (
  <Page>
    <div>
      <h1>Zach Orlovsky</h1>
      <nav>
        <Link href='/me'><a>me</a></Link>
        <Link href='/blog'><a>blog</a></Link>
        <a href='https://twitter.com/sadorlovsky'>twitter</a>
        <a href='https://github.com/sadorlovsky'>code</a>
      </nav>
    </div>

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

      h1 {
        margin: 0;
        font-weight: 200;
        cursor: default;
        color: ${colors.text};
      }

      nav {
        margin-top: 15px;
      }

      nav > a {
        color: ${colors.nav};
        text-decoration: none;
      }

      nav > a:not(:last-child) {
        margin-right: 15px;
      }
    `}</style>
  </Page>
)
