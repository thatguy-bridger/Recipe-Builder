// Renders a step's photos at their natural aspect ratio (never re-cropped
// via object-cover) — a single photo centered on its own, or multiple
// centered together in a wrapping row, each capped to a modest height so a
// tall/vertical shot doesn't dominate the card.
export function StepPhotos({
  urls,
  singleMaxHeightClass = "max-h-96",
  multiMaxHeightClass = "max-h-40",
}: {
  urls: string[];
  singleMaxHeightClass?: string;
  multiMaxHeightClass?: string;
}) {
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={urls[0]}
        alt=""
        className={`mx-auto mt-2 block w-auto max-w-full rounded-lg ${singleMaxHeightClass}`}
      />
    );
  }

  return (
    <div className="mt-2 flex flex-wrap justify-center gap-2">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={url}
          alt=""
          className={`w-auto max-w-full rounded-lg ${multiMaxHeightClass}`}
        />
      ))}
    </div>
  );
}
