import React from "react";
import { createRoot } from "react-dom/client";
import { AuthShell } from "../../components/auth/auth-shell";
import { ClerkSignIn } from "../../components/auth/clerk-sign-in";
import { ClerkSignUp } from "../../components/auth/clerk-sign-up";
const signup = location.pathname === "/sign-up";
createRoot(document.getElementById("root")).render(
  <AuthShell mode={signup ? "sign-up" : "sign-in"}>
    {signup ? <ClerkSignUp /> : <ClerkSignIn />}
  </AuthShell>,
);
