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
        padding: "var(--space-8) var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>{children}</div>
    </main>
  );
}
