import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Contact from './pages/Contact'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/contact" element={<Contact />} />
        <Route path="/" element={<div className="p-8"><h1>Maisonnette v2</h1></div>} />
      </Routes>
    </Router>
  )
}
