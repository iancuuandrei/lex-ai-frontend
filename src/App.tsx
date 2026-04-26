import { type ReactNode, Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import HomePage from './pages/HomePage'
import './App.css'

const ProductPage = lazy(() => import('./pages/ProductPage'))
const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const CanvasPage = lazy(() => import('./pages/CanvasPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      Se încarcă LexAI…
    </div>
  )
}

function SuspenseRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RouteFallback />}>
      {children}
    </Suspense>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="ask" element={<SuspenseRoute><AssistantPage /></SuspenseRoute>} />
        <Route path="assistant" element={<Navigate to="/ask" replace />} />
        <Route path="library" element={<SuspenseRoute><LibraryPage /></SuspenseRoute>} />
        <Route path="canvas" element={<SuspenseRoute><CanvasPage /></SuspenseRoute>} />
        <Route path="product" element={<SuspenseRoute><ProductPage /></SuspenseRoute>} />
        <Route path="explore" element={<SuspenseRoute><ProductPage /></SuspenseRoute>} />
        <Route path="graph" element={<Navigate to="/explore" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
