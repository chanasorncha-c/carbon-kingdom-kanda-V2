import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { TeacherDashboard } from './teacher/TeacherDashboard'

// No router dependency needed: a hash route works on any static host
// (GitHub Pages, a plain file server, a USB stick) without server-side
// rewrite rules.
//   #teacher            — the launcher: pick a mode and create a room.
//   #teacher/<CODE>      — a window dedicated to one specific existing room
//                          (every "create room" action opens one of these
//                          in a brand-new window automatically).
const hashPath = window.location.hash.replace(/^#\/?/, '')
const [hashRoute, hashRoomCode] = hashPath.split('/')
const isTeacher = hashRoute === 'teacher'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isTeacher ? <TeacherDashboard initialRoomCode={hashRoomCode || null} /> : <App />}</StrictMode>
)
