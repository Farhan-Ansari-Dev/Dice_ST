import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';

interface RemoteConfigData {
  featureFlags: {
    maintenance_mode: boolean;
    enable_ai_assistant: boolean;
    enable_ocr_scanning: boolean;
    enable_referral_rewards: boolean;
    enable_promotional_banners: boolean;
    enable_notifications: boolean;
  };
  dynamicConfig: {
    banner_text: string;
    banner_color: string;
    referral_reward_value: number;
    announcement_title: string;
    announcement_body: string;
  };
  aiSettings: {
    provider: string;
    model: string;
    apiKey: string;
  };
}

export default function RemoteConfigPage() {
  const [config, setConfig] = useState<RemoteConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      // remote-config is exposed under v2
      const response = await apiClient.get('/remote-config/admin', { 
        baseURL: apiClient.defaults.baseURL?.replace('/v1', '/v2') 
      });
      setConfig(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.put('/remote-config/admin', config, { 
        baseURL: apiClient.defaults.baseURL?.replace('/v1', '/v2') 
      });
      alert('Configuration saved successfully and broadcasted instantly.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Configuration...</div>;
  if (!config) return (
    <div className="p-8 text-center text-red-500">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <AlertCircle className="w-5 h-5" />
        <span>{error || 'No configuration found.'}</span>
      </div>
      <button onClick={() => { setLoading(true); setError(null); fetchConfig(); }} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer' }}>
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Remote Configuration</h1>
          <p className="text-gray-500">Instantly toggle features and update text across the mobile app without app store releases.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Flags */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            <span>Feature Flags</span>
          </h2>
          
          <div className="space-y-4">
            {Object.entries(config.featureFlags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="font-medium text-gray-900">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                  <div className="text-sm text-gray-500 font-mono text-xs mt-1">{key}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={value}
                    onChange={(e) => setConfig({
                      ...config,
                      featureFlags: { ...config.featureFlags, [key]: e.target.checked }
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-500" />
            <span>Dynamic Content</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Text</label>
              <input
                type="text"
                value={config.dynamicConfig.banner_text}
                onChange={(e) => setConfig({
                  ...config,
                  dynamicConfig: { ...config.dynamicConfig, banner_text: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner Color (Hex)</label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={config.dynamicConfig.banner_color}
                  onChange={(e) => setConfig({
                    ...config,
                    dynamicConfig: { ...config.dynamicConfig, banner_color: e.target.value }
                  })}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.dynamicConfig.banner_color}
                  onChange={(e) => setConfig({
                    ...config,
                    dynamicConfig: { ...config.dynamicConfig, banner_color: e.target.value }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Reward Value (₹)</label>
              <input
                type="number"
                value={config.dynamicConfig.referral_reward_value}
                onChange={(e) => setConfig({
                  ...config,
                  dynamicConfig: { ...config.dynamicConfig, referral_reward_value: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Title</label>
              <input
                type="text"
                value={config.dynamicConfig.announcement_title}
                onChange={(e) => setConfig({
                  ...config,
                  dynamicConfig: { ...config.dynamicConfig, announcement_title: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Body</label>
              <textarea
                value={config.dynamicConfig.announcement_body}
                onChange={(e) => setConfig({
                  ...config,
                  dynamicConfig: { ...config.dynamicConfig, announcement_body: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-green-500" />
            <span>AI Configuration</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={config.aiSettings?.provider || 'nvidia'}
                onChange={(e) => setConfig({
                  ...config,
                  aiSettings: { ...config.aiSettings, provider: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="nvidia">Nvidia NIM (Llama)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="copilot">GitHub Copilot</option>
                <option value="gemini">Google Gemini</option>
                <option value="kimo">Kimo</option>
                <option value="kiro">Kiro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <input
                type="text"
                placeholder="e.g. meta/llama-3.3-70b-instruct or gpt-4o"
                value={config.aiSettings?.model || ''}
                onChange={(e) => setConfig({
                  ...config,
                  aiSettings: { ...config.aiSettings, model: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                placeholder="Leave blank to use environment default"
                value={config.aiSettings?.apiKey || ''}
                onChange={(e) => setConfig({
                  ...config,
                  aiSettings: { ...config.aiSettings, apiKey: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            * Security Note: This API Key is NEVER sent to client devices. It remains strictly on the backend.
          </p>
        </div>
      </div>
    </div>
  );
}
