import "./PaymentMethods.css";

interface PaymentMethodsProps {
  lang?: "en" | "ru";
}

function AlipayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
    >
      <path
        fill="currentColor"
        d="M19.695 15.07c3.426 1.158 4.203 1.22 4.203 1.22V3.846c0-2.124-1.705-3.845-3.81-3.845H3.914C1.808.001.102 1.722.102 3.846v16.31c0 2.123 1.706 3.845 3.813 3.845h16.173c2.105 0 3.81-1.722 3.81-3.845v-.157s-6.19-2.602-9.315-4.119c-2.096 2.602-4.8 4.181-7.607 4.181c-4.75 0-6.361-4.19-4.112-6.949c.49-.602 1.324-1.175 2.617-1.497c2.025-.502 5.247.313 8.266 1.317a16.8 16.8 0 0 0 1.341-3.302H5.781v-.952h4.799V6.975H4.77v-.953h5.81V3.591s0-.409.411-.409h2.347v2.84h5.744v.951h-5.744v1.704h4.69a19.5 19.5 0 0 1-1.986 5.06c1.424.52 2.702 1.011 3.654 1.333m-13.81-2.032c-.596.06-1.71.325-2.321.869c-1.83 1.608-.735 4.55 2.968 4.55c2.151 0 4.301-1.388 5.99-3.61c-2.403-1.182-4.438-2.028-6.637-1.809"
      />
    </svg>
  );
}

function WeChatPayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
    >
      <path
        fill="currentColor"
        d="M9.271 14.669a.66.66 0 0 1-.88-.269l-.043-.095l-1.818-3.998a.5.5 0 0 1 0-.146a.327.327 0 0 1 .335-.327a.3.3 0 0 1 .196.066l2.18 1.527a1 1 0 0 0 .546.167a.9.9 0 0 0 .342-.066l10.047-4.5a10.73 10.73 0 0 0-8.171-3.526C6.479 3.502 2 7.232 2 11.87a7.83 7.83 0 0 0 3.46 6.296a.66.66 0 0 1 .24.727l-.45 1.701a1 1 0 0 0-.051.24a.327.327 0 0 0 .334.334a.4.4 0 0 0 .19-.058l2.18-1.265c.16-.098.343-.151.53-.152q.15 0 .292.043c1.062.3 2.16.452 3.264.45c5.525 0 10.011-3.729 10.011-8.33a7.23 7.23 0 0 0-1.098-3.883L9.351 14.625z"
      />
    </svg>
  );
}

export function PaymentMethods({ lang = "en" }: PaymentMethodsProps) {
  const captions = {
    en: "Two payment systems used in China — Alipay (left) and WeChat Pay (right), also known as Weixin Pay",
    ru: "Две используемые в Китае платежные системы — Alipay (слева) и WeChat Pay (справа), также известная как Weixin Pay",
  };

  return (
    <figure className="payment-methods-figure">
      <div className="payment-icons">
        <div className="alipay payment-icon">
          <AlipayIcon />
        </div>
        <div className="wechat-pay payment-icon">
          <WeChatPayIcon />
        </div>
      </div>
      <figcaption>{captions[lang]}</figcaption>
    </figure>
  );
}
