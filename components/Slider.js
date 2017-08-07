import { Component, isValidElement } from 'react'
import classnames from 'classnames'

class Slider extends Component {
  constructor (props) {
    super(props)
    this.state = {
      current: 0,
      animation: false
    }
    this.tick = this.tick.bind(this)
  }

  tick () {
    let next = this.state.current + 1

    if (next > this.props.things.length - 1) {
      next = 0
    }

    this.setState({
      current: next,
      animation: true
    }, () => {
      setTimeout(() => {
        this.setState({
          animation: false
        })
      }, 1000)
    })
  }

  componentDidMount () {
    if (window.Worker) {
      const intervalWorker = new Worker('/static/intervalWorker.js')
      intervalWorker.postMessage(null)
      intervalWorker.onmessage = () => {
        this.tick()
      }
    } else {
      setInterval(() => {
        this.tick()
      }, 5000)
    }
  }

  displayElement (element) {
    if (isValidElement(element)) {
      return element
    }
    return <div>{element}</div>
  }

  render () {
    return (
      <div className={classnames({ animation: this.state.animation })}>
        {this.displayElement(this.props.things[this.state.current])}

        <style jsx>{`
          .animation {
            animation: fadeIn 1s;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    )
  }
}

export default Slider
