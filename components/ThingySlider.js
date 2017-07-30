import Slider from '../components/Slider'
import Thingy from '../components/Thingy'

const ThingySlider = ({ things }) => (
  <Slider
    things={things.map(([text, img]) => <Thingy text={text} img={img} />)}
  />
)

export default ThingySlider
