import React, { useEffect, useState } from 'react';
import { getAdminSettings, saveAdminSettings, setup2FA, reset2FA } from '../../api/adminApi';
import { useAdminToast } from '../AdminToast';
import ConfirmModal from '../ConfirmModal';

const SETTING_META = {
  reward_per_ad: {
    label: 'Reward Per Ad (TON)',
    desc: 'Total TON value of one ad watch. Platform cut + user share must sum to this.',
    unit: 'TON',
    step: '0.0001',
    min: '0.0001',
  },
  platform_cut_pct: {
    label: 'Platform Cut (%)',
    desc: 'Percentage of each ad reward kept by the platform. User receives the rest.',
    unit: '%',
    step: '1',
    min: '1',
    max: '99',
  },
  max_ads_per_day: {
    label: 'Max Ads Per User Per Day',
    desc: 'Hard daily cap per user. Prevents abuse and limits payout exposure.',
    unit: 'ads',
    step: '1',
    min: '1',
  },
  min_withdrawal: {
    label: 'Minimum Withdrawal (TON)',
    desc: 'Users must accumulate at least this much before they can withdraw.',
    unit: 'TON',
    step: '0.01',
    min: '0.01',
  },
  ad_cooldown_secs: {
    label: 'Cooldown Between Ads (seconds)',
    desc: 'Minimum seconds a user must wait between consecutive ad watches. 0 = no cooldown.',
    unit: 'sec',
    step: '1',
    min: '0',
  },
};

export default function AdminSettings() {
  const toast = useAdminToast();
  const [settings, setSettings] = useState({});
  const [changed, setChanged] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [twoFaData, setTwoFaData] = useState(null);
  
  const isSuperAdmin = import.meta.env.VITE_SUPER_ADMIN_ID && localStorage.getItem('tg_id') === import.meta.env.VITE_SUPER_ADMIN_ID;

  const handleSetup2FA = async () => {
    try {
      const res = await setup2FA();
      setTwoFaData(res.data);
      toast('2FA Generated Successfully. Please scan the QR code.', 'success');
    } catch (e) {
      toast('Failed to generate 2FA', 'error');
    }
  };

  const handleReset2FA = async () => {
    if (!window.confirm('Are you sure you want to remove 2FA for the admin account?')) return;
    try {
      await reset2FA();
      setTwoFaData(null);
      toast('2FA Removed Successfully', 'success');
    } catch (e) {
      toast('Failed to remove 2FA', 'error');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminSettings();
        const map = {};
        for (const { key, value } of res.data.settings) map[key] = value;
        setSettings(map);
      } catch {
        toast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }));
    setChanged(c => ({ ...c, [key]: val }));
  };

  const isDirty = Object.keys(changed).length > 0;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const payload = Object.entries({ ...settings, ...changed }).map(([key, value]) => ({ key, value }));
      await saveAdminSettings(payload);
      setChanged({});
      toast('Settings saved — changes take effect immediately', 'success');
    } catch (e) {
      toast(e?.response?.data?.error || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  if (loading) return (
    <div className="admin-loading">
      <span className="a-spinner" style={{ color: 'var(--accent)' }} /> Loading settings…
    </div>
  );

  // Derived display: net user reward + tracked platform margin
  const platformPct = parseFloat(settings.platform_cut_pct ?? 40);
  const rewardPerAd = parseFloat(settings.reward_per_ad ?? 0.01);
  const userShare = rewardPerAd.toFixed(5);
  const platformShare = (rewardPerAd * platformPct / 100).toFixed(5);
  const grossTotal = (rewardPerAd + (rewardPerAd * platformPct / 100)).toFixed(5);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            All values stored in the database and applied dynamically — no server restart needed
          </p>
        </div>
        <button
          className={`a-btn ${isDirty ? 'a-btn-primary' : 'a-btn-ghost'}`}
          onClick={() => setShowConfirm(true)}
          disabled={!isDirty || saving}
          style={{ minWidth: 130, padding: '10px 20px', fontSize: 14 }}
          id="save-settings-btn"
        >
          {saving ? <><span className="a-spinner" /> Saving…</> : isDirty ? '💾 Save Changes' : '✓ Saved'}
        </button>
      </div>

      {/* Revenue split preview */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid rgba(201,160,85,0.2)',
        borderRadius: 'var(--r-lg)',
        padding: '18px 22px',
        marginBottom: 20,
        display: 'flex',
        gap: 28,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 5 }}>
            Revenue Split Preview
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>User Net Reward (100%)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--success)', fontWeight: 700 }}>
                {userShare} TON
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Platform Margin ({platformPct}%)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--gold)', fontWeight: 700 }}>
                {platformShare} TON
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Est. Total Ad Value</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text-primary)', fontWeight: 700 }}>
                {grossTotal} TON
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings fields */}
      <div className="settings-card">
        <div className="settings-card-title">Platform Configuration</div>
        <div className="settings-grid">
          {Object.entries(SETTING_META).map(([key, meta]) => (
            <div className="settings-field" key={key}>
              <label className="settings-label" htmlFor={`setting-${key}`}>
                {meta.label}
                {changed[key] !== undefined && (
                  <span style={{ color: 'var(--warning)', marginLeft: 6, fontSize: 10 }}>● modified</span>
                )}
              </label>
              <div style={{ display: 'flex', gap: 0 }}>
                <input
                  id={`setting-${key}`}
                  type="number"
                  className="settings-input"
                  style={{ borderRadius: meta.unit ? '8px 0 0 8px' : 'var(--r-sm)' }}
                  value={settings[key] ?? ''}
                  onChange={e => update(key, e.target.value)}
                  step={meta.step}
                  min={meta.min}
                  max={meta.max}
                />
                {meta.unit && (
                  <span style={{
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    borderLeft: 'none',
                    borderRadius: '0 8px 8px 0',
                    padding: '10px 12px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                  }}>
                    {meta.unit}
                  </span>
                )}
              </div>
              <div className="settings-desc">{meta.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {isDirty && (
        <div style={{ background: 'rgba(212,148,58,0.08)', border: '1px solid rgba(212,148,58,0.25)', borderRadius: 'var(--r-md)', padding: '12px 16px', fontSize: 13, color: 'var(--warning)', marginTop: 4 }}>
          ⚠ You have unsaved changes. Click "Save Changes" to apply them.
        </div>
      )}

      {isSuperAdmin && (
        <div className="settings-card" style={{ marginTop: 24, borderColor: 'var(--accent-dim)' }}>
          <div className="settings-card-title" style={{ color: 'var(--accent)' }}>Super Admin: 2FA Settings</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 15 }}>
            Generate a Google Authenticator TOTP code for regular admin logins.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="a-btn a-btn-primary" onClick={handleSetup2FA}>Generate / Regenerate 2FA</button>
            <button className="a-btn" style={{ background: 'var(--error-sub)', color: 'var(--error)', border: '1px solid var(--error)' }} onClick={handleReset2FA}>Reset / Remove 2FA</button>
          </div>
          {twoFaData && (
            <div style={{ marginTop: 20, padding: 15, background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 15, fontWeight: 'bold' }}>Scan this QR Code with Google Authenticator:</div>
              <img src={twoFaData.qrDataUrl} alt="2FA QR Code" style={{ background: 'white', padding: 10, borderRadius: 8, marginBottom: 15 }} />
              
              <div style={{ fontWeight: 'bold', marginBottom: 5 }}>Or enter this code manually:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <code style={{ fontSize: 16, background: '#141414', padding: '8px 12px', border: '1px solid #242424', color: 'var(--accent)' }}>
                  {twoFaData.secret.match(/.{1,4}/g).join(' ')}
                </code>
                <button 
                  onClick={() => { navigator.clipboard.writeText(twoFaData.secret); toast('Copied to clipboard', 'success'); }}
                  style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer' }}
                >
                  Copy
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 15 }}>
                WARNING: This code will not be shown again. Please save it securely before leaving this page.
              </p>
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Save Settings"
          description={
            <>
              The following values will be updated immediately and applied to all new ad watches and withdrawals:
              <ul style={{ paddingLeft: 16, marginTop: 10, lineHeight: 1.8, fontSize: 13, color: 'var(--text-secondary)' }}>
                {Object.entries(changed).map(([k, v]) => (
                  <li key={k}><strong style={{ color: 'var(--text-primary)' }}>{SETTING_META[k]?.label ?? k}</strong>: {v} {SETTING_META[k]?.unit}</li>
                ))}
              </ul>
            </>
          }
          confirmLabel="💾 Save Changes"
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
