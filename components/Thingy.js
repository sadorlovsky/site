const Thingy = ({ text, img }) => (
  <div className='thing'>
    {text}
    {img && <img src={img} />}

    <style jsx>{`
      .thing {
        display: flex;
        align-items: center;
      }

      .thing > img {
        height: 20px;
        margin-left: 5px;
      }
    `}</style>
  </div>
)

export default Thingy
