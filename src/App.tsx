import { Route, Routes } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import Home from "@/pages/Home";
import CreateDeal from "@/pages/CreateDeal";
import FindDeal from "@/pages/FindDeal";
import DealDetail from "@/pages/DealDetail";
import PayDeal from "@/pages/PayDeal";
import DealStatus from "@/pages/DealStatus";
import SellerDelivery from "@/pages/SellerDelivery";
import BuyerConfirm from "@/pages/BuyerConfirm";
import RaiseQuery from "@/pages/RaiseQuery";
import SubmitProof from "@/pages/SubmitProof";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminReview from "@/pages/AdminReview";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateDeal />} />
          <Route path="/find" element={<FindDeal />} />
          <Route path="/deal/:id" element={<DealDetail />} />
          <Route path="/deal/:id/pay" element={<PayDeal />} />
          <Route path="/deal/:id/status" element={<DealStatus />} />
          <Route path="/deal/:id/seller" element={<SellerDelivery />} />
          <Route path="/deal/:id/confirm" element={<BuyerConfirm />} />
          <Route path="/deal/:id/query" element={<RaiseQuery />} />
          <Route path="/deal/:id/proof" element={<SubmitProof />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/deal/:id" element={<AdminReview />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
