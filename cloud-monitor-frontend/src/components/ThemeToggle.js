// src/components/ThemeToggle.js
import React from "react";

export default function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-toggle">
      <label>
        <input
          type="checkbox"
          checked={theme === "dark"}
          onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
        />{" "}
        Dark
      </label>
    </div>
  );
}
