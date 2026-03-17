interface AppPromoVideoProps {
  className?: string;
  videoClassName?: string;
  posterClassName?: string;
  priority?: boolean;
}

export default function AppPromoVideo({
  className = "",
  videoClassName = "",
  posterClassName = "",
  priority = false,
}: AppPromoVideoProps) {
  return (
    <div className={className}>
      <video
        className={videoClassName}
        poster="/media/munch-demo-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
      >
        <source src="/media/munch-demo.mp4" type="video/mp4" />
        <source src="/media/munch-demo.webm" type="video/webm" />
      </video>
      <img
        src="/media/munch-demo-poster.jpg"
        alt="Munch app demo"
        className={posterClassName}
      />
    </div>
  );
}
