export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-gradient flex min-h-screen items-center justify-center bg-cream p-margin-mobile md:p-0">
      {children}
    </div>
  );
}
