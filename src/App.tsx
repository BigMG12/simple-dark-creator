import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SparringProvider } from "@/contexts/SparringContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Record from "./pages/Record.tsx";
import RecordPrep from "./pages/RecordPrep.tsx";
import RecordLive from "./pages/RecordLive.tsx";
import Analyzing from "./pages/Analyzing.tsx";
import Results from "./pages/Results.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Welcome from "./pages/Welcome.tsx";
import ProgressPage from "./pages/Progress.tsx";
import Speakers from "./pages/Speakers.tsx";
import SpeakerDetail from "./pages/SpeakerDetail.tsx";
import SpeakerImport from "./pages/SpeakerImport.tsx";
import SpeakerImports from "./pages/SpeakerImports.tsx";
import Drills from "./pages/Drills.tsx";
import DrillDetail from "./pages/DrillDetail.tsx";
import Profile from "./pages/Profile.tsx";
import NotFound from "./pages/NotFound.tsx";
import ConversationsNew from "./pages/ConversationsNew.tsx";
import ConversationsLibrary from "./pages/ConversationsLibrary.tsx";
import ConversationDetail from "./pages/ConversationDetail.tsx";
import MyChannel from "./pages/MyChannel.tsx";
import MyChannelVideo from "./pages/MyChannelVideo.tsx";
import Records from "./pages/Records.tsx";
import Reviews from "./pages/Reviews.tsx";
import SparringHub from "./pages/sparring/SparringHub.tsx";
import SparringSetup from "./pages/sparring/SparringSetup.tsx";
import SparringRing from "./pages/sparring/SparringRing.tsx";
import SparringResult from "./pages/sparring/SparringResult.tsx";
import SparringHistory from "./pages/sparring/SparringHistory.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SparringProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />

              {/* Public-only routes: redirect authenticated users to /dashboard */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* Protected routes: redirect unauthenticated users to /auth */}
              <Route element={<ProtectedRoute />}>
                <Route path="/record" element={<Record />} />
                <Route path="/record/prep" element={<RecordPrep />} />
                <Route path="/record/live" element={<RecordLive />} />
                <Route path="/analyzing" element={<Analyzing />} />
                <Route path="/results/:id" element={<Results />} />
                <Route path="/results/live/:id" element={<Results />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/speakers" element={<Speakers />} />
                <Route path="/speakers/import" element={<SpeakerImport />} />
                <Route path="/speakers/imports" element={<SpeakerImports />} />
                <Route path="/speakers/:id" element={<SpeakerDetail />} />
                <Route path="/drills" element={<Drills />} />
                <Route path="/drills/:id" element={<DrillDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/conversations" element={<ConversationsLibrary />} />
                <Route path="/conversations/new" element={<ConversationsNew />} />
                <Route path="/conversations/:id" element={<ConversationDetail />} />
                <Route path="/my-channel" element={<MyChannel />} />
                <Route path="/my-channel/videos/:videoId" element={<MyChannelVideo />} />
                <Route path="/records" element={<Records />} />
                <Route path="/reviews" element={<Reviews />} />

                {/* Sparring Mode routes */}
                <Route path="/sparring" element={<SparringHub />} />
                <Route path="/sparring/setup" element={<SparringSetup />} />
                <Route path="/sparring/ring/:id" element={<SparringRing />} />
                <Route path="/sparring/result/:id" element={<SparringResult />} />
                <Route path="/sparring/history" element={<SparringHistory />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SparringProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
