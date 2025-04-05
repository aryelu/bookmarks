import { ThemeProvider } from "./components/ThemeProvider"
import { ThemeToggle } from "./components/ThemeToggle"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="bookmarks-theme">
      <div className="bg-background text-foreground min-h-screen">
        <header className="border-b border-border">
          <div className="app-container flex justify-between items-center">
            <h1 className="text-xl font-semibold">Bookmarks Manager</h1>
            <ThemeToggle />
          </div>
        </header>
        {/* ... rest of your app content ... */}
      </div>
    </ThemeProvider>
  )
}

export default App 