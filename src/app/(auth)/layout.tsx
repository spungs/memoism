export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100svh",
        backgroundColor: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "calc(var(--space-8) + env(safe-area-inset-top)) var(--space-5) calc(var(--space-8) + env(safe-area-inset-bottom))",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>{children}</div>
    </main>
  );
}
