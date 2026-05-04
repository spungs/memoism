export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-10">
      {children}
    </main>
  );
}
