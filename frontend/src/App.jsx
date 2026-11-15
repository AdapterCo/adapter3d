import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import PublicCard from './pages/PublicCard';
import Register from './pages/Register';
import TagRedirect from './pages/TagRedirect';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/tag/:id" element={<TagRedirect />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/:slug" element={<PublicCard />} />
      </Routes>
    </Router>
  );
}

export default App;
