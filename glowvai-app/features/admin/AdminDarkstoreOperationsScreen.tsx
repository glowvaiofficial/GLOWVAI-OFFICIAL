import { useState } from 'react';
import { Bike, Clock, RefreshCw, Zap } from 'lucide-react';
import { AdminChip, AdminNotice, AdminShell } from './components/AdminShell';

interface QueueItem {
  id: string;
  itemsCount: number;
  slaSeconds: number;
  bay: string;
  status: 'PICKING' | 'PACKED';
  customer: string;
}

const INITIAL_QUEUE: QueueItem[] = [
  { id: 'GV28491', itemsCount: 3, slaSeconds: 42, bay: 'Bay #04', status: 'PICKING', customer: 'Ananya S.' },
  { id: 'GV28492', itemsCount: 1, slaSeconds: 78, bay: 'Bay #02', status: 'PACKED', customer: 'Rahul M.' },
  { id: 'GV28493', itemsCount: 4, slaSeconds: 15, bay: 'Bay #01', status: 'PICKING', customer: 'Sneha P.' },
];

const slaClass = (seconds: number) => {
  if (seconds <= 20) return 'admin-sla admin-sla--late';
  if (seconds <= 45) return 'admin-sla admin-sla--warn';
  return 'admin-sla admin-sla--ok';
};

export const AdminDarkstoreOperationsScreen = () => {
  const [activeQueue] = useState<QueueItem[]>(INITIAL_QUEUE);
  const [notice, setNotice] = useState<{ title: string; text: string; tone: 'success' | 'info' } | null>(null);

  const handleDispatchRider = (id: string) => {
    setNotice({
      title: 'Rider dispatched',
      text: `Rider Rahul assigned to order #${id}. WhatsApp tracking link generated.`,
      tone: 'success',
    });
  };

  return (
    <AdminShell
      active="admin-darkstore"
      title="Payikapuram darkstore operations"
      subtitle="Live pick queue and SLA metrics for the Payikapuram hub."
      actions={
        <button
          type="button"
          className="admin-btn"
          onClick={() => setNotice({ title: 'Queue refreshed', text: 'Showing the latest pick queue.', tone: 'info' })}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      }
    >
      {notice && (
        <AdminNotice title={notice.title} text={notice.text} tone={notice.tone} onClose={() => setNotice(null)} />
      )}

      <section className="admin-metrics" aria-label="Darkstore metrics">
        <div className="admin-metric">
          <span className="admin-metric-head">
            <Clock size={16} color="var(--warning)" />
            Avg pick SLA
          </span>
          <span className="admin-metric-value">64s</span>
        </div>
        <div className="admin-metric">
          <span className="admin-metric-head">
            <Zap size={16} color="var(--success)" />
            10-min delivery SLA
          </span>
          <span className="admin-metric-value">98.4%</span>
        </div>
        <div className="admin-metric">
          <span className="admin-metric-head">
            <Bike size={16} color="var(--primary)" />
            Active riders
          </span>
          <span className="admin-metric-value">12</span>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">Live pick queue</h2>
          <AdminChip tone="info">{activeQueue.length} orders</AdminChip>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Bay</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>SLA left</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {activeQueue.map((item) => (
                <tr key={item.id}>
                  <td className="admin-cell-main" data-label="Order">
                    <span className="admin-cell-strong">#{item.id}</span>
                  </td>
                  <td data-label="Bay">
                    <span className="admin-bay">{item.bay}</span>
                  </td>
                  <td data-label="Customer">{item.customer}</td>
                  <td data-label="Items">{item.itemsCount}</td>
                  <td data-label="Status">
                    <AdminChip tone={item.status === 'PACKED' ? 'success' : 'info'}>{item.status}</AdminChip>
                  </td>
                  <td data-label="SLA left">
                    <span className={slaClass(item.slaSeconds)}>
                      <Clock size={14} />
                      {item.slaSeconds}s
                    </span>
                  </td>
                  <td className="admin-cell-actions" data-label="">
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--primary admin-btn--sm"
                        onClick={() => handleDispatchRider(item.id)}
                      >
                        Dispatch rider
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
};
