import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';
import PublicCard from './pages/PublicCard';
import Register from './pages/Register';
import TagRedirect from './pages/TagRedirect';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/tag/:id" element={<TagRedirect />} />
        <Route path="/:slug" element={<PublicCard />} />
      </Routes>
    </Router>
  );
}

export default App;
