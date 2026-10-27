/* Visual fixture only. Never authenticates or calls Clerk. */
import React from "react";
import { authEntryLocalization } from "../../lib/auth-presentation";
export const useAuth = () => ({ isLoaded: true, isSignedIn: false });
function Fields({ signup = false }) {
  return (
    <div className="cl-rootBox">
      <div className="cl-cardBox">
        <div className="cl-card">
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
            {authEntryLocalization(location.pathname)?.formButtonPrimary ??
              "Continue"}
            <span aria-hidden="true"> →</span>
          </button>
          <div className="fixture-divider">
            <span />
            or
            <span />
          </div>
          <button
            className="cl-socialButtonsBlockButton fixture-social"
            type="button"
          >
            <span aria-hidden="true" className="fixture-google">
              G
            </span>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
export const SignIn = () => <Fields />;
export const SignUp = () => <Fields signup />;
