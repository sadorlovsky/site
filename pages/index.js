import Head from 'next/head'

export default () => (
  <div>
    <Head>
      <title>Zach Orlovsky 😔</title>
    </Head>
    <h1>Zach Orlovsky</h1>

    <style jsx global>{`
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        padding: 20px;
        background: #000;
      }
    `}</style>
    <style jsx>{`
      h1 {
        margin: 0;
        font-weight: bold;
        cursor: default;
        color: pink;
        font-family: sans-serif;
        font-size: 100px;
        margin-left: -10px;
      }
    `}</style>
  </div>
)
