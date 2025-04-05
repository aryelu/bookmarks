import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  // Function to cycle through themes
  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"]
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <button
      onClick={cycleTheme}
      className="btn btn-secondary relative w-10 h-10 flex items-center justify-center"
      title={`Current theme: ${theme}`}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0 dark:-rotate-90 system:scale-0 system:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 system:scale-0 system:rotate-90" />
      <Laptop className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all system:rotate-0 system:scale-100" />
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </button>
  )
} 