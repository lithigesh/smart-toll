import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';
import SearchOverlay from './SearchOverlay';

const AdminLayout = () => {
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      setShowSearchOverlay(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchOverlay(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:3001/api/admin/search/users?search=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ data: [], total: 0, error: 'Search failed' });
    } finally {
      setSearchLoading(false);
    }
  };

  const closeSearchOverlay = () => {
    setShowSearchOverlay(false);
    setSearchResults(null);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Search */}
        <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-foreground">
              Admin Dashboard
            </h1>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <SearchBar onSearch={handleSearch} loading={searchLoading} />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <span className="text-sm text-muted-foreground">Welcome, Admin</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Search Overlay */}
      {showSearchOverlay && (
        <SearchOverlay
          results={searchResults}
          loading={searchLoading}
          onClose={closeSearchOverlay}
        />
      )}
    </div>
  );
};

export default AdminLayout;