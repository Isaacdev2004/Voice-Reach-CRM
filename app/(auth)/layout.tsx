export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-gradient flex min-h-screen items-center justify-center p-margin-mobile md:p-0">
      {children}
      <div className="pointer-events-none fixed -bottom-24 -right-24 hidden opacity-20 lg:block">
        <div className="relative h-[600px] w-[600px] rounded-full border border-secondary/30">
          <div className="absolute inset-24 rounded-full border border-primary/20" />
          <div className="absolute inset-48 rounded-full border border-secondary/10" />
        </div>
      </div>
    </div>
  );
}

