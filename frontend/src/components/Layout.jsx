import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout({ children, useSidebar = false }) {

  if (useSidebar) {
    // Legacy sidebar layout for pages that specifically need it
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden ml-0 md:ml-64">
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-7xl pt-20 md:pt-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Modern navbar layout - default for all pages
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16">
        <main className="container mx-auto px-4 py-6 md:px-6 md:py-8 max-w-7xl">
          {children}
        </main>
      </div>
    </>
  );
}