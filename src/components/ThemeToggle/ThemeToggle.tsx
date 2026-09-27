"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <div className={styles.togglePlaceholder} />;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button 
      onClick={toggleTheme} 
      className={styles.toggleButton}
      aria-label={resolvedTheme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={resolvedTheme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      {resolvedTheme === "dark" ? (
        <Sun className={styles.icon} />
      ) : (
        <Moon className={styles.icon} />
      )}
      <span>{resolvedTheme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}</span>
    </button>
  );
}
