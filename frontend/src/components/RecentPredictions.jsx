import React from 'react';

export default function RecentPredictions({ predictions }) {
  const defaultList = [
    { time: '10:20 AM', location: 'Bengaluru', probability: 78.4, riskLevel: 'HIGH' },
    { time: '10:18 AM', location: 'Mysuru', probability: 45.2, riskLevel: 'MODERATE' },
    { time: '10:15 AM', location: 'Mandya', probability: 62.1, riskLevel: 'HIGH' },
    { time: '10:12 AM', location: 'Tumakuru', probability: 28.3, riskLevel: 'LOW' },
    { time: '10:10 AM', location: 'Kolar', probability: 71.6, riskLevel: 'HIGH' }
  ];

  const list = predictions && predictions.length > 0 ? predictions : defaultList;

  const getBadgeClass = (riskLevel) => {
    switch (riskLevel?.toUpperCase()) {
      case 'HIGH':
      case 'SEVERE':
        return 'badge-high';
      case 'MODERATE':
        return 'badge-moderate';
      case 'LOW':
        return 'badge-low';
      default:
        return 'badge-high';
    }
  };

  return (
    <div className="card">
      <div className="card-title">Recent Predictions</div>

      <table className="predictions-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Location</th>
            <th>Probability</th>
            <th>Risk Level</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {list.slice(0, 6).map((pred, index) => {
            const isDemo = (pred.status || '').toUpperCase() === 'DEMO_AUDIT';
            return (
              <tr key={index}>
                <td>{pred.time}</td>
                <td>
                  <strong>{pred.location}</strong>
                  {pred.depthTier && (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{pred.depthTier}</div>
                  )}
                </td>
                <td>{pred.probability}%</td>
                <td>
                  <span className={`badge ${getBadgeClass(pred.riskLevel)}`}>
                    {pred.riskLevel}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isDemo ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: isDemo ? '#fbbf24' : '#34d399',
                    border: `1px solid ${isDemo ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {isDemo ? 'DEMO' : 'LIVE'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
