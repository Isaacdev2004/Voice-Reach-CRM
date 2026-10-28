const paths: Record<string, string> = {
  arrow: "M5 19L19 5 M5 5h14v14",
  briefing: "M3 6h18v13H3z M3 6l9 7 9-7",
  campaign: "M4 9h5l10-4v14l-10-4H4z M7 15l2 6h4l-2-6",
  message: "M3 4h18v13H8l-5 4z M7 8h10 M7 12h7",
  flyer: "M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5",
  day: "M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16 M8 14h3 M14 14h3",
  pipeline: "M4 20V4 M4 20h17 M8 16v-4 M13 16V8 M18 16V5",
  search: "M17 17l5 5 M19 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  organize: "M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1",
  referral: "M12 21L3 12C-2 4 8 0 12 7c4-7 14-3 9 5z",
};
export function WorkspaceIcon({ name }: { name: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.briefing} />
    </svg>
  );
}
