export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-gradient flex min-h-screen items-center justify-center bg-cream px-4 py-8 sm:px-6">
      {children}
    </div>
  );
}
