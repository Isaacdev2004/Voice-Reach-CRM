/** Original, bundled lifestyle artwork; deliberately not represented as a listing or client property. */
export function PropertyLifestyleArt({
  tile = 0,
  className = "",
  image = "/brand/campaigns/interiors-a.webp",
}: {
  tile?: number;
  className?: string;
  image?: string;
}) {
  const index = Math.max(0, Math.min(11, tile));
  return (
    <span
      aria-hidden="true"
      className={`pf-lifestyle-art ${className}`}
      style={{
        backgroundImage: `url("${image}")`,
        backgroundSize: "400% 300%",
        backgroundPosition: `${((index % 4) * 100) / 3}% ${Math.floor(index / 4) * 50}%`,
      }}
    />
  );
}
export function propertyIllustrationTile(id: string) {
  return (
    [...id].reduce((value, c) => (value * 31 + c.charCodeAt(0)) >>> 0, 0) % 12
  );
}
