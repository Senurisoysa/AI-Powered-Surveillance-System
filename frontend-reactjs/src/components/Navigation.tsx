import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Video, Settings, Circle, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function Navigation() {
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const pathname = location.pathname;

    const navItems = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/live', label: 'Live Monitor', icon: Video },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <nav style={{
            width: '240px',
            height: '100vh',
            background: 'var(--nav-bg)',
            borderRight: `1px solid var(--border-color)`,
            padding: 'var(--spacing-lg)',
            position: 'fixed',
            left: 0,
            top: 0,
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <h1 className="text-xl font-bold" style={{ color: 'var(--accent-brown)' }}>
                    Surveillance System
                </h1>
                <p className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>
                    AI-Powered Monitoring
                </p>
            </div>

            <div style={{ flex: 1 }}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                padding: 'var(--spacing-md)',
                                marginBottom: 'var(--spacing-sm)',
                                borderRadius: 'var(--border-radius-md)',
                                background: isActive ? 'var(--bg-secondary)' : 'transparent',
                                borderLeft: isActive ? `3px solid var(--accent-brown)` : '3px solid transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                textDecoration: 'none',
                                transition: 'all 0.2s ease',
                                fontWeight: isActive ? 600 : 400,
                            }}
                            className={isActive ? '' : 'hover-nav'}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={toggleTheme}
                className="btn btn-secondary"
                style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginBottom: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                }}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>

            <div className="card" style={{
                padding: 'var(--spacing-md)',
                background: 'var(--bg-secondary)',
                border: `1px solid var(--border-color)`,
            }}>
                <div className="flex items-center gap-md">
                    <Circle size={8} fill="var(--accent-green)" color="var(--accent-green)" />
                    <span className="text-sm text-secondary">System Online</span>
                </div>
            </div>

        </nav>
    );
}
