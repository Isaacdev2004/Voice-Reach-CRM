import React from "react";
export {
  useRouter,
  useSearchParams,
  usePathname,
} from "../contacts-browser/stubs.jsx";
export const useAuth = () => {
  const [userId, setUserId] = React.useState(window.__owner || "synthetic-A");
  React.useEffect(() => {
    const change = () => setUserId(window.__owner || "synthetic-A");
    window.addEventListener("review:auth", change);
    return () => window.removeEventListener("review:auth", change);
  }, []);
  return { userId, isLoaded: true };
};
export const useUser = () => ({
  user: { id: window.__owner || "synthetic-A" },
  isLoaded: true,
  isSignedIn: true,
});
