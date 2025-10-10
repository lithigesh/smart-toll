import { Sidebar } from './Sidebar';

export function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-7xl ml-0 md:ml-0 pt-20 md:pt-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}