import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
      const response = await axios.get(`${API_URL}/remote-config/admin`, { headers: { Authorization: `Bearer demo-token` } });
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
      await axios.put(`${API_URL}/remote-config/admin`, config, { headers: { Authorization: `Bearer demo-token` } });
      alert('Configuration saved successfully and broadcasted instantly.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Configuration...</div>;
  if (!config) return <div className="p-8 text-center text-red-500">No configuration found.</div>;

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
      </div>
    </div>
  );
}
