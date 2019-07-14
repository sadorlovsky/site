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
      <div className='social'>
        <a href='https://github.com/sadorlovsky'>
          <amp-img
            width={32}
            height={32}
            srcSet='/static/github/GitHub-Mark-Light-120px-plus.png 120w, /static/github/GitHub-Mark-Light-64px.png 64w, /static/github/GitHub-Mark-Light-32px.png 32w'
            src='/static/github/GitHub-Mark-Light-32px.png'
            alt='https://github.com/sadorlovsky'
            style={{ width: '32px' }}
          />
        </a>
        <a href='https://twitter.com/sadorlovsky'>
          <amp-img
            width={32}
            height={32}
            src='/static/twitter/Twitter_Social_Icon_Circle_White.png'
            alt='https://twitter.com/sadorlovsky'
            style={{ width: '32px' }}
          />
        </a>
        <a href='https://instagram.com/sadorlovsky'>
          <amp-img
            width={32}
            height={32}
            src='/static/instagram/glyph-logo_May2016.png'
            alt='https://instagram.com/sadorlovsky'
            style={{ width: '32px', filter: 'invert(100%)' }}
          />
        </a>
      </div>
    </main>

    <style jsx global>{`
      html, body {
        margin: 0;
        padding: 0;
      }
      body {
        background-color: #000;
        color: #fff;
        font-family: sans-serif;
      }
    `}</style>
    <style jsx>{`
      main {
        margin-top: 1em;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      h1 {
        margin: 0.5em 0;
        cursor: default;
        text-align: center;
        font-weight: bold;
      }
      .social > a:not(:last-child) {
        margin-right: 1em;
      }
    `}</style>
  </>
)
