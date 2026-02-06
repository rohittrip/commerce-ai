import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import LLMConfig from '../pages/LLMConfig';
import Taxonomy from '../pages/Taxonomy';
import ToolTester from '../pages/ToolTester';
import Monitoring from '../pages/Monitoring';
import Users from '../pages/Users';
import Providers from '../pages/Providers';
import UcpTools from '../pages/UcpTools';
import Agents from '../pages/Agents';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="llm-config" element={<LLMConfig />} />
        <Route path="taxonomy" element={<Taxonomy />} />
        <Route path="providers" element={<Providers />} />
        <Route path="ucp-tools" element={<UcpTools />} />
        <Route path="agents" element={<Agents />} />
        <Route path="tools" element={<ToolTester />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}
