import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AssistantPage from './pages/AssistantPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="library" element={<LibraryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
