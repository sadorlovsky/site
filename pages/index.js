import React from 'react'
import Head from 'next/head'
import { NextSeo } from 'next-seo'

export const config = { amp: true }

export default () => (
  <>
    <NextSeo title='Zach Orlovsky' />

    <Head>
      <link rel='apple-touch-icon' sizes='180x180' href='/static/favicon/apple-touch-icon.png' />
      <link rel='icon' type='image/png' sizes='32x32' href='/static/favicon/favicon-32x32.png' />
      <link rel='icon' type='image/png' sizes='16x16' href='/static/favicon/favicon-16x16.png' />
      <link rel='manifest' href='/static/favicon/site.webmanifest' />
    </Head>

    <main>
      <h1>Zach Orlovsky</h1>
    </main>

    <style jsx global>{`
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        background: #000;
      }
    `}</style>
    <style jsx>{`
      main {
        margin-top: 1em;
      }
      h1 {
        margin: 0;
        cursor: default;
        color: pink;
        font-family: sans-serif;
        text-align: center;
        font-weight: bold;
      }
    `}</style>
  </>
)
