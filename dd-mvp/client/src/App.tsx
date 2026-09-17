import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Investigation from "./pages/Investigation";
import ApiHub from "./pages/ApiHub";
import ApiHubUsage from "./pages/ApiHubUsage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/investigation/:id" element={<Investigation />} />
        <Route path="/api-hub" element={<ApiHub />} />
        <Route path="/api-hub/usage" element={<ApiHubUsage />} />
      </Routes>
    </Layout>
  );
}
