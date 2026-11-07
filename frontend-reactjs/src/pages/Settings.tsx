import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function SettingsPage() {
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/settings/`);
            setSettings(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load settings:", error);
            setLoading(false);
        }
    };

    const handleToggle = (key: string, currentValue: string) => {
        const newValue = currentValue.toLowerCase() === 'true' ? 'false' : 'true';
        updateLocalSetting(key, newValue);
    };

    const handleValueChange = (key: string, value: string) => {
        updateLocalSetting(key, value);
    };

    const updateLocalSetting = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            for (const setting of settings) {
                await axios.patch(`${API_BASE_URL}/settings/${setting.key}`, { value: setting.value });
            }
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setMessage('Error saving settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-xl text-center">Loading settings...</div>;
    }

    return (
        <div>
            <div className="flex-between" style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <div>
                    <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        Settings
                    </h1>
                    <p className="text-secondary">
                        System configuration and AI preferences
                    </p>
                </div>
                <button 
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-sm"
                    style={{
                        padding: 'var(--spacing-md) var(--spacing-xl)',
                        background: 'var(--accent-blue)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--border-radius-md)',
                        cursor: 'pointer',
                        opacity: saving ? 0.7 : 1,
                        fontWeight: 600
                    }}
                >
                    <Save size={20} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            
            {message && (
                <div className="glass-panel flex gap-sm items-center animate-fade-in" style={{ padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', borderLeft: '4px solid var(--accent-green)' }}>
                    <AlertCircle size={20} color="var(--accent-green)" />
                    <span>{message}</span>
                </div>
            )}

            <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
                <h2 className="text-xl font-semibold" style={{ marginBottom: 'var(--spacing-xl)' }}>AI Modules Configuration</h2>
                
                <div className="flex-col gap-lg">
                    {settings.map((setting) => (
                        <div key={setting.key} className="flex-between" style={{ paddingBottom: 'var(--spacing-lg)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <h3 className="font-semibold text-lg">{setting.key.replace('_', ' ').toUpperCase()}</h3>
                                <p className="text-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>{setting.description}</p>
                            </div>
                            
                            {setting.key === 'sensitivity' ? (
                                <div className="flex items-center gap-sm">
                                    <input 
                                        type="range" 
                                        min="0.1" max="0.9" step="0.1"
                                        value={setting.value}
                                        onChange={(e) => handleValueChange(setting.key, e.target.value)}
                                        style={{ accentColor: 'var(--accent-blue)' }}
                                    />
                                    <span className="font-bold" style={{ width: '40px', textAlign: 'right' }}>
                                        {setting.value}
                                    </span>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleToggle(setting.key, setting.value)}
                                    style={{
                                        width: '60px',
                                        height: '32px',
                                        borderRadius: '16px',
                                        background: setting.value.toLowerCase() === 'true' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        background: 'var(--toggle-thumb)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        position: 'absolute',
                                        top: '3px',
                                        left: setting.value.toLowerCase() === 'true' ? '30px' : '4px',
                                        transition: 'all 0.3s ease'
                                    }} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
