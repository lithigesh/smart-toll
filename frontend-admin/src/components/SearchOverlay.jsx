import React from 'react';
import { X, User, Mail, Phone, Calendar, DollarSign } from 'lucide-react';

const SearchOverlay = ({ results, loading, onClose }) => {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay transition-opacity"
      onClick={handleOverlayClick}
    >
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-border modal-enter-active">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Search Results</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
              <span className="text-muted-foreground">Searching...</span>
            </div>
          ) : results?.error ? (
            <div className="text-center py-12">
              <div className="text-destructive mb-2">❌</div>
              <p className="text-destructive">{results.error}</p>
            </div>
          ) : results?.data?.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Found {results.total} result(s)
              </div>
              {results.data.map((user) => (
                <div key={user.id} className="bg-accent/50 rounded-lg p-4 border border-border hover:shadow-md transition-all">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Basic Info */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-card-foreground">
                          {user.name || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {user.email || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {user.phone_number || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          ID: {user.id}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      
                      {user.wallet_balance !== undefined && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-green-600">
                            ₹{user.wallet_balance || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-4 pt-3 border-t border-border">
                    <button className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                      View Details
                    </button>
                    <button className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors">
                      View Transactions
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : results ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">🔍</div>
              <p className="text-muted-foreground">No users found matching your search.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;