import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Contact from './pages/Contact'
import { GiteDetail } from './pages/GiteDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8"><h1>Maisonnette v2</h1></div>} />
        <Route path="/gite/:slug" element={<GiteDetail />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  )
}
