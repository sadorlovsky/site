import { ThemeProvider } from 'next-themes'
import type { AppProps } from 'next/app'
import './styles.css'

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <ThemeProvider defaultTheme="system">
      <Component {...pageProps} />
    </ThemeProvider>
  )
}

export default App
