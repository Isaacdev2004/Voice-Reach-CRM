import React from "react";
const subscribe = (callback) => {
  window.addEventListener("popstate", callback);
  window.addEventListener("review:navigation", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("review:navigation", callback);
  };
};
export const usePathname = () =>
  React.useSyncExternalStore(subscribe, () => location.pathname);
export const useSearchParams = () => new URLSearchParams(location.search);
export const useRouter = () => ({
  push: (url) => {
    history.pushState({}, "", url);
    window.dispatchEvent(new Event("review:navigation"));
  },
  replace: (url) => {
    history.replaceState({}, "", url);
    window.dispatchEvent(new Event("review:navigation"));
  },
});
export const useUser = () => {
  const [, render] = React.useState(0);
  React.useEffect(() => {
    const change = () => render((v) => v + 1);
    window.addEventListener("review:auth", change);
    return () => window.removeEventListener("review:auth", change);
  }, []);
  return {
    user: { id: window.__owner || "stage_a", firstName: "Alex" },
    isLoaded: true,
    isSignedIn: true,
  };
};
