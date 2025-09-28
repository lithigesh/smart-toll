import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_ENDPOINTS } from '../config/config';

const DebugHistory = () => {
  const { user, token } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(false);

  const runDebugTest = async () => {
    setLoading(true);
    const info = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
      hasToken: !!token,
      tokenStart: token ? token.substring(0, 20) + '...' : null,
      apiEndpoint: API_ENDPOINTS.payment.history
    };

    if (token) {
      try {
        // Test the API call
        const response = await fetch(API_ENDPOINTS.payment.history, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        info.apiResponse = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        };

        if (response.ok) {
          const data = await response.json();
          info.responseData = {
            hasRecharges: !!data.recharges,
            rechargesCount: data.recharges ? data.recharges.length : 0,
            recharges: data.recharges || [],
            hasStats: !!data.stats,
            stats: data.stats || {}
          };
        } else {
          const errorText = await response.text();
          info.errorResponse = errorText;
        }
      } catch (error) {
        info.fetchError = error.message;
      }
    }

    setDebugInfo(info);
    setLoading(false);
  };

  useEffect(() => {
    if (user && token) {
      runDebugTest();
    }
  }, [user, token]);

  return (
    <div className="p-6 bg-card rounded-lg m-4">
      <h2 className="text-xl font-bold mb-4">Debug Information</h2>
      
      <button 
        onClick={runDebugTest} 
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Debug Test'}
      </button>

      <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};

export default DebugHistory;