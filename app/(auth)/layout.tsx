export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fcfcf9]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
