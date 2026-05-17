import { useAppStore } from "../../../../store";

export default function Profile() {
  const store = useAppStore();
  const profile = store.profile;
  const user = store.user;

  return (
    <div className="reco-wrap" style={{ maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '32px' }}>Account & Privacy</h2>
      
      <div className="dash-card full" style={{ marginBottom: '24px' }}>
        <div className="dc-label">Personal Profile</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text3)' }}>Name</span>
            <span>{profile?.name || user?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text3)' }}>Email</span>
            <span>{user?.email}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text3)' }}>City</span>
            <span>{profile?.city}</span>
          </div>
        </div>
      </div>

      <div className="dash-card full">
        <div className="dc-label">Privacy Controls</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text2)', marginTop: '12px' }}>
          Under HIPAA/IRDAI guidelines, you have the right to purge all sensitive medical and financial data at any time.
        </p>
        <button 
          className="btn btn-outline btn-sm" 
          style={{ color: 'var(--danger)', borderColor: 'rgba(255, 77, 109, 0.2)', marginTop: '20px' }}
          onClick={() => {
            if (confirm("Permanently delete all your health data? This cannot be undone.")) {
              store.resetIntake();
              window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Data purged successfully' }));
            }
          }}
        >
          🗑️ Purge My Health Data
        </button>
      </div>
    </div>
  );
}
