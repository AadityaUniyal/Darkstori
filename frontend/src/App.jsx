import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion } from 'framer-motion';

// Pages
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Analytics from './pages/Analytics';
import Predictions from './pages/Predictions';
import Login from './pages/Login';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Styles
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <Navbar />
          <div className="app-container">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/live-map" element={<LiveMap />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/predictions" element={<Predictions />} />
                <Route path="/login" element={<Login />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
