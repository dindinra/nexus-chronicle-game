import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import Login from './pages/Login'
import Menu from './pages/Menu'
import DeckBuilder from './pages/DeckBuilder'
import GameBoard from './pages/GameBoard'

function Nav() {
  return (
    <nav
      style={{
        padding: '10px 16px',
        borderBottom: '1px solid #333',
        display: 'flex',
        gap: 12,
      }}
    >
      <Link to="/login">Login</Link>
      <Link to="/menu">Menu</Link>
      <Link to="/deck-builder">Deck Builder</Link>
      <Link to="/game">Game Board</Link>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/deck-builder" element={<DeckBuilder />} />
          <Route path="/game" element={<GameBoard />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
