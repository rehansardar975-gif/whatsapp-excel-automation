import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ImportContacts from "./pages/ImportContacts";
import Contacts from "./pages/Contacts";
import Collection from "./pages/Collection";
import Messages from "./pages/Messages";
import Campaigns from "./pages/Campaigns";
import NewCampaign from "./pages/NewCampaign";
import CampaignDetail from "./pages/CampaignDetail";
import ActivityLog from "./pages/ActivityLog";
import Integration from "./pages/Integration";
import { EmptyState } from "./components/ui";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/import" element={<ImportContacts />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/collect" element={<Collection />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/new" element={<NewCampaign />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/activity" element={<ActivityLog />} />
        <Route path="/integration" element={<Integration />} />
        <Route path="*" element={<EmptyState title="Page not found" subtitle="Use the menu to continue." />} />
      </Routes>
    </Layout>
  );
}
