import React, { useEffect, useState } from 'react';
import { CalendarDays, Users, Activity, X } from 'lucide-react';

export default function Reports({ apiFetch, refreshFlag }) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [availableYears, setAvailableYears] = useState([2026]);
  const [totalPatientsTreated, setTotalPatientsTreated] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [animate, setAnimate] = useState(false);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/reports/monthly?year=${selectedYear}`);
      setReportData(data.report || []);
      setAvailableYears(data.availableYears || [2026]);
      setTotalPatientsTreated(data.totalPatientsTreated || 0);
      setTotalSessions(data.totalSessions || 0);
    } catch (err) {
      setError('Failed to calculate report metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedMonth(null); // Reset table filter on year change
    loadReportData();
  }, [selectedYear, refreshFlag]);

  useEffect(() => {
    if (reportData.length > 0) {
      setAnimate(false);
      const timer = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(timer);
    }
  }, [selectedYear, reportData]);

  if (loading) {
    return <div className="reports-loading">Analyzing clinic history records...</div>;
  }

  if (error) {
    return <div className="alert-banner alert-banner-danger">{error}</div>;
  }

  // Calculate maximum values for scaling the chart
  const maxVal = reportData.length > 0 
    ? Math.max(...reportData.map(d => Math.max(d.patientsSeen, d.totalSessions)), 1) 
    : 1;

  const displayPatientsSeenTotal = selectedMonth 
    ? (reportData.find(d => d.month === selectedMonth)?.patientsSeen || 0)
    : totalPatientsTreated;
    
  const displaySessionsTotal = selectedMonth
    ? (reportData.find(d => d.month === selectedMonth)?.totalSessions || 0)
    : totalSessions;

  const filteredReportData = selectedMonth
    ? reportData.filter(d => d.month === selectedMonth)
    : reportData;

  return (
    <div className="reports-page">
      {/* Header & Year Selector */}
      <div className="reports-page-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p className="text-muted">Clinical throughput and service usage analysis</p>
        </div>
        <div className="year-selector-container">
          <CalendarDays size={18} className="text-muted" />
          <select 
            id="year-select"
            className="year-select-dropdown"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="reports-summary-grid">
        <div className="card summary-tile">
          <div className="summary-tile-icon succ-glow">
            <Users size={20} />
          </div>
          <div>
            <span className="summary-tile-label">Patients Treated ({selectedYear})</span>
            <span className="summary-tile-value">{totalPatientsTreated}</span>
          </div>
        </div>

        <div className="card summary-tile">
          <div className="summary-tile-icon prim-glow">
            <Activity size={20} />
          </div>
          <div>
            <span className="summary-tile-label">Treatment Sessions ({selectedYear})</span>
            <span className="summary-tile-value">{totalSessions}</span>
          </div>
        </div>
      </div>

      {/* 12-Month Grouped Bar Chart */}
      <div className="card chart-card">
        <div className="card-header">
          <div>
            <h3>Monthly Visit Count Report</h3>
            <span className="text-muted text-xs">Patients Treated vs Treatment Sessions</span>
          </div>
          {selectedMonth && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedMonth(null)}
            >
              Show All Months
            </button>
          )}
        </div>
        
        <div className={`chart-container-wrapper ${animate ? 'animate-ready' : ''}`}>
          {totalSessions === 0 && (
            <div className="chart-empty-overlay">
              <CalendarDays size={28} className="text-muted" style={{ marginBottom: '0.5rem' }} />
              <p className="font-semibold text-muted">No treatment sessions were recorded for {selectedYear}.</p>
            </div>
          )}

          <div className="y-axis-label-wrapper">
            <span className="y-label">{maxVal}</span>
            <span className="y-label">{Math.round(maxVal / 2)}</span>
            <span className="y-label">0</span>
          </div>
          
          <div className="bar-chart-plot-area">
            {reportData.map((data, idx) => {
              const isSelected = selectedMonth === data.month;
              return (
                <div 
                  key={idx} 
                  className={`chart-bar-column grouped-column ${isSelected ? 'selected-column' : ''} ${selectedMonth && !isSelected ? 'dimmed-column' : ''}`}
                  onClick={() => setSelectedMonth(prev => prev === data.month ? null : data.month)}
                >
                  <div className="bar-interactive-group">
                    {/* Tooltip */}
                    <div className="bar-tooltip">
                      <div><strong>{data.month}</strong></div>
                      <div className="tooltip-item">
                        <span className="legend-dot patients-dot"></span> Patients: {data.patientsSeen}
                      </div>
                      <div className="tooltip-item">
                        <span className="legend-dot sessions-dot"></span> Sessions: {data.totalSessions}
                      </div>
                    </div>
                    
                    {/* Grouped Bars Container */}
                    <div className="grouped-bars-container">
                      {/* Patients Seen Bar (Green) */}
                      <div className="chart-bar-wrapper">
                        <span className="bar-val-label">{data.patientsSeen}</span>
                        <div 
                          className="chart-bar patients-bar" 
                          style={{ height: animate ? `${(data.patientsSeen / maxVal) * 100}%` : '0%' }}
                        ></div>
                      </div>
                      
                      {/* Sessions Bar (Blue) */}
                      <div className="chart-bar-wrapper">
                        <span className="bar-val-label">{data.totalSessions}</span>
                        <div 
                          className="chart-bar sessions-bar" 
                          style={{ height: animate ? `${(data.totalSessions / maxVal) * 100}%` : '0%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <span className="bar-label">{data.month.substring(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-color patients-color"></span> Patients Treated
          </span>
          <span className="legend-item">
            <span className="legend-color sessions-color"></span> Treatment Sessions
          </span>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="card table-card">
        <div className="card-header table-card-header">
          <h3>Monthly Summary Table</h3>
          {selectedMonth && (
            <div className="table-filter-indicator">
              <span className="badge badge-primary">Filtered: {selectedMonth}</span>
              <button 
                type="button" 
                className="btn-icon reset-filter-btn" 
                onClick={() => setSelectedMonth(null)}
                title="Clear Filter"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Patients Seen</th>
                <th>Total Sessions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReportData.map((data, idx) => (
                <tr 
                  key={idx}
                  className={selectedMonth === data.month ? 'active-row' : ''}
                >
                  <td className="font-semibold">{data.month}</td>
                  <td>{data.patientsSeen}</td>
                  <td>{data.totalSessions}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td><strong>TOTAL</strong></td>
                <td><strong>{displayPatientsSeenTotal}</strong></td>
                <td><strong>{displaySessionsTotal}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style>{`
        .reports-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .reports-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .year-selector-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }

        .year-select-dropdown {
          border: none;
          background: transparent;
          color: var(--text-main);
          font-weight: 600;
          outline: none;
          cursor: pointer;
          font-size: 0.95rem;
          padding-right: 0.5rem;
        }

        .reports-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
        }

        .summary-tile {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.25rem !important;
        }

        .summary-tile-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .prim-glow {
          background-color: var(--primary-light);
          color: var(--primary);
          box-shadow: 0 0 10px rgba(13, 148, 136, 0.05);
        }

        .succ-glow {
          background-color: var(--success-light);
          color: var(--success);
        }

        .summary-tile-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 550;
        }

        .summary-tile-value {
          font-size: 1.35rem;
          font-family: var(--font-title);
          font-weight: 700;
          color: var(--text-main);
        }

        .chart-card {
          min-height: 400px;
          display: flex;
          flex-direction: column;
        }

        .chart-container-wrapper {
          display: flex;
          height: 280px;
          margin-top: 1.5rem;
          position: relative;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 0.25rem;
        }

        .chart-empty-overlay {
          position: absolute;
          top: 0;
          left: 32px;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--card-bg);
          opacity: 0.95;
          z-index: 5;
          text-align: center;
          padding: 1rem;
        }

        .y-axis-label-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          font-size: 0.7rem;
          color: var(--text-muted);
          width: 32px;
          padding-right: 0.5rem;
          text-align: right;
          border-right: 1px solid var(--border-color);
        }

        .bar-chart-plot-area {
          display: flex;
          flex-grow: 1;
          justify-content: space-around;
          align-items: flex-end;
          padding: 0 0.5rem;
          height: 100%;
        }

        .chart-bar-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          height: 100%;
          justify-content: flex-end;
          cursor: pointer;
          border-radius: var(--radius-sm);
          padding: 4px 2px;
          transition: background-color 0.2s ease;
        }

        .chart-bar-column:hover {
          background-color: rgba(13, 148, 136, 0.04);
        }

        .chart-bar-column.selected-column {
          background-color: rgba(13, 148, 136, 0.08);
          box-shadow: inset 0 0 0 1px var(--primary);
        }

        .chart-bar-column.dimmed-column {
          opacity: 0.45;
        }

        .bar-interactive-group {
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          height: 100%;
        }

        .grouped-bars-container {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
          height: 100%;
          width: 100%;
          padding-top: 1.5rem; /* space for numeric labels */
        }

        .chart-bar-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          height: 100%;
          flex: 1;
          min-width: 12px;
          max-width: 22px;
        }

        .bar-val-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 2px;
          opacity: 0;
          transform: translateY(2px);
          transition: all 0.3s ease-out;
        }

        .animate-ready .bar-val-label {
          opacity: 1;
          transform: translateY(0);
        }

        .chart-bar {
          width: 100%;
          border-radius: 3px 3px 0 0;
          transition: height 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        }

        .patients-bar {
          background: linear-gradient(180deg, #10b981, #059669);
        }

        .sessions-bar {
          background: linear-gradient(180deg, #3b82f6, #1d4ed8);
        }

        .bar-label {
          font-size: 0.725rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-top: 0.5rem;
          white-space: nowrap;
        }

        .bar-tooltip {
          position: absolute;
          bottom: 100%;
          margin-bottom: 8px;
          background-color: var(--text-main);
          color: var(--card-bg);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          pointer-events: none;
          opacity: 0;
          transform: translateY(4px);
          transition: var(--transition);
          box-shadow: var(--shadow-md);
          z-index: 10;
          width: 130px;
          text-align: left;
        }

        .bar-interactive-group:hover .bar-tooltip {
          opacity: 1;
          transform: translateY(0);
        }

        .tooltip-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.25rem;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .patients-dot {
          background-color: #10b981;
        }

        .sessions-dot {
          background-color: #3b82f6;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-top: 1.25rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          display: inline-block;
        }

        .patients-color {
          background-color: #10b981;
        }

        .sessions-color {
          background-color: #3b82f6;
        }

        .table-card {
          margin-top: 0.5rem;
        }

        .table-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .table-filter-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .reset-filter-btn {
          color: var(--text-muted) !important;
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 24px;
          height: 24px;
        }

        .reset-filter-btn:hover {
          background-color: var(--border-color) !important;
          color: var(--text-main) !important;
        }

        .active-row td {
          background-color: rgba(13, 148, 136, 0.05);
          font-weight: 550;
        }

        .totals-row td {
          background-color: var(--bg-color);
          border-top: 2px solid var(--border-color);
          border-bottom: 2px solid var(--border-color);
          font-size: 0.9rem;
          color: var(--text-main);
        }

        .reports-loading {
          text-align: center;
          padding: 5rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .bar-val-label {
            display: none;
          }
          .grouped-bars-container {
            padding-top: 0.5rem;
            gap: 2px;
          }
        }
      `}</style>
    </div>
  );
}
