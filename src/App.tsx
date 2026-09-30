import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { WatchlistProvider } from '@/context/WatchlistContext';
import { AlertProvider } from '@/context/AlertContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { RiskProfileProvider } from '@/context/RiskProfileContext';
import { HomePage } from '@/pages/HomePage';
import { MarketsPage } from '@/pages/MarketsPage';
import { StockDetailPage } from '@/pages/StockDetailPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { UpgradePage } from '@/pages/UpgradePage';
import { NewsArticlePage } from '@/pages/NewsArticlePage';
import { RiskProfilePage } from '@/pages/RiskProfilePage';

export default function App() {
  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <RiskProfileProvider>
          <WatchlistProvider>
            <AlertProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/markets" element={<MarketsPage />} />
                    <Route path="/markets/:symbol" element={<StockDetailPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/news/:id" element={<NewsArticlePage />} />
                    <Route path="/upgrade" element={<UpgradePage />} />
                    <Route path="/profile" element={<RiskProfilePage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AlertProvider>
          </WatchlistProvider>
        </RiskProfileProvider>
      </SubscriptionProvider>
    </LanguageProvider>
  );
}
