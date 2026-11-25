/* Visual fixture only. Never authenticates or calls Clerk. */
import React from "react";
export const useAuth = () => ({ isLoaded: true, isSignedIn: false });
function Fields({ signup = false }) {
  return (
    <div className="cl-rootBox">
      <div className="cl-cardBox">
        <div className="cl-card">
          <button
            className="cl-socialButtonsBlockButton fixture-social"
            type="button"
          >
            <span aria-hidden="true" className="fixture-google">
              G
            </span>
            Continue with Google
          </button>
          <div className="fixture-divider">
            <span />
            or
            <span />
          </div>
          <label className="fixture-label">
            Email address{!signup && " or username"}
            <input
              className="cl-formFieldInput fixture-input"
              placeholder={
                signup ? "Enter your email address" : "Enter email or username"
              }
            />
          </label>
          {signup && (
            <label className="fixture-label">
              Password
              <input
                type="password"
                className="cl-formFieldInput fixture-input"
                placeholder="Create a password"
              />
            </label>
          )}
          <button
            className="cl-formButtonPrimary fixture-primary"
            type="button"
          >
            {signup ? "Create account" : "Continue"}
            <span aria-hidden="true"> →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
export function SignIn() {
  const mode = new URLSearchParams(location.search).get("fixture");
  const [ready, setReady] = React.useState(mode !== "delayed");
  React.useEffect(() => { if(mode === "delayed") { const t=setTimeout(()=>setReady(true),1500); return ()=>clearTimeout(t); } }, [mode]);
  return mode === "empty" || !ready ? null : <Fields />;
}
export const SignUp = () => <Fields signup />;
