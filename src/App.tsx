
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider"
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();
import MaintenanceBanner from "@/components/layout/MaintenanceBanner";
import Navbar from "@/components/layout/Navbar";
import ScrollToTop from "@/components/layout/ScrollToTop";
import RouteProgress from "@/components/layout/RouteProgress";
import Footer from "@/components/layout/Footer";
import PageTransition from "@/components/layout/PageTransition";
import Index from "@/pages/Index";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import About from "@/pages/About";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Categories from "@/pages/Categories";
import Auth from "@/pages/Auth";
import OrderConfirmation from "@/pages/OrderConfirmation";
import OrderTracking from "@/pages/OrderTracking";
import Profile from "@/pages/Profile";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

// Add missing imports for the new pages
import ProductManager from "@/pages/ProductManager";
import HomepageManager from "@/pages/HomepageManager";
import ResetPassword from "@/pages/ResetPassword";
import BrandSettings from "@/pages/BrandSettings";
import CategoryManager from "@/pages/CategoryManager";
import Contact from "@/pages/Contact";
import Careers from "@/pages/Careers";
import AdminHub from "@/pages/AdminHub";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminApiLogs from "@/pages/AdminApiLogs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { FloatingAdminButton } from "@/components/admin/FloatingAdminButton";

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/products" element={<PageTransition><Products /></PageTransition>} />
        <Route path="/products/:id" element={<PageTransition><ProductDetail /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/careers" element={<PageTransition><Careers /></PageTransition>} />
        <Route path="/cart" element={<PageTransition><Cart /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition><Checkout /></PageTransition>} />
        <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/order-confirmation" element={<PageTransition><OrderConfirmation /></PageTransition>} />
        <Route path="/order-tracking" element={<PageTransition><OrderTracking /></PageTransition>} />
        <Route path="/orders" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><AdminLayout><Dashboard /></AdminLayout></PageTransition>} />
        
        {/* Admin routes */}
        <Route path="/admin" element={<PageTransition><AdminLayout><AdminHub /></AdminLayout></PageTransition>} />
        <Route path="/admin/coupons" element={<PageTransition><AdminLayout><AdminCoupons /></AdminLayout></PageTransition>} />
        <Route path="/admin/api-logs" element={<PageTransition><AdminLayout><AdminApiLogs /></AdminLayout></PageTransition>} />
        <Route path="/product-manager" element={<PageTransition><AdminLayout><ProductManager /></AdminLayout></PageTransition>} />
        <Route path="/homepage-manager" element={<PageTransition><AdminLayout><HomepageManager /></AdminLayout></PageTransition>} />
        <Route path="/brand-settings" element={<PageTransition><AdminLayout><BrandSettings /></AdminLayout></PageTransition>} />
        <Route path="/category-manager" element={<PageTransition><AdminLayout><CategoryManager /></AdminLayout></PageTransition>} />
        
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <CartProvider>
            <Router>
              <ScrollToTop />
              <RouteProgress />
              <div className="flex flex-col min-h-screen">
                <MaintenanceBanner />
                <Navbar />
                <main className="flex-grow flex flex-col">
                  <AnimatedRoutes />
                </main>
                <Footer />
                <FloatingAdminButton />
              </div>
            </Router>
          </CartProvider>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
