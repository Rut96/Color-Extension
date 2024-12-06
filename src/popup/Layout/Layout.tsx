import React, { useState, useEffect } from 'react';
import './Layout.css';
import sunIcon from "data-base64:../assets/sun.png"
import moonIcon from "data-base64:../assets/moon.png"

type ColorFormat = 'HEX' | 'RGB' | 'HSL';
type Theme = 'light' | 'dark';

export function Layout(): JSX.Element {
  const [color, setColor] = useState<string>('');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [format, setFormat] = useState<ColorFormat>('HEX');
  const [theme, setTheme] = useState<Theme>('light');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['recentColors', 'lastColor', 'theme'], (result) => {
      if (result.recentColors) setRecentColors(result.recentColors);
      if (result.lastColor) setColor(result.lastColor);
      if (result.theme) setTheme(result.theme as Theme);
    });
  }, []);

  // Save preferences
  useEffect(() => {
    chrome.storage.local.set({
      recentColors,
      lastColor: color,
      theme
    });
  }, [recentColors, color, theme]);

  // Handle theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(current => current === 'light' ? 'dark' : 'light');
  };

  async function handleColorPick() {
    if (!('EyeDropper' in window)) {
      alert('Your browser does not support the EyeDropper API');
      return;
    }

    try {
      // @ts-ignore - TypeScript doesn't recognize EyeDropper API yet
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const newColor = result.sRGBHex;

      setColor(newColor);
      setRecentColors(prev => {
        const updated = [newColor, ...prev.filter(c => c !== newColor)].slice(0, 12);
        return updated;
      });
    } catch (error) {
      console.error('Failed to pick color:', error);
    }
  };

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return { r, g, b };
  };

  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  function getFormattedColor() {
    if (!color) return '';

    const rgb = hexToRgb(color);
    if (!rgb) return color;

    switch (format) {
      case 'RGB':
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      case 'HSL': {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return `hsl(${hsl.h}°, ${hsl.s}%, ${hsl.l}%)`;
      }
      default:
        return color.toUpperCase();
    }
  };

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  function deleteColor(colorToDelete: string) {
    setRecentColors(prev => prev.filter(c => c !== colorToDelete));
    if (color === colorToDelete) {
      setColor('');
    }
  };

  function clearAllColors() {
    setRecentColors([]);
    setColor('');
  };

  return (
    <div className="layout">
      <div className="container">
        <div className="header-section">
          <div className="logo-container">
            <div className="logo">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                width="40"
                height="40"
              >
                <path
                  d="M20 50 L35 65 L45 30 L90 30"
                  fill="none"
                  stroke="#ffc86a"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M65 45 L65 70"
                  fill="none"
                  stroke="#ffc86a"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="logo-text">Color Root</span>
          </div>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
          >
            <img
              src={theme === 'light' ? sunIcon : moonIcon}
              alt={theme === 'light' ? "Light mode" : "Dark mode"}
              className="theme-icon"
            />
          </button>
        </div>

        <button onClick={handleColorPick} className="pick-button">
          Pick Color
        </button>

        {color && (
          <div className="color-display">
            <div className="preview-section">
              <div
                className="color-preview"
                style={{ backgroundColor: color }}
              />
              <div className="format-toggles">
                {(['HEX', 'RGB', 'HSL'] as ColorFormat[]).map((f) => (
                  <button
                    key={f}
                    className={`format-button ${format === f ? 'active' : ''}`}
                    onClick={() => setFormat(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="color-value"
              readOnly
              value={getFormattedColor()}
              onClick={(e) => {
                (e.target as HTMLInputElement).select();
                copyToClipboard(getFormattedColor());
              }}
            />
          </div>
        )}

        {recentColors.length > 0 && (
          <div className="recent-colors">
            <div className="label">
              <span className="recent-label">Recent Colors</span>
              <button className="clear-all" onClick={clearAllColors}>
                Clear All
              </button>
            </div>
            <div className="color-grid">
              {recentColors.map((recentColor, index) => (
                <div key={index} className="recent-color-wrapper">
                  <div
                    className="recent-color"
                    style={{ backgroundColor: recentColor }}
                    onClick={() => setColor(recentColor)}
                    title={recentColor}
                  />
                  <button
                    className="delete-color"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteColor(recentColor);
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showCopyFeedback && (
          <div className="copy-feedback visible">
            Copied! ✨
          </div>
        )}
      </div>
    </div>
  );
}
