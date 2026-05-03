import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Cars from './pages/Cars'
import CarDetail from './pages/CarDetail'
import Booking from './pages/Booking'
import BookingDetail from './pages/BookingDetail'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cars" element={<Cars />} />
      <Route path="/cars/:id" element={<CarDetail />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/booking/:id" element={<BookingDetail />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}